// 약속 — 맞선 한 건에 붙는 만남들
//
// 왜 맞선 문서 안이 아니라 따로 두나. 한 맞선에 만남은 여러 번이다.
// 화상으로 보고, 괜찮으면 현지에 나가 만나고, 다시 만나고, 상견례를 한다.
// Match.date 한 칸에 담으려면 앞선 약속을 덮어써야 한다 — 지난 일정이 사라진다.

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';
import type { Appointment } from '@/types/schema';
import { isUpcomingAt } from './scheduleMath';

export type AppointmentItem = Appointment & { id: string };

export const MODE_LABEL: Record<Appointment['mode'], string> = {
  online: '화상',
  offline: '직접 만남',
};

export const KIND_LABEL: Record<Appointment['kind'], string> = {
  화상맞선: '화상맞선',
  현지만남: '현지 만남',
  재회: '재회',
  상견례: '상견례',
  혼인신고: '혼인신고',
  기타: '기타',
};

export const STATUS_LABEL: Record<Appointment['status'], string> = {
  planned: '잡는 중',
  confirmed: '확정',
  done: '끝남',
  canceled: '취소',
  noshow: '불참',
};

export const STATUS_CLASS: Record<Appointment['status'], string> = {
  planned: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  done: 'bg-slate-100 text-slate-600',
  canceled: 'bg-slate-100 text-slate-400 line-through',
  noshow: 'bg-red-50 text-red-700',
};

// 시차·시간 계산은 scheduleMath.ts에 따로 두고 테스트로 못 박아 둔다.
// 틀리면 상대가 자는 시각에 약속을 잡는 사고로 이어진다.
export { localTimeOf, formatWhen, bucketOf } from './scheduleMath';

export function useAppointments(matchId?: string) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    setError(null);
    // 빠른 것부터. 일정판은 「다음에 무엇이 있나」를 보는 화면이다.
    const q = query(collection(db, `agencies/${agencyId}/appointments`), orderBy('startAt', 'asc'));
    return liveQuery(
      '약속',
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Appointment) }));
        setItems(matchId ? docs.filter((a) => a.matchId === matchId) : docs);
        setLoading(false);
      },
      (err) => {
        setError(liveErrorMessage(err));
        setLoading(false);
      },
    );
  }, [agencyId, matchId]);

  return { items, loading, error };
}

export type AppointmentInput = {
  matchId: string;
  clientId: string;
  partnerId: string;
  clientName: string;
  partnerName: string;
  mode: Appointment['mode'];
  kind: Appointment['kind'];
  startAt: Date;
  durationMinutes: number;
  place: { name: string; address: string; note: string } | null;
  status: Appointment['status'];
  interpreterName: string;
  agentUid: string | null;
  memo: string;
};

export async function createAppointment(agencyId: string, uid: string, input: AppointmentInput) {
  const ref = await addDoc(collection(db, `agencies/${agencyId}/appointments`), {
    agencyId,
    matchId: input.matchId,
    clientId: input.clientId,
    partnerId: input.partnerId,
    clientName: input.clientName,
    partnerName: input.partnerName,
    mode: input.mode,
    kind: input.kind,
    startAt: Timestamp.fromDate(input.startAt),
    durationMinutes: input.durationMinutes,
    // 화상은 사이트 안 통화방을 쓴다. 장소를 적을 자리를 두지 않는다.
    place: input.mode === 'offline' ? input.place : null,
    status: input.status,
    interpreterName: input.interpreterName.trim(),
    agentUid: input.agentUid,
    memo: input.memo.trim(),
    canceledReason: '',
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(ref, { appointmentId: ref.id });
  return ref.id;
}

export async function updateAppointment(
  agencyId: string,
  id: string,
  input: Partial<AppointmentInput>,
) {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    patch[k] = k === 'startAt' && v instanceof Date ? Timestamp.fromDate(v) : v;
  }
  if (input.mode === 'online') patch.place = null;
  await updateDoc(doc(db, `agencies/${agencyId}/appointments/${id}`), patch);
}

/** 상태만 바꾼다. 취소·불참은 왜 그랬는지를 같이 받는다 — 나중에 누구 책임인지 가린다 */
export async function setAppointmentStatus(
  agencyId: string,
  id: string,
  status: Appointment['status'],
  canceledReason = '',
) {
  await updateDoc(doc(db, `agencies/${agencyId}/appointments/${id}`), {
    status,
    canceledReason: status === 'canceled' || status === 'noshow' ? canceledReason.trim() : '',
    updatedAt: serverTimestamp(),
  });
}

export async function removeAppointment(agencyId: string, id: string) {
  await deleteDoc(doc(db, `agencies/${agencyId}/appointments/${id}`));
}

/** 지금 이후인가. 판정은 scheduleMath가 하고 여기서는 Timestamp를 풀기만 한다 */
export function isUpcoming(a: AppointmentItem, now: Date = new Date()): boolean {
  const start = a.startAt?.toDate?.();
  return isUpcomingAt(start ? start.getTime() : null, a.durationMinutes, a.status, now.getTime());
}
