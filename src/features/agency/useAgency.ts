// 로그인한 업체 문서(agencies/{id})를 구독하고, 대표가 고칠 수 있는 기본 정보를 저장한다
import { useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveDoc, liveErrorMessage } from '@/lib/live';
import { useAuthStore } from '@/store/authStore';
import { formatPhone } from '@/lib/korean';
import type { Agency } from '@/types/schema';

export type AgencyDoc = Agency & { id: string };

export function useAgency() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [agency, setAgency] = useState<AgencyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    setError(null);
    return liveDoc(
      '업체 정보',
      doc(db, 'agencies', agencyId),
      (snap) => {
        setAgency(snap.exists() ? ({ id: snap.id, ...(snap.data() as Agency) }) : null);
        setLoading(false);
      },
      // err.message를 그대로 넣으면 「Missing or insufficient permissions.」 같은 영문이 화면에 뜨는다.
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId]);

  return { agency, loading, error };
}

/** 대표가 고칠 수 있는 기본 정보. 규칙(firestore.rules)이 허용하는 키만 보낸다 */
export type AgencyBasics = {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
};

/** 휴대폰 번호인지. 접수 문자가 이 번호로 가므로 유선번호는 받지 않는다 */
export function isMobilePhone(value: string) {
  return /^01[016789]-?\d{3,4}-?\d{4}$/.test(value.trim());
}

export async function updateAgencyBasics(agencyId: string, data: AgencyBasics) {
  await updateDoc(doc(db, 'agencies', agencyId), {
    name: data.name.trim(),
    ownerName: data.ownerName.trim(),
    phone: formatPhone(data.phone),
    address: data.address.trim() || null,
    updatedAt: serverTimestamp(),
  });
}
