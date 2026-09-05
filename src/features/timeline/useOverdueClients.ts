// 기한을 넘긴 법정의무 항목을 고객별로 세는 훅 — 대시보드 카드와 고객 목록의 「기한 지남」 필터가 같은 값을 쓴다
import { useEffect, useState } from 'react';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { TimelineItem } from '@/types/schema';

/** 단계 번호 → 사장이 읽는 이름. 목록·상세·대시보드가 같은 이름을 쓴다 */
export const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

export type OverdueCount = { warning: number; violated: number };

/**
 * 서버가 매일 새벽 기한을 넘긴 항목을 warning(3일 이내)·violated(3일 넘김)로 표시한다.
 * 그 항목들을 고객 id별로 모아 돌려준다. 고객 목록은 이 Map에 있는 고객만 걸러 보여 준다.
 */
export function useOverdueClients() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [byClient, setByClient] = useState<Map<string, OverdueCount>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    const q = query(
      collectionGroup(db, 'timeline'),
      where('agencyId', '==', agencyId),
      where('status', 'in', ['warning', 'violated']),
    );
    const unsub = onSnapshot(q, (snap) => {
      const next = new Map<string, OverdueCount>();
      snap.forEach((d) => {
        const item = d.data() as TimelineItem;
        const cur = next.get(item.clientId) ?? { warning: 0, violated: 0 };
        if (item.status === 'warning') cur.warning += 1;
        else if (item.status === 'violated') cur.violated += 1;
        next.set(item.clientId, cur);
      });
      setByClient(next);
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId]);

  let warning = 0;
  let violated = 0;
  byClient.forEach((c) => { warning += c.warning; violated += c.violated; });

  return { byClient, warning, violated, loading };
}
