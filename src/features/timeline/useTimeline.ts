import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { TimelineItem } from '@/types/schema';

export type TimelineItemView = TimelineItem & { id: string };

export function useClientTimeline(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<TimelineItemView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    const q = query(
      collection(db, `agencies/${agencyId}/clients/${clientId}/timeline`),
      orderBy('stage'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as TimelineItem) })));
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId]);

  return { items, loading };
}

export async function updateTimelineItem(
  agencyId: string,
  clientId: string,
  itemId: string,
  patch: Partial<{ status: TimelineItem['status']; notes: string }>,
  uid: string,
) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}/timeline/${itemId}`);
  await updateDoc(ref, {
    ...patch,
    ...(patch.status === 'done'
      ? { completedAt: serverTimestamp(), completedBy: uid }
      : {}),
    updatedAt: serverTimestamp(),
  });
}
