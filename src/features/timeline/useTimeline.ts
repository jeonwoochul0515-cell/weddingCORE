import { useEffect, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { AnchorKey, TimelineItem } from '@/types/schema';

const functions = getFunctions(app, 'asia-northeast3');

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

export async function linkEvidence(
  agencyId: string,
  clientId: string,
  itemId: string,
  entry: { docId: string; addedAt: Timestamp },
  op: 'add' | 'remove',
) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}/timeline/${itemId}`);
  const payload = op === 'add' ? arrayUnion(entry) : arrayRemove(entry);
  await updateDoc(ref, { evidence: payload, updatedAt: serverTimestamp() });
}

export async function markAnchorEvent(params: {
  agencyId: string;
  clientId: string;
  anchor: AnchorKey;
  eventDate: Date;
}): Promise<{ ok: boolean; updated: number }> {
  const fn = httpsCallable<
    { agencyId: string; clientId: string; anchor: AnchorKey; eventDate: string },
    { ok: boolean; updated: number }
  >(functions, 'markAnchorEvent');
  const res = await fn({
    agencyId: params.agencyId,
    clientId: params.clientId,
    anchor: params.anchor,
    eventDate: params.eventDate.toISOString(),
  });
  return res.data;
}
