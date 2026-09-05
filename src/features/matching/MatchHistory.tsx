import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react';
import { useMatches, updateMatchWorkflow, type MatchListItem } from './useMatches';
import { useAuthStore } from '@/store/authStore';
import type { MatchResult, MatchStage } from '@/types/schema';

type Props = { clientId?: string };

const TYPE_BADGE: Record<string, string> = {
  맞선: 'bg-blue-50 text-blue-700',
  프로필교환: 'bg-slate-100 text-slate-700',
  화상상담: 'bg-purple-50 text-purple-700',
};

export const MATCH_STAGE_LABEL: Record<MatchStage, string> = {
  profile_shared: '프로필 전달',
  meeting_scheduled: '만남 예정',
  meeting_completed: '만남 완료',
  feedback_pending: '피드백 대기',
  rematch_needed: '재매칭 필요',
  completed: '성사·종료',
};

const STAGE_BADGE: Record<MatchStage, string> = {
  profile_shared: 'bg-slate-100 text-slate-700',
  meeting_scheduled: 'bg-blue-50 text-blue-700',
  meeting_completed: 'bg-indigo-50 text-indigo-700',
  feedback_pending: 'bg-amber-50 text-amber-800',
  rematch_needed: 'bg-rose-50 text-rose-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

const RESULT_LABEL: Record<MatchResult, string> = {
  수락: '양측 수락',
  거절_A: '한국 측 거절',
  거절_B: '외국 측 거절',
  양측거절: '양측 거절',
  보류: '보류',
};

export function effectiveMatchStage(match: MatchListItem): MatchStage {
  if (match.stage) return match.stage;
  if (match.result === '수락') return 'completed';
  if (match.result === '거절_A' || match.result === '거절_B' || match.result === '양측거절') return 'rematch_needed';
  if (match.result === '보류') return 'feedback_pending';
  return 'profile_shared';
}

function dateValue(value: unknown) {
  if (!value || typeof (value as { toDate?: unknown }).toDate !== 'function') return '';
  return format((value as { toDate: () => Date }).toDate(), 'yyyy-MM-dd');
}

export default function MatchHistory({ clientId }: Props) {
  const { items, loading } = useMatches(clientId);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center"><p className="text-sm text-slate-500">매칭 기록이 없습니다.</p></div>;
  }

  return (
    <div className="space-y-3">
      {items.map((match) => {
        const stage = effectiveMatchStage(match);
        const nextAction = match.nextActionAt?.toDate ? match.nextActionAt.toDate() : null;
        const overdue = nextAction ? nextAction.getTime() < new Date().setHours(0, 0, 0, 0) : false;
        const open = editingId === match.id;
        return (
          <article key={match.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{match.clientName}</span><span className="text-slate-400">×</span>
                    <span className="font-semibold text-slate-900">{match.partnerName || '외국 측 이름 미입력'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_BADGE[stage]}`}>{MATCH_STAGE_LABEL[stage]}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGE[match.type] ?? TYPE_BADGE.맞선}`}>{match.type}</span>
                    <span className="text-xs text-slate-500">{dateValue(match.date)}</span>
                    {match.result && <span className="text-xs font-medium text-slate-600">{RESULT_LABEL[match.result]}</span>}
                    {match.mbtiScore != null && <span className="text-xs text-slate-500">성향 {match.mbtiScore}점</span>}
                    {match.sajuScore != null && <span className="text-xs text-slate-500">사주 {match.sajuScore}점</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setEditingId(open ? null : match.id)} className="secondary-button shrink-0 !py-1.5 text-xs">
                  <MessageSquareText size={14} />진행 기록 {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {(match.feedback?.client || match.feedback?.partner) && (
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  {match.feedback.client && <p className="rounded-xl bg-slate-50 px-3 py-2"><span className="font-semibold text-slate-700">한국 측</span><span className="ml-2 text-slate-600">{match.feedback.client}</span></p>}
                  {match.feedback.partner && <p className="rounded-xl bg-slate-50 px-3 py-2"><span className="font-semibold text-slate-700">외국 측</span><span className="ml-2 text-slate-600">{match.feedback.partner}</span></p>}
                </div>
              )}
              {match.memo && <p className="mt-2 text-xs leading-5 text-slate-600">{match.memo}</p>}
              {nextAction && (
                <div className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${overdue ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <CalendarClock size={13} />다음 조치 {format(nextAction, 'yyyy-MM-dd')}{overdue ? ' · 지남' : ''}
                </div>
              )}
            </div>
            {open && <WorkflowEditor match={match} onSaved={() => setEditingId(null)} />}
          </article>
        );
      })}
    </div>
  );
}

function WorkflowEditor({ match, onSaved }: { match: MatchListItem; onSaved: () => void }) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [stage, setStage] = useState<MatchStage>(effectiveMatchStage(match));
  const [result, setResult] = useState<MatchResult | ''>(match.result ?? '');
  const [clientFeedback, setClientFeedback] = useState(match.feedback?.client ?? '');
  const [partnerFeedback, setPartnerFeedback] = useState(match.feedback?.partner ?? '');
  const [nextActionAt, setNextActionAt] = useState(dateValue(match.nextActionAt));
  const [memo, setMemo] = useState(match.memo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!agencyId) return;
    setBusy(true);
    setError(null);
    try {
      await updateMatchWorkflow(agencyId, match.id, {
        stage,
        result: result || null,
        clientFeedback,
        partnerFeedback,
        nextActionAt: nextActionAt ? new Date(`${nextActionAt}T09:00:00`) : null,
        memo,
      });
      onSaved();
    } catch (err) {
      setError(`저장하지 못했습니다. (${(err as Error).message})`);
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="현재 단계"><select value={stage} onChange={(event) => setStage(event.target.value as MatchStage)} className="field-control">{(Object.keys(MATCH_STAGE_LABEL) as MatchStage[]).map((value) => <option key={value} value={value}>{MATCH_STAGE_LABEL[value]}</option>)}</select></Field>
        <Field label="양측 결정"><select value={result} onChange={(event) => setResult(event.target.value as MatchResult | '')} className="field-control"><option value="">아직 결정 전</option>{(Object.keys(RESULT_LABEL) as MatchResult[]).map((value) => <option key={value} value={value}>{RESULT_LABEL[value]}</option>)}</select></Field>
        <Field label="다음 조치일"><input type="date" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} className="field-control" /></Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="한국 측 피드백"><textarea value={clientFeedback} onChange={(event) => setClientFeedback(event.target.value)} className="field-control min-h-20" maxLength={500} placeholder="만남 의사, 좋았던 점, 우려사항" /></Field>
        <Field label="외국 측 피드백"><textarea value={partnerFeedback} onChange={(event) => setPartnerFeedback(event.target.value)} className="field-control min-h-20" maxLength={500} placeholder="만남 의사, 좋았던 점, 우려사항" /></Field>
      </div>
      <div className="mt-3"><Field label="직원 메모"><textarea value={memo} onChange={(event) => setMemo(event.target.value)} className="field-control min-h-16" maxLength={1000} /></Field></div>
      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
      <div className="mt-3 flex justify-end"><button type="button" onClick={save} disabled={busy} className="primary-button !py-2">{busy ? '저장 중…' : '진행 기록 저장'}</button></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
