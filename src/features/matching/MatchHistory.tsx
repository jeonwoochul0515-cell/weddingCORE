import { format } from 'date-fns';
import { useMatches, updateMatchResult, type MatchListItem } from './useMatches';
import { useAuthStore } from '@/store/authStore';
import type { MatchResult } from '@/types/schema';

type Props = { clientId?: string };

const TYPE_BADGE: Record<string, string> = {
  '맞선': 'bg-blue-50 text-blue-700',
  '프로필교환': 'bg-slate-50 text-slate-700',
  '화상상담': 'bg-purple-50 text-purple-700',
};

const RESULT_BADGE: Record<string, string> = {
  '수락': 'bg-green-50 text-green-700',
  '거절_A': 'bg-red-50 text-red-700',
  '거절_B': 'bg-red-50 text-red-700',
  '양측거절': 'bg-red-50 text-red-700',
  '보류': 'bg-amber-50 text-amber-700',
};

const RESULT_LABEL: Record<string, string> = {
  '수락': '수락',
  '거절_A': '한국측 거절',
  '거절_B': '외국측 거절',
  '양측거절': '양측 거절',
  '보류': '보류',
};

export default function MatchHistory({ clientId }: Props) {
  const { items, loading } = useMatches(clientId);
  const agencyId = useAuthStore((s) => s.user?.agencyId);

  async function handleResult(match: MatchListItem, result: MatchResult) {
    if (!agencyId) return;
    await updateMatchResult(agencyId, match.id, result);
  }

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">매칭 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{m.clientName}</span>
                <span className="text-slate-400">&times;</span>
                <span className="font-medium text-slate-900">{m.partnerName}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGE[m.type] ?? 'bg-slate-50 text-slate-600'}`}>
                  {m.type}
                </span>
                <span className="text-xs text-slate-500">
                  {m.date?.toDate ? format(m.date.toDate(), 'yyyy-MM-dd') : ''}
                </span>
                {m.mbtiScore != null && (
                  <span className="text-xs text-slate-500">MBTI {m.mbtiScore}점</span>
                )}
                {m.sajuScore != null && (
                  <span className="text-xs text-slate-500">사주 {m.sajuScore}점</span>
                )}
              </div>
              {m.memo && <p className="mt-1 text-xs text-slate-600">{m.memo}</p>}
            </div>

            <div className="shrink-0">
              {m.result ? (
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${RESULT_BADGE[m.result] ?? 'bg-slate-50 text-slate-600'}`}>
                  {RESULT_LABEL[m.result] ?? m.result}
                </span>
              ) : (
                <div className="flex gap-1">
                  {(['수락', '거절_A', '거절_B', '보류'] as MatchResult[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleResult(m, r)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                    >
                      {RESULT_LABEL[r]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
