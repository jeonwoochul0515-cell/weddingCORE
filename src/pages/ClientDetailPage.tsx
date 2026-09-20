// 고객 상세 — 기본정보·접수 기록·법정의무 타임라인·서류·매칭을 한 화면에 모은다
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Archive, ArrowLeft, Bot, FileSignature, Languages, Heart, MessageSquareText, Pencil, Plus, RotateCcw } from 'lucide-react';
import { setClientStatus, useClient, type ClientListItem } from '@/features/agency/useAgencyClients';
import CreateClientDialog, { type CreateClientFormValues } from '@/features/agency/CreateClientDialog';
import DocumentSection from '@/features/documents/DocumentSection';
import ConsistencyCard from '@/features/documents/ConsistencyCard';
import StageGuideCard from '@/features/precedents/StageGuideCard';
import { useClientDocuments } from '@/features/documents/useClientDocuments';
import TimelineView from '@/features/timeline/TimelineView';
import ProfileForm from '@/features/matching/ProfileForm';
import MbtiCard from '@/features/matching/MbtiCard';
import SajuCard from '@/features/matching/SajuCard';
import MatchHistory from '@/features/matching/MatchHistory';
import CreateMatchDialog from '@/features/matching/CreateMatchDialog';
import { useProfileUpdater } from '@/features/matching/useClientProfile';
import { getMbtiCompat } from '@/features/matching/mbtiCompat';
import { getSajuCompat } from '@/features/matching/sajuCompat';
import type { Client, ClientProfile, BirthInfo } from '@/types/schema';
import LeadReport from '@/features/leads/LeadReport';
import { LEAD_SOURCE_LABEL } from '@/features/leads/useAgencyLeads';
import { useAuthStore } from '@/store/authStore';
import ActivitySection from '@/features/activities/ActivitySection';
import ContractDraft from '@/features/contract/ContractDraft';

const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

/**
 * 혼인이력을 우리말로 바꾼다. 저장값은 등록 폼이 쓰는 none/divorced/widowed 인데
 * 그대로 내보내면 화면에 "divorced" 가 뜬다. 읽는 사람이 쓰는 말로 보여준다.
 * 모르는 값이면 원래 값을 그대로 두어 정보가 사라지지 않게 한다.
 */
const MARITAL_LABEL: Record<string, string> = {
  none: '미혼',
  single: '미혼',
  divorced: '이혼',
  widowed: '사별',
};
const maritalLabel = (value: string) => MARITAL_LABEL[value] ?? value;

const CLOSED_LABEL: Record<Client['status'], string> = {
  active: '진행 중',
  completed: '완료',
  cancelled: '취소',
};

/** 저장된 값을 수정 창의 입력값으로 바꾼다 */
function toFormValues(client: ClientListItem): CreateClientFormValues {
  const k = client.koreanClient;
  const birth = k.birthDate?.toDate ? k.birthDate.toDate() : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    name: k.name,
    birthDate: birth ? `${birth.getFullYear()}-${pad(birth.getMonth() + 1)}-${pad(birth.getDate())}` : '',
    gender: k.gender,
    phone: k.phone,
    address: k.address,
    incomeAnnual: k.incomeAnnual == null ? '' : String(k.incomeAnnual),
    occupation: k.occupation,
    maritalHistory: k.maritalHistory,
  };
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const { client, loading, error } = useClient(clientId);
  const { items: documents } = useClientDocuments(clientId);
  const { updateClient } = useProfileUpdater();
  const [tab, setTab] = useState<'compliance' | 'matching' | 'activities'>('compliance');
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeStatus, setCloseStatus] = useState<'completed' | 'cancelled'>('completed');
  const [closeReason, setCloseReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    );
  }
  if (!client) return <p className="text-sm text-slate-500">고객을 찾을 수 없습니다.</p>;

  const k = client.koreanClient;
  const profile = client.profile ?? null;
  const birthInfo = client.birthInfo ?? null;
  const isClosed = client.status !== 'active';
  // 신상정보를 맞선 전에 갖췄는지 대조하려면 맞선 예정일이 필요하다
  const meetingAnchor = client.anchors?.meeting_scheduled ?? null;
  const meetingAt =
    meetingAnchor && typeof (meetingAnchor as { toDate?: () => Date }).toDate === 'function'
      ? (meetingAnchor as { toDate: () => Date }).toDate()
      : null;

  // 임시: 파트너 프로필 (실제로는 파트너 서브컬렉션에서 가져와야 함)
  // Phase 1.5에서는 한국측 프로필 기반으로 MBTI/사주 확인 UI를 제공
  const partnerMbti = null as ClientProfile['mbti'];
  const partnerDate = null as string | null;

  async function handleSaveProfile(p: ClientProfile, b: BirthInfo) {
    await updateClient(client!.id, p, b);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  function flash(text: string) {
    setSavedNotice(text);
    setTimeout(() => setSavedNotice(null), 2500);
  }

  async function changeStatus(status: Client['status'], reason?: string) {
    if (!agencyId || !client) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await setClientStatus(agencyId, client.id, status, reason);
      setClosing(false);
      setCloseReason('');
      flash(status === 'active' ? '다시 진행 중으로 돌렸습니다.' : `${CLOSED_LABEL[status]}로 정리했습니다. 목록에서는 「종료된 고객」에서 볼 수 있습니다.`);
    } catch (err) {
      setStatusError(`처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(err as Error).message})`);
    } finally {
      setStatusBusy(false);
    }
  }

  // 궁합 점수 계산 (매칭 기록용)
  const mbtiScore = profile?.mbti && partnerMbti
    ? getMbtiCompat(profile.mbti, partnerMbti).score
    : null;
  const sajuScore = birthInfo?.solarDate && partnerDate
    ? getSajuCompat(birthInfo.solarDate, partnerDate).score
    : null;

  return (
    <div>
      <Link to="/agency/clients" className="mb-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-emerald-700">
        <ArrowLeft size={14} />고객 목록으로
      </Link>

      {savedNotice && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{savedNotice}</div>
      )}

      {isClosed && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <div>
            <span className="font-semibold">{CLOSED_LABEL[client.status]}로 정리된 고객입니다.</span>
            {client.closedAt?.toDate && <span className="ml-2 text-xs text-slate-500">{client.closedAt.toDate().toLocaleDateString('ko-KR')}</span>}
            {client.closeReason && <span className="ml-2 text-xs text-slate-500">· {client.closeReason}</span>}
          </div>
          <button type="button" disabled={statusBusy} onClick={() => changeStatus('active')} className="secondary-button !py-1.5 text-xs">
            <RotateCcw size={13} />다시 진행 중으로
          </button>
        </div>
      )}

      <div className="app-surface mb-6 rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            {/* 사진이 있으면 이름 옆에 둔다. 전화를 걸기 전에 얼굴을 먼저 보는 편이 낫다. */}
            {client.photoUrl && (
              <img src={client.photoUrl} alt="" className="h-32 w-24 shrink-0 rounded-xl border border-slate-200 object-cover" />
            )}
            <div>
            <div className="eyebrow">고객 정보</div><h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900">{k.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {k.gender === 'M' ? '남' : '여'} · {k.occupation}
              {profile?.mbti && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{profile.mbti}</span>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">연락처</dt><dd><a href={`tel:${k.phone.replace(/\D/g, '')}`} className="text-emerald-700 underline underline-offset-2">{k.phone}</a></dd>
              <dt className="text-slate-500">주소</dt><dd>{k.address}</dd>
              <dt className="text-slate-500">연소득</dt><dd>{k.incomeAnnual == null ? <span className="text-slate-400">아직 확인 전</span> : `${k.incomeAnnual.toLocaleString()}원`}</dd>
              <dt className="text-slate-500">혼인이력</dt><dd>{maritalLabel(k.maritalHistory)}</dd>
              {profile?.education && <><dt className="text-slate-500">학력</dt><dd>{profile.education}</dd></>}
              {profile?.religion && <><dt className="text-slate-500">종교</dt><dd>{profile.religion}</dd></>}
            </dl>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="sm:text-right">
              <div className="text-xs text-slate-500">현재 단계</div>
              <div className="text-sm font-medium text-slate-900">{STAGE_LABEL[client.currentStage]}</div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={14} />정보 수정
              </button>
              {/* 서면계약은 법 제10조 의무다. 알려 주면서 만들어 주지 않으면 반쪽이다. */}
              <button
                type="button"
                onClick={() => setShowContract(true)}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <FileSignature size={14} />계약서 초안
              </button>
              <Link
                to={`/agency/clients/${client.id}/background-info`}
                className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
              >
                <Languages size={14} />신상정보 교환
              </Link>
              <Link
                to={`/agency/automation?clientId=${client.id}`}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Bot size={14} />AI 문서 자동화
              </Link>
              {!isClosed && !closing && (
                <button
                  type="button"
                  onClick={() => setClosing(true)}
                  className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  <Archive size={14} />종료 처리
                </button>
              )}
            </div>
          </div>
        </div>

        {closing && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">이 고객을 종료 처리합니다</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">기록은 지워지지 않고 「종료된 고객」 목록으로 옮겨집니다. 언제든 다시 진행 중으로 돌릴 수 있습니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${closeStatus === 'completed' ? 'border-emerald-400 bg-white' : 'border-slate-200 bg-white/60'}`}>
                <input type="radio" name="closeStatus" checked={closeStatus === 'completed'} onChange={() => setCloseStatus('completed')} className="accent-emerald-600" />
                완료 <span className="text-xs text-slate-500">혼인·비자까지 끝남</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${closeStatus === 'cancelled' ? 'border-emerald-400 bg-white' : 'border-slate-200 bg-white/60'}`}>
                <input type="radio" name="closeStatus" checked={closeStatus === 'cancelled'} onChange={() => setCloseStatus('cancelled')} className="accent-emerald-600" />
                취소 <span className="text-xs text-slate-500">계약 해지·중단</span>
              </label>
            </div>
            <input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="field-control mt-3"
              placeholder="사유 (선택) — 예: 환불 후 계약 해지, 비자 발급 완료"
              maxLength={200}
            />
            {statusError && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{statusError}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={statusBusy} onClick={() => changeStatus(closeStatus, closeReason)} className="primary-button !py-2">
                {statusBusy ? '처리 중…' : `${CLOSED_LABEL[closeStatus]}로 정리`}
              </button>
              <button type="button" onClick={() => { setClosing(false); setStatusError(null); }} className="secondary-button !py-2">취소</button>
            </div>
          </div>
        )}
      </div>

      {/* 접수에서 온 고객이면 점검 결과를 보고서로 둔다. 같은 질문을 두 번 하지 않기 위해서다 */}
      {client.intake && (
        <details className="app-surface mb-6 rounded-[26px] p-5 sm:p-6" open>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            접수에서 온 손님 · {LEAD_SOURCE_LABEL[client.intake.source] ?? client.intake.source}
            {client.intake.receivedAt?.toDate && <span className="ml-2 text-xs font-normal text-slate-500">{client.intake.receivedAt.toDate().toLocaleDateString('ko-KR')} 접수</span>}
          </summary>
          <div className="mt-4">
            <LeadReport summary={client.intake.summary} level={client.intake.level} source={client.intake.source} receivedAt={client.intake.receivedAt} compact />
          </div>
        </details>
      )}

      {/* 탭 */}
      <div className="mb-5 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => setTab('compliance')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'compliance' ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          법정의무·서류
        </button>
        <button
          onClick={() => setTab('matching')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'matching' ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Heart size={14} className="mr-1 inline text-rose-500" />
          매칭
        </button>
        <button
          onClick={() => setTab('activities')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'activities' ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <MessageSquareText size={14} className="mr-1 inline" />
          상담·연락
        </button>
      </div>

      {tab === 'compliance' && (
        <>
        {/* 목록보다 먼저 "지금 위험한 게 있는가"를 보여준다 */}
        <ConsistencyCard documents={documents} meetingAt={meetingAt} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">법정의무 기한</h2>
            <TimelineView clientId={client.id} anchors={client.anchors} />
          </div>
          <div className="space-y-6">
            <DocumentSection clientId={client.id} />
            <StageGuideCard stage={client.currentStage} />
          </div>
        </div>
        </>
      )}

      {tab === 'matching' && (
        <div className="space-y-6">
          {/* 프로필 입력 */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            {profileSaved && (
              <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">프로필이 저장되었습니다.</div>
            )}
            <ProfileForm
              initial={{ profile, birthInfo }}
              onSave={handleSaveProfile}
              label={k.name}
            />
          </div>

          {/* 궁합 카드 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MbtiCard
              mbtiA={profile?.mbti ?? null}
              mbtiB={partnerMbti}
              nameA={k.name}
              nameB="(파트너)"
            />
            <SajuCard
              dateA={birthInfo?.solarDate ?? null}
              dateB={partnerDate}
              nameA={k.name}
              nameB="(파트너)"
            />
          </div>

          {/* 매칭 히스토리 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">매칭 기록</h2>
              <button
                onClick={() => setShowMatchDialog(true)}
                className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
              >
                <Plus size={14} />매칭 추가
              </button>
            </div>
            <MatchHistory clientId={client.id} />
          </div>

          {showMatchDialog && (
            <CreateMatchDialog
              clientId={client.id}
              partnerId=""
              defaultClientName={k.name}
              mbtiScore={mbtiScore}
              sajuScore={sajuScore}
              onClose={() => setShowMatchDialog(false)}
              onCreated={() => setShowMatchDialog(false)}
            />
          )}
        </div>
      )}

      {tab === 'activities' && <ActivitySection clientId={client.id} />}

      {showContract && <ContractDraft client={client} onClose={() => setShowContract(false)} />}

      {showEdit && (
        <CreateClientDialog
          editingClientId={client.id}
          initial={toFormValues(client)}
          initialPhotoUrl={client.photoUrl ?? null}
          onClose={() => setShowEdit(false)}
          onCreated={() => { setShowEdit(false); flash('고객 정보를 저장했습니다.'); }}
        />
      )}
    </div>
  );
}
