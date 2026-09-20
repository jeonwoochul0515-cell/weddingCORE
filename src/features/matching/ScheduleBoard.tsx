// 일정판 — 다음에 무엇이 있나
//
// 이 화면이 답해야 하는 질문은 하나다. **오늘과 이번 주에 내가 무엇을 해야 하나.**
// 지난 약속은 접어 둔다. 필요할 때만 펼친다.

import { useMemo, useState } from 'react';
import { CalendarDays, Globe, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePartners } from '@/features/partners/usePartners';
import AppointmentDialog from './AppointmentDialog';
import { useAllMatches } from './useMatches';
import {
  isUpcoming,
  KIND_LABEL,
  MODE_LABEL,
  removeAppointment,
  setAppointmentStatus,
  STATUS_CLASS,
  STATUS_LABEL,
  useAppointments,
  type AppointmentItem,
} from './useAppointments';
import { bucketOf, formatWhen, localTimeOf } from './scheduleMath';
import type { Appointment } from '@/types/schema';

export default function ScheduleBoard() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const { items, loading, error } = useAppointments();
  const { items: matches } = useAllMatches();
  const { items: partners } = usePartners();

  const [dialog, setDialog] = useState<{ editing?: AppointmentItem } | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
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

  async function changeStatus(a: AppointmentItem, status: Appointment['status']) {
    if (!agencyId) return;
    let reason = '';
    if (status === 'canceled' || status === 'noshow') {
      reason = window.prompt(status === 'canceled' ? '왜 취소되었나요?' : '누가 왜 안 나왔나요?') ?? '';
      if (!reason.trim()) return;
    }
    await setAppointmentStatus(agencyId, a.id, status, reason);
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
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {a.status === 'planned' && (
              <button
                type="button"
                onClick={() => void changeStatus(a, 'confirmed')}
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
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
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
약속은 맞선 위에 붙습니다. 위 「매칭」 탭 → 「맞선 만들기」로 고객과 후보를
          짝지우면 여기서 날짜를 잡을 수 있습니다.
        </p>
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
