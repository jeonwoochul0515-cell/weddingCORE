import { useEffect, useState } from 'react';
import { collection, doc, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveDoc, liveErrorMessage, liveQuery } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';
import type { AgencyAiCredits, AutomationJob } from '@/types/schema';

export type AutomationJobItem = AutomationJob & { id: string };

export function useAutomationJobs() {
  const agencyId = useAuthStore((state) => state.user?.agencyId);
  const [items, setItems] = useState<AutomationJobItem[]>([]);
  const [credits, setCredits] = useState<AgencyAiCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    setError(null);
    const jobsQuery = query(
      collection(db, `agencies/${agencyId}/automationJobs`),
      orderBy('updatedAt', 'desc'),
      limit(50),
    );
    const unsubscribeJobs = liveQuery(
      'AI 문서 작업',
      jobsQuery,
      (snapshot) => {
        setItems(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AutomationJob) })));
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
    const unsubscribeAgency = liveDoc(
      '캐럿 잔고',
      doc(db, `agencies/${agencyId}`),
      (snapshot) => setCredits((snapshot.data()?.aiCredits as AgencyAiCredits | undefined) ?? null),
      // 잔고를 못 읽어도 작업 목록은 보여 준다. 로그는 liveDoc이 남긴다.
      () => setCredits(null),
    );
    return () => {
      unsubscribeJobs();
      unsubscribeAgency();
    };
  }, [agencyId]);

  return { items, credits, loading, error };
}
