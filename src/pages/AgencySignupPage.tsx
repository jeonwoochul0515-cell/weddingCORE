// 사업자등록증 사진을 읽어 업체정보를 자동으로 채우고 가입을 완료하는 화면
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Camera, Loader2, ScanLine, Upload } from 'lucide-react';
import { db, storage, auth, functions } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import BrokerAutocomplete, { type BrokerHit } from '@/features/registry/BrokerAutocomplete';
import { usePageMeta } from '@/lib/usePageMeta';
import { josa } from '@/lib/korean';
import { signOut } from '@/lib/auth';

type FormValues = {
  businessNumber: string;
  /** 국제결혼중개업 등록번호 (법 제4조). 이 서비스를 쓰는 이유가 여기다 */
  registrationNumber: string;
  /** 국내결혼중개업 신고번호 (법 제3조). 같이 하는 업체만 적는다 */
  domesticRegistrationNumber: string;
  ownerName: string;
  phone: string;
  address: string;
};

type Extraction = {
  documentType: 'business_registration' | 'brokerage_registration' | 'other';
  companyName: string | null;
  businessNumber: string | null;
  ownerName: string | null;
  openedOn: string | null;
  address: string | null;
  businessType: string | null;
  businessItem: string | null;
  phone: string | null;
  registrationNumber: string | null;
  confidence: 'high' | 'medium' | 'low';
};

/** 판독 정확도를 유지하면서 전송량을 줄이도록 긴 변 1600px, JPEG 품질 0.85로 줄인다. */
async function toCompressedBase64(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지를 처리할 수 없습니다.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { mimeType: 'image/jpeg', dataBase64: dataUrl.split(',')[1] };
}

export default function AgencySignupPage() {
  usePageMeta({
    title: '업체 정보 등록',
    description: '사업자등록증으로 업체 정보를 등록하는 화면입니다.',
    path: '/signup/agency', noindex: true,
  });

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokerName, setBrokerName] = useState('');
  const [selectedBroker, setSelectedBroker] = useState<BrokerHit | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState<string[]>([]);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/agencies" replace />;
  if (user.role === 'lawyer') return <Navigate to="/lawyer/reviews" replace />;
  if (user.agencyId) return <Navigate to="/agency" replace />;

  function handleBrokerSelect(hit: BrokerHit) {
    setSelectedBroker(hit);
    setManualMode(false);
    // 대표자 이름 자동 채움 (공시 공개 정보)
    if (hit.rprsvNm) setValue('ownerName', hit.rprsvNm, { shouldValidate: true });
  }

  function applyExtraction(data: Extraction) {
    const filled: string[] = [];
    if (data.companyName) {
      setBrokerName(data.companyName);
      filled.push('상호');
    }
    if (data.businessNumber) {
      setValue('businessNumber', data.businessNumber, { shouldValidate: true });
      filled.push('사업자등록번호');
    }
    if (data.ownerName) {
      setValue('ownerName', data.ownerName, { shouldValidate: true });
      filled.push('대표자');
    }
    if (data.address) {
      setValue('address', data.address);
      filled.push('사업장 주소');
    }
    if (data.phone) {
      setValue('phone', data.phone, { shouldValidate: true });
      filled.push('연락처');
    }
    if (data.registrationNumber) {
      setValue('registrationNumber', data.registrationNumber, { shouldValidate: true });
      filled.push('결혼중개업 등록번호');
    }
    setAutoFilled(filled);

    if (data.documentType === 'other') {
      setScanNote('사업자등록증으로 보이지 않습니다. 사진을 다시 확인하거나 직접 입력해 주세요.');
    } else if (filled.length === 0) {
      setScanNote('글자를 읽지 못했습니다. 밝은 곳에서 문서 전체가 나오게 다시 촬영해 주세요.');
    } else if (data.confidence === 'low') {
      setScanNote(`${filled.length}개 항목을 채웠지만 인식이 불안정합니다. 값을 꼭 확인해 주세요.`);
    } else {
      setScanNote(`${filled.join(', ')}${josa(filled[filled.length - 1] ?? '', '을/를')} 자동으로 채웠습니다. 실제 문서와 같은지 확인해 주세요.`);
    }
  }

  async function handleFile(selected: File | null) {
    setFile(selected);
    setAutoFilled([]);
    setScanNote(null);
    setError(null);
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setScanNote('PDF는 자동 인식이 되지 않습니다. 아래 항목을 직접 입력해 주세요.');
      return;
    }

    setScanning(true);
    try {
      const payload = await toCompressedBase64(selected);
      const call = httpsCallable<typeof payload, Extraction>(functions, 'extractBusinessRegistration');
      const result = await call(payload);
      applyExtraction(result.data);
    } catch (err) {
      setScanNote(`자동 인식에 실패했습니다. 직접 입력해 주세요. (${(err as Error).message})`);
    } finally {
      setScanning(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!file) { setError('등록증 파일을 업로드해 주세요.'); return; }
    if (!auth.currentUser) return;

    const nameToUse = brokerName.trim();
    if (!nameToUse) { setError('업체명을 입력해 주세요.'); return; }
    if (!selectedBroker && !manualMode) {
      setError('공시 DB에서 업체를 선택하거나 "수동 입력으로 진행"을 눌러주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const uid = auth.currentUser.uid;
      const agencyId = `ag_${uid.slice(0, 12)}`;

      // 1) 등록증 업로드
      const certRef = ref(storage, `agencies/${agencyId}/registration/${file.name}`);
      await uploadBytes(certRef, file);
      const certUrl = await getDownloadURL(certRef);

      // 2) users 문서
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: auth.currentUser.email,
        displayName: values.ownerName,
        role: 'agency_owner',
        agencyId,
        lawyerId: null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      // 3) agencies 문서 (+ publicProfile 매칭된 경우에만)
      const publicProfile = selectedBroker
        ? {
            linkedAt: Timestamp.now(),
            entrpsNm: selectedBroker.entrpsNm,
            rprsvNm: selectedBroker.rprsvNm,
            region: selectedBroker.region,
            mrbrkRegYmd: selectedBroker.mrbrkRegYmd,
            operYn: selectedBroker.operYn,
            hasSanctions: selectedBroker.hasSanctions,
            location: selectedBroker.location,
            lastSyncAt: Timestamp.now(),
            discloseSanctions: false, // 기본 비공개 (단계 2 변호사 검수 후 UI 제공)
          }
        : null;

      await setDoc(doc(db, 'agencies', agencyId), {
        agencyId,
        businessNumber: values.businessNumber,
        registrationNumber: values.registrationNumber,
        // 국내와 국제를 나눠 적는다. 한 칸에 두면 어느 쪽 번호인지 알 수 없고,
        // 국내 신고만 하고 국제 중개를 하는 업체를 걸러낼 수도 없다.
        internationalRegistrationNumber: values.registrationNumber,
        domesticRegistrationNumber: values.domesticRegistrationNumber?.trim() || null,
        registrationType: values.domesticRegistrationNumber?.trim() ? 'both' : 'international',
        // ★ 공시는 국제결혼중개업체만 담는다. 거기서 골랐다는 것은 곳 국제 등록이
        //   있다는 뜻이다. 승인 때 다시 대조하지만 가입 시점에도 남겨 둔다.
        registryVerified: selectedBroker
          ? {
              source: '성평등가족부 결혼중개업 공시',
              entrpsNm: selectedBroker.entrpsNm,
              rprsvNm: selectedBroker.rprsvNm,
              region: selectedBroker.region,
              registeredOn: selectedBroker.mrbrkRegYmd,
              operating: selectedBroker.operYn,
              hasSanctions: selectedBroker.hasSanctions,
              checkedAt: serverTimestamp(),
            }
          : { source: '성평등가족부 결혼중개업 공시', found: false, checkedAt: serverTimestamp() },
        name: nameToUse,
        ownerUid: uid,
        ownerName: values.ownerName,
        phone: values.phone,
        address: values.address?.trim() || null,
        registrationCertUrl: certUrl,
        subscription: {
          plan: 'trial',
          status: 'active',
          startedAt: serverTimestamp(),
          renewsAt: serverTimestamp(),
        },
        verificationStatus: 'pending',
        verifiedAt: null,
        settings: {
          defaultPartnerLanguages: ['vi'],
          notificationChannels: ['email', 'fcm'],
        },
        ...(publicProfile ? { publicProfile } : {}),
        createdAt: serverTimestamp(),
      });

      // 4) members 서브문서
      //    email을 같이 적는다. 이게 없으면 직원 목록에 대표가 누구인지 안 나온다
      //    (초대로 들어온 직원은 claimStaffInvite가 적어 준다).
      await setDoc(doc(db, `agencies/${agencyId}/members/${uid}`), {
        uid,
        email: (auth.currentUser.email ?? '').trim().toLowerCase(),
        role: 'owner',
        invitedAt: serverTimestamp(),
        joinedAt: serverTimestamp(),
      });

      // 5) 자체 프로비저닝: 사용 권한만 부여하며 공시 인증은 별도 검증
      await httpsCallable(functions, 'selfProvisionAgency')({ agencyId });

      // 6) 토큰 강제 리프레시 후 store 업데이트
      const token = await auth.currentUser.getIdTokenResult(true);
      setUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        agencyId: (token.claims.agencyId as string | undefined) ?? null,
        role: (token.claims.role as string | undefined) ?? null,
        emailVerified: auth.currentUser.emailVerified,
      });

      navigate('/agency');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">업체 정보 등록</h1>
        <p className="mb-4 text-sm text-slate-600">
          사업자등록증을 촬영하면 상호·등록번호·대표자를 자동으로 읽어 입력란을 채웁니다.
          채워진 값은 실제 문서와 같은지 확인한 뒤 제출해 주세요.
        </p>

        {/* 여기까지 왔다는 것은 계정은 만들어졌으나 업체 등록이 안 끝났다는 뜻이다.
            빠져나갈 길이 없으면 로그인 화면으로도 못 가고 이 화면만 반복해서 보게 된다.
            (2026-09-01에 실제로 그렇게 갇힌 계정이 나왔다) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span>
            계정은 만들어졌습니다. 이 단계를 마쳐야 서비스를 쓸 수 있습니다.
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="shrink-0 font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
          >
            다른 계정으로 로그인
          </button>
        </div>

        <div className="mb-6 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <ScanLine size={17} />1단계 · 사업자등록증 올리기
          </div>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            휴대폰이면 촬영, 컴퓨터면 파일 선택을 누르세요. 사진은 JPG·PNG만 자동 인식됩니다.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
              <Camera size={16} />사업자등록증 촬영
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload size={16} />파일 선택 (PDF 가능)
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {file && (
            <p className="mt-3 truncate text-xs text-emerald-900">선택한 파일: {file.name}</p>
          )}
          {scanning && (
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-800">
              <Loader2 size={14} className="animate-spin" />사업자등록증을 읽는 중입니다.
            </p>
          )}
          {!scanning && scanNote && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-700 ring-1 ring-emerald-200">
              {scanNote}
            </p>
          )}
        </div>

        <div className="mb-4 text-sm font-semibold text-slate-800">2단계 · 내용 확인</div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              상호(업체명)
              {selectedBroker && (
                <span
                  className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-normal text-emerald-700"
                  title="성평등가족부 공시는 국제결혼중개업 등록 업체만 담습니다"
                >
                  국제 등록 확인됨
                </span>
              )}
              {autoFilled.includes('상호') && !selectedBroker && <AutoBadge />}
            </label>
            <BrokerAutocomplete
              value={brokerName}
              onChange={(v) => {
                setBrokerName(v);
                if (selectedBroker && v !== selectedBroker.entrpsNm) {
                  setSelectedBroker(null);
                }
              }}
              onSelect={handleBrokerSelect}
              selected={selectedBroker}
              placeholder="업체명 2자 이상 입력 (예: 태양, 사이공, …)"
            />
            {!selectedBroker && !manualMode && brokerName.trim().length >= 2 && (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="mt-2 text-xs text-slate-500 underline hover:text-slate-700"
              >
                공시에 아직 등록되지 않은 신규 업체입니다 → 수동 입력으로 진행
              </button>
            )}
            {manualMode && (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                <p className="font-bold">공시에서 찾지 못한 채로 가입합니다.</p>
                <p className="mt-1">
                  이 공시에는 <strong>국제결혼중개업 등록 업체만</strong> 올라 있습니다. 방금 등록하셔
                  아직 반영이 안 됐을 수도 있고, 국내 신고만 되어 있을 수도 있습니다.
                </p>
                <p className="mt-1">
                  국제결혼중개는 <strong>등록</strong>(법 제4조)이 따로 필요하고, 등록 없이 하면
                  5년 이하 징역 또는 5천만원 이하 벌금입니다. 가입은 그대로 진행되지만,
                  인증 단계에서 등록증을 확인합니다.
                </p>
              </div>
            )}
          </div>

          <Field label="대표자 이름" error={errors.ownerName?.message} auto={autoFilled.includes('대표자')}>
            <input
              className="input"
              {...register('ownerName', { required: '필수 입력입니다.' })}
            />
          </Field>
          <Field label="사업자등록번호 (10자리)" error={errors.businessNumber?.message} auto={autoFilled.includes('사업자등록번호')}>
            <input
              className="input"
              placeholder="000-00-00000"
              {...register('businessNumber', {
                required: '필수 입력입니다.',
                pattern: { value: /^\d{3}-?\d{2}-?\d{5}$/, message: '형식이 올바르지 않습니다.' },
              })}
            />
          </Field>
          <Field
            label="국제결혼중개업 등록번호"
            error={errors.registrationNumber?.message}
            auto={autoFilled.includes('결혼중개업 등록번호')}
          >
            <input
              className="input"
              placeholder="예) 부산-연제-국제-26-0001호"
              {...register('registrationNumber', { required: '필수 입력입니다.' })}
            />
            <p className="mt-1 text-xs text-slate-400">
              등록증 제목이 「<strong>국제</strong>결혼중개업 등록증」인 것을 보고 적어 주세요.
              「국내결혼중개업 신고필증」은 아래 칸입니다 — 둘은 서로 다른 절차입니다.
            </p>
          </Field>
          <Field
            label="국내결혼중개업 신고번호 (같이 하시면)"
            error={errors.domesticRegistrationNumber?.message}
          >
            <input
              className="input"
              placeholder="예) 부산-연제-국내-26-0001호"
              {...register('domesticRegistrationNumber')}
            />
            <p className="mt-1 text-xs text-slate-400">
              국내 중개도 하시면 적어 주세요. 안 하시면 비워 두셔도 됩니다.
            </p>
          </Field>
          <Field label="연락처 · 휴대폰 (필수)" error={errors.phone?.message} auto={autoFilled.includes('연락처')}>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="010-0000-0000"
              {...register('phone', {
                required: '연락처는 반드시 입력해야 합니다.',
                // 이 번호로 홈페이지 접수 문자가 간다. 유선번호를 받으면 문자가 조용히 사라진다.
                pattern: {
                  value: /^01[016789]-?\d{3,4}-?\d{4}$/,
                  message: '휴대폰 번호(010-0000-0000)로 적어 주세요. 사무실 유선번호는 접수 문자를 받지 못합니다.',
                },
              })}
            />
            <p className="mt-1 text-xs text-slate-400">
              홈페이지 점검 위젯으로 손님이 접수하면 이 번호로 문자가 옵니다. 등록증의 사무실 번호가 자동으로 들어왔다면 휴대폰 번호로 바꿔 주세요.
            </p>
          </Field>
          <Field label="사업장 주소" error={errors.address?.message} auto={autoFilled.includes('사업장 주소')}>
            <input className="input" placeholder="시·군·구까지 포함" {...register('address')} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || scanning}
            className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? '제출 중…' : '등록 요청'}
          </button>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: rgb(15 23 42);
        }
      `}</style>
    </div>
  );
}

function AutoBadge() {
  return (
    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-normal text-emerald-700">
      자동 인식
    </span>
  );
}

function Field({
  label,
  error,
  auto,
  children,
}: {
  label: string;
  error?: string;
  auto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {auto && <AutoBadge />}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
