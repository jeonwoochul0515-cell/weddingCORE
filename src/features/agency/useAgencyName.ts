// 로그인한 업체의 이름을 구독한다 — 상단바에 내부 ID 대신 상호를 보여 주기 위한 작은 훅
import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveDoc } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';

export function useAgencyName() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setName(null); return; }
    return liveDoc(
      '상단바 업체명',
      doc(db, 'agencies', agencyId),
      (snap) => setName(String(snap.data()?.name ?? '')),
      // 이름을 못 읽어도 화면은 돌아가야 한다. 빈 이름으로 두고 로그만 남긴다.
      () => setName(''),
    );
  }, [agencyId]);

  return name;
}
