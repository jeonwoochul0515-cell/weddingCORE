import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Languages, Heart, Plus } from 'lucide-react';
import { useClient } from '@/features/agency/useAgencyClients';
import DocumentSection from '@/features/documents/DocumentSection';
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

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const { client, loading } = useClient(clientId);
  const { updateClient } = useProfileUpdater();
  const [tab, setTab] = useState<'compliance' | 'matching'>('compliance');
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (!client) return <p className="text-sm text-slate-500">고객을 찾을 수 없습니다.</p>;

  const k = client.koreanClient;
  const profile = client.profile ?? null;
  const birthInfo = client.birthInfo ?? null;

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
      <Link to="/agency/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} />고객 목록으로
      </Link>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{k.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {k.gender === 'M' ? '남' : '여'} · {k.occupation}
              {profile?.mbti && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{profile.mbti}</span>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">연락처</dt><dd>{k.phone}</dd>
              <dt className="text-slate-500">주소</dt><dd>{k.address}</dd>
              <dt className="text-slate-500">연소득</dt><dd>{k.incomeAnnual.toLocaleString()}원</dd>
              <dt className="text-slate-500">혼인이력</dt><dd>{k.maritalHistory}</dd>
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
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setTab('compliance')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'compliance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          컴플라이언스
        </button>
        <button
          onClick={() => setTab('matching')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'matching' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Heart size={14} className="mr-1 inline text-rose-500" />
          매칭
        </button>
      </div>

      {tab === 'compliance' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">컴플라이언스 타임라인</h2>
            <TimelineView clientId={client.id} />
          </div>
          <div>
            <DocumentSection clientId={client.id} />
          </div>
        </div>
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
