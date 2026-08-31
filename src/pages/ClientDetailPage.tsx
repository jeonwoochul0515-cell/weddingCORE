import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bot, Languages, Heart, Plus } from 'lucide-react';
import { useClient } from '@/features/agency/useAgencyClients';
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
import type { ClientProfile, BirthInfo } from '@/types/schema';

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

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const { client, loading } = useClient(clientId);
  const { items: documents } = useClientDocuments(clientId);
  const { updateClient } = useProfileUpdater();
  const [tab, setTab] = useState<'compliance' | 'matching'>('compliance');
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (!client) return <p className="text-sm text-slate-500">고객을 찾을 수 없습니다.</p>;

  const k = client.koreanClient;
  const profile = client.profile ?? null;
  const birthInfo = client.birthInfo ?? null;
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

      <div className="app-surface mb-6 rounded-[26px] p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Client profile</div><h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900">{k.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {k.gender === 'M' ? '남' : '여'} · {k.occupation}
              {profile?.mbti && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{profile.mbti}</span>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">연락처</dt><dd>{k.phone}</dd>
              <dt className="text-slate-500">주소</dt><dd>{k.address}</dd>
              <dt className="text-slate-500">연소득</dt><dd>{k.incomeAnnual.toLocaleString()}원</dd>
              <dt className="text-slate-500">혼인이력</dt><dd>{maritalLabel(k.maritalHistory)}</dd>
              {profile?.education && <><dt className="text-slate-500">학력</dt><dd>{profile.education}</dd></>}
              {profile?.religion && <><dt className="text-slate-500">종교</dt><dd>{profile.religion}</dd></>}
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-xs text-slate-500">현재 단계</div>
              <div className="text-sm font-medium text-slate-900">{STAGE_LABEL[client.currentStage]}</div>
            </div>
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
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-5 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => setTab('compliance')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'compliance' ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          컴플라이언스
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
      </div>

      {tab === 'compliance' && (
        <>
        {/* 목록보다 먼저 "지금 위험한 게 있는가"를 보여준다 */}
        <ConsistencyCard documents={documents} meetingAt={meetingAt} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">컴플라이언스 타임라인</h2>
            <TimelineView clientId={client.id} />
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
    </div>
  );
}
