// 접수함 훅과 상태 변경 — 접수 → 전화했음 → 상담 중 → 고객 등록 / 종료
//
// 접수 문서는 서버가 만들고, 업체는 여기 있는 함수로 처리 상태·메모·다음 연락일만 바꾼다.
// 이름·전화·요약은 화면에서 못 바꾼다(보안 규칙). 한 접수가 어느 칸에 있는지가 곧 영업 현황이다.

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { Lead, LeadCloseReason, LeadStatus } from '@/types/schema';

export type LeadListItem = Lead & { id: string };

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: '접수',
  contacted: '전화했음',
  consulting: '상담 중',
  converted: '고객 등록',
  closed: '종료',
};

export const LEAD_CLOSE_REASON_LABEL: Record<LeadCloseReason, string> = {
  no_response: '연락이 닿지 않음',
  not_eligible: '조건이 맞지 않음',
  other_agency: '다른 업체로',
  hold: '보류 (나중에 다시)',
  other: '기타',
};

export const LEAD_LEVEL_LABEL: Record<string, { label: string; cls: string }> = {
  ok: { label: '걸림 없음', cls: 'bg-emerald-100 text-emerald-700' },
  check: { label: '확인 필요', cls: 'bg-amber-100 text-amber-800' },
  stop: { label: '정리 필요', cls: 'bg-red-100 text-red-700' },
};

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  quick_check: '홈페이지 점검 위젯',
  woori_site: '우리결혼중개 홈페이지',
};

export function useAgencyLeads(max = 200) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    const q = query(collection(db, `agencies/${agencyId}/leads`), orderBy('createdAt', 'desc'), limit(max));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Lead) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [agencyId, max]);

  return { items, loading };
}

function leadRef(agencyId: string, leadId: string) {
  return doc(db, `agencies/${agencyId}/leads/${leadId}`);
}

export async function markContacted(agencyId: string, leadId: string, memo?: string) {
  await updateDoc(leadRef(agencyId, leadId), {
    status: 'contacted',
    contactedAt: serverTimestamp(),
    ...(memo !== undefined ? { memo } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function markConsulting(agencyId: string, leadId: string, nextActionAt: Date | null, memo?: string) {
  await updateDoc(leadRef(agencyId, leadId), {
    status: 'consulting',
    nextActionAt: nextActionAt ? Timestamp.fromDate(nextActionAt) : null,
    ...(memo !== undefined ? { memo } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function closeLead(agencyId: string, leadId: string, reason: LeadCloseReason, memo?: string) {
  await updateDoc(leadRef(agencyId, leadId), {
    status: 'closed',
    closedAt: serverTimestamp(),
    closeReason: reason,
    ...(memo !== undefined ? { memo } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function reopenLead(agencyId: string, leadId: string) {
  await updateDoc(leadRef(agencyId, leadId), {
    status: 'contacted',
    closedAt: null,
    closeReason: null,
    updatedAt: serverTimestamp(),
  });
}

export async function saveLeadMemo(agencyId: string, leadId: string, memo: string) {
  await updateDoc(leadRef(agencyId, leadId), { memo, updatedAt: serverTimestamp() });
}

/** 고객 문서를 만든 뒤 호출한다. 접수는 여기서 끝나고 고객 상세로 이어진다. */
export async function markConverted(agencyId: string, leadId: string, clientId: string) {
  await updateDoc(leadRef(agencyId, leadId), {
    status: 'converted',
    clientId,
    convertedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 24시간 넘게 연락하지 않은 접수인가. 대시보드와 목록이 붉게 표시한다. */
export function isUnanswered(lead: Lead, now = Date.now()): boolean {
  if (lead.status !== 'new') return false;
  const created = lead.createdAt?.toMillis ? lead.createdAt.toMillis() : 0;
  return created > 0 && now - created > 24 * 60 * 60 * 1000;
}

/** 다음 연락일이 지났는가 */
export function isFollowUpDue(lead: Lead, now = Date.now()): boolean {
  if (lead.status !== 'consulting' && lead.status !== 'contacted') return false;
  const at = lead.nextActionAt?.toMillis ? lead.nextActionAt.toMillis() : 0;
  return at > 0 && at <= now;
}

/** "11시간 전", "3일 전"처럼 읽히는 경과 시간 */
export function elapsedLabel(ts: Timestamp | null | undefined, now = Date.now()): string {
  if (!ts?.toMillis) return '';
  const diff = now - ts.toMillis();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  return `${day}일 전`;
}

/** 이번 달 접수·연락·등록 수와 전환율. 마케팅 센터가 성과 한 줄로 쓴다. */
export function monthlyFunnel(items: Lead[], base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1).getTime();
  const thisMonth = items.filter((l) => (l.createdAt?.toMillis ? l.createdAt.toMillis() : 0) >= start);
  const received = thisMonth.length;
  const contacted = thisMonth.filter((l) => l.status !== 'new').length;
  const converted = thisMonth.filter((l) => l.status === 'converted').length;
  const rate = received ? Math.round((converted / received) * 100) : 0;
  return { received, contacted, converted, rate };
}
