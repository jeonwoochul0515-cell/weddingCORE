// 업체 알림 구독과 읽음 표시
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) })));
    });
    return () => unsub();
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
