// 우리 업체가 낸 마케팅 신청 내역
//
// 왜 필요한가. 예전엔 결제를 하든 상담 요청을 넣든 화면에 아무 흔적이 남지 않았다.
// 업체는 돈을 내고도 "접수가 된 건지" 확인할 방법이 없어 같은 신청을 다시 넣거나
// 전화로 물어야 했다. 낸 것과 그 상태를 그대로 보여 준다.

import { useEffect, useState } from 'react';
import { collection, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';

export type MarketingRequest = {
  id: string;
  services: string[];
  status: 'requested' | 'in_progress' | 'done' | 'cancelled';
  /** 카드로 결제한 건인지. 계좌이체·상담 요청과 구분한다 */
  paid?: boolean;
  paidAmount?: number;
  billing?: 'once' | 'monthly';
  orderId?: string;
  note?: string;
  keywords?: string[];
  quote?: { onceTotal?: number; monthlyTotal?: number };
  createdAt?: Timestamp | null;
};

export const MARKETING_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  requested: { label: '접수됨', cls: 'bg-amber-100 text-amber-800' },
  in_progress: { label: '진행 중', cls: 'bg-blue-100 text-blue-700' },
  done: { label: '완료', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: '취소', cls: 'bg-slate-100 text-slate-600' },
};

export function useMarketingRequests(max = 20) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<MarketingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    setError(null);
    const q = query(
      collection(db, `agencies/${agencyId}/marketingRequests`),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    return liveQuery(
      '마케팅 신청',
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MarketingRequest, 'id'>) })));
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId, max]);

  return { items, loading, error };
}
