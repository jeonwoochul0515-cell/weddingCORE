// 로그인한 업체의 이름을 구독한다 — 상단바에 내부 ID 대신 상호를 보여 주기 위한 작은 훅
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

export function useAgencyName() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setName(null); return; }
    return onSnapshot(
      doc(db, 'agencies', agencyId),
      (snap) => setName(String(snap.data()?.name ?? '')),
      () => setName(''),
    );
  }, [agencyId]);

  return name;
}
