import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';
import type { Match, MatchResult, MatchStage } from '@/types/schema';

export type MatchListItem = Match & { id: string };

export function useMatches(clientId?: string) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    setError(null);

    // 맞선은 업체 단위 컴렉션 하나다. 고객별 보기는 받은 뒤 걸러낸다 —
    // 한 고객이 clientId로도 partnerId로도 잔혀 있어 질의 한 번으로는 둘 다 못 가져온다.
    const q = query(collection(db, `agencies/${agencyId}/matches`), orderBy('date', 'desc'));

    return liveQuery(
      '맞선 기록',
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Match) }));
        setItems(
          clientId
            ? docs.filter((m) => m.clientId === clientId || m.partnerId === clientId)
            : docs,
        );
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId, clientId]);

  return { items, loading, error };
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
    stage: 'profile_shared',
    result: null,
    memo: data.memo,
    feedback: { client: '', partner: '' },
    nextActionAt: null,
    mbtiScore: data.mbtiScore,
    sajuScore: data.sajuScore,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
  const update: Record<string, unknown> = { result, updatedAt: serverTimestamp() };
  if (memo !== undefined) update.memo = memo;
  await updateDoc(ref, update);
}

export async function updateMatchWorkflow(
  agencyId: string,
  matchId: string,
  data: {
    stage: MatchStage;
    result: MatchResult | null;
    clientFeedback: string;
    partnerFeedback: string;
    nextActionAt: Date | null;
    memo: string;
  },
) {
  const ref = doc(db, `agencies/${agencyId}/matches/${matchId}`);
  await updateDoc(ref, {
    stage: data.stage,
    result: data.result,
    feedback: {
      client: data.clientFeedback.trim(),
      partner: data.partnerFeedback.trim(),
    },
    nextActionAt: data.nextActionAt ? Timestamp.fromDate(data.nextActionAt) : null,
    memo: data.memo.trim(),
    updatedAt: serverTimestamp(),
  });
}
