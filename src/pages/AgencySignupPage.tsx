import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage, auth, app } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

type FormValues = {
  businessNumber: string;
  registrationNumber: string;
  name: string;
  ownerName: string;
  phone: string;
};

export default function AgencySignupPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  if (!user) return <Navigate to="/login" replace />;
  if (user.agencyId) return <Navigate to="/agency" replace />;

  async function onSubmit(values: FormValues) {
    if (!file) { setError('등록증 파일을 업로드해 주세요.'); return; }
    if (!auth.currentUser) return;

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

      // 3) agencies 문서
      await setDoc(doc(db, 'agencies', agencyId), {
        agencyId,
        businessNumber: values.businessNumber,
        registrationNumber: values.registrationNumber,
        name: values.name,
        ownerUid: uid,
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
        createdAt: serverTimestamp(),
      });

      // 4) members 서브문서
      await setDoc(doc(db, `agencies/${agencyId}/members/${uid}`), {
        uid,
        role: 'owner',
        invitedAt: serverTimestamp(),
        joinedAt: serverTimestamp(),
      });

      // 5) 자체 프로비저닝: verified + Custom Claims 즉시 주입
      const functions = getFunctions(app, 'asia-northeast3');
      await httpsCallable(functions, 'selfProvisionAgency')({ agencyId });

      // 6) 토큰 강제 리프레시 후 store 업데이트
      const token = await auth.currentUser.getIdTokenResult(true);
      setUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        agencyId: (token.claims.agencyId as string | undefined) ?? null,
        role: (token.claims.role as string | undefined) ?? null,
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
        <p className="mb-6 text-sm text-slate-600">
          결혼중개업 등록 정보와 등록증을 제출해 주세요. 관리자 확인 후 승인됩니다.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="상호(업체명)" error={errors.name?.message}>
            <input
              className="input"
              {...register('name', { required: '필수 입력입니다.' })}
            />
          </Field>
          <Field label="대표자 이름" error={errors.ownerName?.message}>
            <input
              className="input"
              {...register('ownerName', { required: '필수 입력입니다.' })}
            />
          </Field>
          <Field label="사업자등록번호 (10자리)" error={errors.businessNumber?.message}>
            <input
              className="input"
              placeholder="000-00-00000"
              {...register('businessNumber', {
                required: '필수 입력입니다.',
                pattern: { value: /^\d{3}-?\d{2}-?\d{5}$/, message: '형식이 올바르지 않습니다.' },
              })}
            />
          </Field>
          <Field label="결혼중개업 등록번호" error={errors.registrationNumber?.message}>
            <input
              className="input"
              {...register('registrationNumber', { required: '필수 입력입니다.' })}
            />
          </Field>
          <Field label="연락처" error={errors.phone?.message}>
            <input
              className="input"
              placeholder="010-0000-0000"
              {...register('phone', { required: '필수 입력입니다.' })}
            />
          </Field>
          <Field label="결혼중개업 등록증 (PDF 또는 이미지)">
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
