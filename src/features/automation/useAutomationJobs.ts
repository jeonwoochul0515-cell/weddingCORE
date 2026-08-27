import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { AgencyAiCredits, AutomationJob } from '@/types/schema';

export type AutomationJobItem = AutomationJob & { id: string };

export function useAutomationJobs() {
  const agencyId = useAuthStore((state) => state.user?.agencyId);
  const [items, setItems] = useState<AutomationJobItem[]>([]);
  const [credits, setCredits] = useState<AgencyAiCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    const jobsQuery = query(
      collection(db, `agencies/${agencyId}/automationJobs`),
      orderBy('updatedAt', 'desc'),
      limit(50),
    );
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AutomationJob) })));
      setLoading(false);
    });
    const unsubscribeAgency = onSnapshot(doc(db, `agencies/${agencyId}`), (snapshot) => {
      setCredits((snapshot.data()?.aiCredits as AgencyAiCredits | undefined) ?? null);
    });
    return () => {
      unsubscribeJobs();
      unsubscribeAgency();
    };
  }, [agencyId]);

  return { items, credits, loading };
}
