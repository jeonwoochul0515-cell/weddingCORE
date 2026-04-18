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
import { AlertTriangle, CalendarClock, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import type { TimelineItem } from '@/types/schema';

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

export default function AgencyDashboardPage() {
  const { items: clients, loading: loadingClients } = useAgencyClients();
  const { items: upcoming, loading: loadingTimeline } = useUpcomingTimeline();

  const stageCounts = useMemo(() => {
    const acc: Record<number, number> = {};
    for (const c of clients) acc[c.currentStage] = (acc[c.currentStage] ?? 0) + 1;
    return acc;
  }, [clients]);

  const now = Date.now();
  const overdueCount = upcoming.filter((i) => i.dueDate.toMillis() < now).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">대시보드</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<Users size={18} />}
          label="진행 중 고객"
          value={loadingClients ? '…' : String(clients.length)}
          hint={
            Object.keys(stageCounts).length > 0
              ? `맞선 단계 ${stageCounts[3] ?? 0 + (stageCounts[4] ?? 0)}명, 비자 단계 ${stageCounts[5] ?? 0}명`
              : undefined
          }
        />
        <StatCard
          icon={<CalendarClock size={18} />}
          label="조치 임박 항목"
          value={loadingTimeline ? '…' : String(upcoming.length)}
          hint="7일 이내 마감 예정"
        />
        <StatCard
          icon={<AlertTriangle size={18} className={overdueCount > 0 ? 'text-red-600' : ''} />}
          label="기한 초과"
          value={loadingTimeline ? '…' : String(overdueCount)}
          hint={overdueCount > 0 ? '즉시 확인 필요' : '없음'}
          danger={overdueCount > 0}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">조치 필요 항목</h2>
          <Link to="/agency/clients" className="text-xs text-slate-500 hover:text-slate-900">
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
              className="flex items-center justify-between border-b border-slate-100 px-5 py-3 last:border-0"
            >
              <div className="min-w-0">
                <Link
                  to={`/agency/clients/${item.clientId}`}
                  className="truncate text-sm font-medium text-slate-900 hover:underline"
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-5 ${
        danger ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${danger ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </div>
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
