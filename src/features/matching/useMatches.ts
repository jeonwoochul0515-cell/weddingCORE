import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { Match, MatchResult } from '@/types/schema';

export type MatchListItem = Match & { id: string };

export function useMatches(clientId?: string) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }

    const colPath = clientId
      ? `agencies/${agencyId}/matches`
      : `agencies/${agencyId}/matches`;

    let q = query(
      collection(db, colPath),
      orderBy('date', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Match) }));
      if (clientId) {
        docs = docs.filter((m) => m.clientId === clientId || m.partnerId === clientId);
      }
      setItems(docs);
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId]);

  return { items, loading };
}

export function useAllMatches() {
  return useMatches();
}

export async function createMatch(
  agencyId: string,
  uid: string,
  data: {
    clientId: string;
    partnerId: string;
    clientName: string;
    partnerName: string;
    type: Match['type'];
    date: Date;
    memo: string;
    mbtiScore: number | null;
    sajuScore: number | null;
  },
) {
  const ref = await addDoc(collection(db, `agencies/${agencyId}/matches`), {
    agencyId,
    clientId: data.clientId,
    partnerId: data.partnerId,
    clientName: data.clientName,
    partnerName: data.partnerName,
    type: data.type,
    date: Timestamp.fromDate(data.date),
    result: null,
    memo: data.memo,
    mbtiScore: data.mbtiScore,
    sajuScore: data.sajuScore,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMatchResult(
  agencyId: string,
  matchId: string,
  result: MatchResult,
  memo?: string,
) {
  const ref = doc(db, `agencies/${agencyId}/matches/${matchId}`);
  const update: Record<string, unknown> = { result };
  if (memo !== undefined) update.memo = memo;
  await updateDoc(ref, update);
}
