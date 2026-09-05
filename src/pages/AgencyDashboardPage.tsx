import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { AlertTriangle, ArrowRight, Bot, CalendarClock, CheckCircle2, Inbox, MessageSquareText, RefreshCw, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import { isFollowUpDue, isUnanswered, useAgencyLeads } from '@/features/leads/useAgencyLeads';
import type { TimelineItem } from '@/types/schema';
import { useAllMatches } from '@/features/matching/useMatches';

type UpcomingItem = TimelineItem & { id: string; path: string };

function useUpcomingTimeline() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    const q = query(
      collectionGroup(db, 'timeline'),
      where('agencyId', '==', agencyId),
      where('status', 'in', ['pending', 'in_progress', 'warning']),
      orderBy('dueDate', 'asc'),
      limit(5),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          path: d.ref.path,
          ...(d.data() as TimelineItem),
        })),
      );
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId]);

  return { items, loading };
}

function useOverdueCounts(agencyId: string | null | undefined) {
  const [warning, setWarning] = useState(0);
  const [violated, setViolated] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    const q = query(
      collectionGroup(db, 'timeline'),
      where('agencyId', '==', agencyId),
      where('status', 'in', ['warning', 'violated']),
    );
    const unsub = onSnapshot(q, (snap) => {
      let w = 0;
      let v = 0;
      snap.forEach((d) => {
        const s = (d.data() as TimelineItem).status;
        if (s === 'warning') w++;
        else if (s === 'violated') v++;
      });
      setWarning(w);
      setViolated(v);
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId]);

  return { warning, violated, loading };
}

export default function AgencyDashboardPage() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const { items: clients, loading: loadingClients } = useAgencyClients();
  const { items: closedClients, loading: loadingClosed } = useAgencyClients('closed');
  const { items: matches, loading: loadingMatches } = useAllMatches();
  const { items: upcoming, loading: loadingTimeline } = useUpcomingTimeline();
  const { warning, violated, loading: loadingOverdue } = useOverdueCounts(agencyId);
  const { items: leads, loading: loadingLeads } = useAgencyLeads();
  // 접수는 영업의 입구다. 연락 전 건수와 24시간 넘게 둔 건수를 법정의무 카드와 같은 줄에 둔다.
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const unansweredLeads = leads.filter((l) => isUnanswered(l)).length;
  const dueLeads = leads.filter((l) => isFollowUpDue(l)).length;

  const stageCounts = useMemo(() => {
    const acc: Record<number, number> = {};
    for (const c of clients) acc[c.currentStage] = (acc[c.currentStage] ?? 0) + 1;
    return acc;
  }, [clients]);

  const overdueTotal = warning + violated;
  const feedbackPending = matches.filter((match) => match.stage === 'feedback_pending' || (!match.stage && match.result === '보류')).length;
  const rematchNeeded = matches.filter((match) => match.stage === 'rematch_needed' || (!match.stage && ['거절_A', '거절_B', '양측거절'].includes(match.result ?? ''))).length;
  const successfulMatches = matches.filter((match) => match.stage === 'completed' || match.result === '수락').length;
  const completedClients = closedClients.filter((client) => client.status === 'completed').length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#102621] px-6 py-7 text-white shadow-[0_20px_50px_rgba(16,38,33,.16)] sm:px-8 sm:py-9">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-emerald-300 uppercase"><Sparkles size={14} />Today at weddingCORE</div><h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">오늘도 영업에<br className="sm:hidden" /> 집중하세요.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">기한과 법적 위험은 CORE가 계속 확인하고 있습니다. 아래 조치가 필요한 항목부터 처리하면 됩니다.</p></div>
          <Link to="/agency/automation" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#102621] shadow-lg shadow-emerald-950/20 hover:-translate-y-0.5 hover:bg-emerald-300"><Bot size={17} />AI 문서 만들기 <ArrowRight size={15} /></Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <Link to="/agency/clients?tab=leads" className="contents">
          <StatCard
            icon={<Inbox size={18} className={unansweredLeads > 0 ? 'text-red-600' : ''} />}
            label="새 접수"
            value={loadingLeads ? '…' : String(newLeads)}
            hint={
              unansweredLeads > 0 ? `24시간 넘게 연락 전 ${unansweredLeads}건`
              : dueLeads > 0 ? `다시 연락할 손님 ${dueLeads}명`
              : newLeads > 0 ? '오늘 전화할 손님' : '접수 없음'
            }
            warn={unansweredLeads > 0 || dueLeads > 0}
            clickable
          />
        </Link>
        <StatCard
          icon={<Users size={18} />}
          label="진행 중 고객"
          value={loadingClients ? '…' : String(clients.length)}
          hint={
            Object.keys(stageCounts).length > 0
              ? `맞선 단계 ${(stageCounts[3] ?? 0) + (stageCounts[4] ?? 0)}명, 비자 단계 ${stageCounts[5] ?? 0}명`
              : undefined
          }
        />
        <StatCard
          icon={<CalendarClock size={18} />}
          label="조치 임박 항목"
          value={loadingTimeline ? '…' : String(upcoming.length)}
          hint="곧 마감 예정"
        />
        <Link to="/agency/clients?filter=overdue" className="contents">
          <StatCard
            icon={
              <AlertTriangle
                size={18}
                className={warning > 0 ? 'text-amber-600' : ''}
              />
            }
            label="기한 경고 (≤3일 경과)"
            value={loadingOverdue ? '…' : String(warning)}
            hint={warning > 0 ? '조치 필요' : '없음'}
            warn={warning > 0}
            clickable
          />
        </Link>
        <Link to="/agency/clients?filter=overdue" className="contents">
          <StatCard
            icon={
              <ShieldAlert
                size={18}
                className={violated > 0 ? 'text-red-600' : ''}
              />
            }
            label="법적 위반 (>3일 경과)"
            value={loadingOverdue ? '…' : String(violated)}
            hint={violated > 0 ? '즉시 대응' : '없음'}
            danger={violated > 0}
            clickable
          />
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><div className="eyebrow">영업 흐름</div><h2 className="mt-1 text-base font-bold text-slate-900">소개·피드백 현황</h2></div>
          <Link to="/agency/matching" className="text-xs font-semibold text-emerald-700 hover:underline">매칭 관리 열기 →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard icon={<MessageSquareText size={18} />} label="피드백 대기" value={loadingMatches ? '…' : String(feedbackPending)} hint={feedbackPending ? '양측 반응 확인 필요' : '대기 없음'} warn={feedbackPending > 0} />
          <StatCard icon={<RefreshCw size={18} />} label="재매칭 필요" value={loadingMatches ? '…' : String(rematchNeeded)} hint={rematchNeeded ? '새 후보 제안 필요' : '대기 없음'} warn={rematchNeeded > 0} />
          <StatCard icon={<CheckCircle2 size={18} />} label="성사 기록" value={loadingMatches ? '…' : String(successfulMatches)} hint="양측 수락 기준" />
          <StatCard icon={<Users size={18} />} label="완료 고객" value={loadingClosed ? '…' : String(completedClients)} hint="혼인·비자 종료" />
        </div>
      </section>

      {overdueTotal > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700"><ShieldAlert size={17} /></span><div>
          <div className="font-medium">기한을 넘긴 항목이 있습니다.</div>
          <div className="mt-1 text-xs">
            법적 위반 {violated}건, 경고 {warning}건 — 해당 고객 상세 페이지에서 즉시 확인하세요.
          </div>
          </div>
        </div>
      )}

      <section className="app-surface overflow-hidden rounded-[24px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><div className="eyebrow">Priority queue</div><h2 className="mt-1 text-base font-bold text-slate-900">조치 필요 항목</h2></div>
          <Link to="/agency/clients" className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            전체 고객 보기 →
          </Link>
        </div>
        {loadingTimeline && <p className="px-5 py-4 text-sm text-slate-500">불러오는 중…</p>}
        {!loadingTimeline && upcoming.length === 0 && (
          <p className="px-5 py-4 text-sm text-slate-500">처리할 항목이 없습니다.</p>
        )}
        <ul>
          {upcoming.map((item) => (
            <li
              key={item.path}
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-[#fafcfb] sm:px-6"
            >
              <div className="min-w-0">
                <Link
                  to={`/agency/clients/${item.clientId}`}
                  className="truncate text-sm font-semibold text-slate-900 hover:text-emerald-700"
                >
                  {item.title}
                </Link>
                <div className="text-xs text-slate-500">
                  {item.legalBasis} · 단계 {item.stage}
                </div>
              </div>
              <DueBadge due={item.dueDate} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  danger,
  warn,
  clickable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
  warn?: boolean;
  clickable?: boolean;
}) {
  const borderTone = danger
    ? 'border-red-200/80'
    : warn
      ? 'border-amber-200'
      : 'border-slate-200/80';
  const valueTone = danger ? 'text-red-600' : warn ? 'text-amber-700' : 'text-slate-900';
  return (
    <div
      className={`min-h-32 rounded-2xl border bg-white p-4 shadow-[0_6px_24px_rgba(16,38,33,.035)] sm:p-5 ${borderTone} ${
        clickable ? 'hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(16,38,33,.08)]' : ''
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-emerald-700">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-3xl font-bold tracking-[-0.04em] ${valueTone}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function DueBadge({ due }: { due: Timestamp }) {
  const diffDays = Math.ceil((due.toMillis() - Date.now()) / 86_400_000);
  const overdue = diffDays < 0;
  const label = overdue ? `${-diffDays}일 지연` : diffDays === 0 ? '오늘' : `D-${diffDays}`;
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
        overdue
          ? 'bg-red-50 text-red-700'
          : diffDays <= 3
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  );
}
