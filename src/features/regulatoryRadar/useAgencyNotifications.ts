import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export type NotificationItem = {
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
      setItems(snap.docs.map((d) => d.data() as NotificationItem));
    });
    return () => unsub();
  }, [agencyId, max]);

  return items;
}
