// 일정판 — 다음에 무엇이 있나
//
// 이 화면이 답해야 하는 질문은 하나다. **오늘과 이번 주에 내가 무엇을 해야 하나.**
// 지난 약속은 접어 둔다. 필요할 때만 펼친다.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Globe, Loader2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePartners } from '@/features/partners/usePartners';
import AppointmentDialog from './AppointmentDialog';
import { useAllMatches } from './useMatches';
import {
  confirmAppointment,
  isUpcoming,
  KIND_LABEL,
  MODE_LABEL,
  removeAppointment,
  setAppointmentStatus,
  STATUS_CLASS,
  STATUS_LABEL,
  useAppointments,
  type AppointmentItem,
  type MeetingBlocker,
} from './useAppointments';
import { bucketOf, formatWhen, localTimeOf } from './scheduleMath';
import type { Appointment } from '@/types/schema';

type Props = {
  /** 맞선이 하나도 없을 때 그 자리에서 만들게 해 준다. 다른 탭으로 보내지 않는다 */
  onCreateMatch?: () => void;
};

export default function ScheduleBoard({ onCreateMatch }: Props) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const { items, loading, error } = useAppointments();
  const { items: matches } = useAllMatches();
  const { items: partners } = usePartners();

  const [dialog, setDialog] = useState<{ editing?: AppointmentItem } | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** 확정하려다 막힌 약속과 그 이유 */
  const [blocked, setBlocked] = useState<{ id: string; blockers: MeetingBlocker[] } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const up: AppointmentItem[] = [];
    const old: AppointmentItem[] = [];
    for (const a of items) {
      if (isUpcoming(a, now)) up.push(a);
      else old.push(a);
    }
    // 지난 것은 최근 것부터 본다.
    old.reverse();
    return { upcoming: up, past: old };
  }, [items, now]);

  const grouped = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const a of upcoming) {
      const start = a.startAt?.toDate?.();
      if (!start) continue;
      const key = bucketOf(start, now);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [upcoming, now]);

  async function changeStatus(
    a: AppointmentItem,
    status: Exclude<Appointment['status'], 'confirmed'>,
  ) {
    if (!agencyId) return;
    let reason = '';
    if (status === 'canceled' || status === 'noshow') {
      reason = window.prompt(status === 'canceled' ? '왜 취소되었나요?' : '누가 왜 안 나왔나요?') ?? '';
      if (!reason.trim()) return;
    }
    await setAppointmentStatus(agencyId, a.id, status, reason);
  }

  /**
   * 확정은 서버를 거친다.
   *
   * 법은 온라인과 오프라인을 가르지 않는다. 현지에 나가 직접 만나는 자리가
   * 오히려 더 무거운 만남이다. 잡는 것은 막지 않고 확정을 막는다 —
   * 잡는 것까지 막으면 기록을 안 남기고 만난다.
   */
  async function confirm(a: AppointmentItem) {
    setConfirming(a.id);
    setBlocked(null);
    try {
      const result = await confirmAppointment(a.id);
      if (!result.confirmed) setBlocked({ id: a.id, blockers: result.blockers });
    } catch (e) {
      window.alert((e as { message?: string }).message ?? '확정하지 못했습니다.');
    } finally {
      setConfirming(null);
    }
  }

  async function remove(id: string) {
    if (!agencyId) return;
    await removeAppointment(agencyId, id);
    setConfirmId(null);
  }

  function Card({ a }: { a: AppointmentItem }) {
    const start = a.startAt?.toDate?.();
    const partner = partners.find((p) => p.id === a.partnerId);
    const local = start ? localTimeOf(partner?.nationality, start) : null;

    return (
      <li className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {MODE_LABEL[a.mode]} · {KIND_LABEL[a.kind]}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900">
              {a.clientName} <span className="text-slate-400">·</span> {a.partnerName}
            </p>
            {start && (
              <p className="mt-0.5 text-xs text-slate-600">{formatWhen(start, a.durationMinutes)}</p>
            )}
            {local && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-sky-700">
                <Globe size={11} />
                {partner?.nationality} 현지{' '}
                {local.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
            )}
            {a.place?.name && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-600">
                <MapPin size={11} />
                {a.place.name}
                {a.place.address && <span className="text-slate-400"> · {a.place.address}</span>}
              </p>
            )}
            {a.interpreterName && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Users size={11} />통역 {a.interpreterName}
              </p>
            )}
            {a.memo && <p className="mt-1 text-[11px] leading-4 text-slate-500">{a.memo}</p>}
            {a.canceledReason && (
              <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                사유: {a.canceledReason}
              </p>
            )}

            {/*
              확정이 막혔을 때만 보인다. 평소에는 길게 늘어놓지 않는다 —
              일정판은 「오늘 뭐 하나」를 보는 화면이지 법 공부하는 화면이 아니다.
            */}
            {blocked?.id === a.id && (
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-bold text-amber-900">
                  만나기 전에 마쳐야 할 것이 {blocked.blockers.length}건 있습니다
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-amber-800">
                  직접 만나는 자리도 화상맞선과 같은 요건을 받습니다. 법은 둘을 가르지 않습니다.
                </p>
                <ul className="mt-1.5 space-y-1">
                  {blocked.blockers.map((b) => (
                    <li key={b.reason} className="rounded bg-white px-2 py-1.5">
                      <p className="text-[11px] font-medium text-slate-800">{b.reason}</p>
                      <p className="text-[11px] leading-4 text-slate-500">{b.remedy}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/agency/matching"
                  onClick={() => setBlocked(null)}
                  className="mt-2 inline-block text-[11px] font-semibold text-amber-900 underline"
                >
                  매칭 탭에서 이 맞선을 열어 처리하기
                </Link>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {a.status === 'planned' && (
              <button
                type="button"
                onClick={() => void confirm(a)}
                disabled={confirming === a.id}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {confirming === a.id && <Loader2 size={11} className="animate-spin" />}
                확정
              </button>
            )}
            {(a.status === 'planned' || a.status === 'confirmed') && (
              <>
                <button
                  type="button"
                  onClick={() => void changeStatus(a, 'done')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                >
                  끝남
                </button>
                <button
                  type="button"
                  onClick={() => void changeStatus(a, 'noshow')}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  불참
                </button>
                <button
                  type="button"
                  onClick={() => void changeStatus(a, 'canceled')}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-100"
                >
                  취소
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setDialog({ editing: a })}
              aria-label="고치기"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <Pencil size={13} />
            </button>
            {confirmId === a.id ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white"
                >
                  지우기
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
                >
                  취소
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(a.id)}
                aria-label="지우기"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          다가오는 약속 <strong className="text-slate-900">{upcoming.length}</strong>건
        </p>
        <button
          type="button"
          onClick={() => setDialog({})}
          className="primary-button"
          disabled={matches.length === 0}
        >
          <Plus size={16} />약속 잡기
        </button>
      </div>

      {matches.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            약속은 맞선 위에 붙습니다. 고객과 후보를 먼저 짝지우세요.
          </p>
          {onCreateMatch && (
            <button type="button" onClick={onCreateMatch} className="primary-button mx-auto mt-3">
              <Plus size={16} />맞선 만들기
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {!loading && matches.length > 0 && upcoming.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          잡혀 있는 약속이 없습니다.
        </p>
      )}

      <div className="space-y-5">
        {['오늘', '내일', '이번 주', '이번 달', '그 뒤'].map((bucket) => {
          const list = grouped.get(bucket);
          if (!list || list.length === 0) return null;
          return (
            <section key={bucket}>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <CalendarDays size={13} />
                {bucket} ({list.length})
              </h3>
              <ul className="space-y-2">
                {list.map((a) => (
                  <Card key={a.id} a={a} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {past.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setShowPast((s) => !s)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            지난 약속 {past.length}건 {showPast ? '접기' : '펼치기'}
          </button>
          {showPast && (
            <ul className="mt-3 space-y-2">
              {past.map((a) => (
                <Card key={a.id} a={a} />
              ))}
            </ul>
          )}
        </div>
      )}

      {dialog && (
        <AppointmentDialog
          matches={matches}
          editing={dialog.editing}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </div>
  );
}
