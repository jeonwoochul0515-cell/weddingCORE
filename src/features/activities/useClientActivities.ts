import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { ClientActivity, ClientActivityType } from '@/types/schema';

export type ClientActivityListItem = ClientActivity & { id: string };

export function useClientActivities(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<ClientActivityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    setLoading(true);
    const q = query(
      collection(db, `agencies/${agencyId}/clients/${clientId}/activities`),
      orderBy('occurredAt', 'desc'),
    );
    return onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as ClientActivity) })));
      setLoading(false);
    });
  }, [agencyId, clientId]);

  return { items, loading };
}

export async function createClientActivity(args: {
  agencyId: string;
  clientId: string;
  uid: string;
  type: ClientActivityType;
  occurredAt: Date;
  summary: string;
  outcome: string;
  assignedTo: string;
  nextActionAt: Date | null;
}) {
  const ref = doc(collection(db, `agencies/${args.agencyId}/clients/${args.clientId}/activities`));
  await setDoc(ref, {
    activityId: ref.id,
    agencyId: args.agencyId,
    clientId: args.clientId,
    type: args.type,
    occurredAt: Timestamp.fromDate(args.occurredAt),
    summary: args.summary.trim(),
    outcome: args.outcome.trim(),
    assignedTo: args.assignedTo.trim(),
    nextActionAt: args.nextActionAt ? Timestamp.fromDate(args.nextActionAt) : null,
    createdBy: args.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
