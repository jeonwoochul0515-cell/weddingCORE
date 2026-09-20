// 업체 알림 구독과 읽음 표시
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveQuery } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';

export type NotificationItem = {
  /** 문서 id. notifId 필드와 같아야 하지만 문서 id를 기준으로 삼는다 */
  id: string;
  notifId: string;
  type: 'doc_expiring' | 'timeline_due' | 'regulatory_change' | 'violation_detected';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  link: string;
  readBy: Record<string, unknown>;
  createdAt?: { toDate(): Date };
};

export function useAgencyNotifications(max = 20) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!agencyId) return;
    const q = query(
      collection(db, `agencies/${agencyId}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    return liveQuery(
      '업체 알림',
      q,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }))),
      // 알림은 보조 정보다. 못 읽으면 종을 비워 둔다 — 안 온 것처럼 보이는 편이
      // 읽지도 못하는 빨간 점을 달아 두는 것보다 낫다. 로그는 liveQuery가 남긴다.
      () => setItems([]),
    );
  }, [agencyId, max]);

  return items;
}

/** 읽음 표시. 규칙이 readBy 만 고치도록 허용한다. 한 번에 여러 건을 묶어 쓴다. */
export async function markNotificationsRead(agencyId: string, uid: string, ids: string[]) {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, `agencies/${agencyId}/notifications/${id}`), { [`readBy.${uid}`]: serverTimestamp() });
  }
  await batch.commit();
}
