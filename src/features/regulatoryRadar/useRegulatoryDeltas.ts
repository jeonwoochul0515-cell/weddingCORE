import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const base = collection(db, 'regulatoryDelta');
    const q = options?.statuteId
      ? query(
          base,
          where('statuteId', '==', options.statuteId),
          orderBy('detectedAt', 'desc'),
          limit(options?.max ?? 50),
        )
      : query(base, orderBy('detectedAt', 'desc'), limit(options?.max ?? 50));

    return liveQuery(
      '규제 변동',
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeltaItem, 'id'>) })));
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [options?.statuteId, options?.max]);

  return { items, loading, error };
}
