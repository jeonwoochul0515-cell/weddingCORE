import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/** 법제처 개정 공시에서 감지한 변경. 법률과 행정규칙(하위법령)을 모두 담는다. */
export type DeltaItem = {
  id: string;
  kind: 'law' | 'admrul';
  name: string;
  statuteId: string | null;
  matchedBy: string;
  priority: 'critical' | 'high' | 'medium';
  tracks?: string[];
  promulgatedOn: string;
  enforcedOn: string | null;
  enforcementStatus: 'upcoming' | 'in_effect' | 'unknown';
  revisionType: string | null;
  ministry: string | null;
  sourceUrl: string;
  articleSummary: string | null;
  detectedAt?: { toDate(): Date };
};

export function useRegulatoryDeltas(options?: { statuteId?: string; max?: number }) {
  const [items, setItems] = useState<DeltaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = collection(db, 'regulatoryDelta');
    const q = options?.statuteId
      ? query(
          base,
          where('statuteId', '==', options.statuteId),
          orderBy('detectedAt', 'desc'),
          limit(options?.max ?? 50),
        )
      : query(base, orderBy('detectedAt', 'desc'), limit(options?.max ?? 50));

    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeltaItem, 'id'>) })),
      );
      setLoading(false);
    });
    return () => unsub();
  }, [options?.statuteId, options?.max]);

  return { items, loading };
}
