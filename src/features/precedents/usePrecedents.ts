// 판례·재결례 조회 훅 — 목록은 서버에서 요약만 받고, 본문은 열 때 따로 가져온다
//
// 다른 참조 데이터(법령·규제변동)와 달리 Firestore를 직접 읽지 않는다.
// 판례 문서의 body가 최대 4만 자라 목록에서 통째로 받으면 무겁기 때문이다.
// 이유는 docs/context-notes.md에 적어 두었다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export type PrecedentSummary = {
  id: string;
  kind: 'prec' | 'decc';
  caseNumber: string;
  caseName: string;
  courtName: string;
  agency: string;
  decidedOn: string;
  caseType: string;
  summary: string;
  requirements: string[];
  requirementConfidence: 'auto' | 'reviewed' | 'none';
};

export type PrecedentDetail = PrecedentSummary & {
  disposedOn: string;
  holding: string;
  disposition: string;
  references: string;
  body: string;
  requirementsWeak: string[];
  sourceUrl: string;
};

export type PrecedentCounts = {
  total: number;
  prec: number;
  decc: number;
  byRequirement: Record<string, number>;
};

type SearchArgs = {
  requirement?: string;
  kind?: string;
  keyword?: string;
  limit?: number;
};

export function usePrecedentSearch(args: SearchArgs) {
  const [items, setItems] = useState<PrecedentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { requirement, kind, keyword, limit } = args;
  // 검색어는 타자를 칠 때마다 부르지 않는다.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const fn = httpsCallable<
          SearchArgs,
          { items: PrecedentSummary[]; total: number; returned: number }
        >(functions, 'searchPrecedents');
        const res = await fn({ requirement, kind, keyword, limit });
        setItems(res.data.items ?? []);
        setTotal(res.data.total ?? 0);
      } catch (err) {
        setError((err as Error).message);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, keyword ? 400 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [requirement, kind, keyword, limit]);

  return { items, total, loading, error };
}

export function usePrecedentCounts() {
  const [counts, setCounts] = useState<PrecedentCounts | null>(null);

  useEffect(() => {
    let alive = true;
    const fn = httpsCallable<Record<string, never>, PrecedentCounts>(functions, 'precedentCounts');
    fn({})
      .then((res) => {
        if (alive) setCounts(res.data);
      })
      .catch(() => {
        // 건수는 부가 정보다. 실패해도 목록은 보여준다.
        if (alive) setCounts(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return counts;
}

export function usePrecedentDetail() {
  const [detail, setDetail] = useState<PrecedentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const fn = httpsCallable<{ id: string }, PrecedentDetail>(functions, 'getPrecedent');
      const res = await fn({ id });
      setDetail(res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setDetail(null);
    setError(null);
  }, []);

  return { detail, loading, error, open, close };
}
