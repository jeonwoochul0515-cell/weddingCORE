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

export type DeltaItem = {
  id: string;
  statuteId: string;
  articleNumber: string | null;
  changeType: 'new' | 'amended' | 'repealed';
  diffSummary: string;
  sourceUrl: string;
  priority: 'critical' | 'high' | 'medium';
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
