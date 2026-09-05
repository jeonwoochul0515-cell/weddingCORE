// 로그인한 업체 문서(agencies/{id})를 구독하고, 대표가 고칠 수 있는 기본 정보를 저장한다
import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { Agency } from '@/types/schema';

export type AgencyDoc = Agency & { id: string };

export function useAgency() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [agency, setAgency] = useState<AgencyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    return onSnapshot(
      doc(db, 'agencies', agencyId),
      (snap) => {
        setAgency(snap.exists() ? ({ id: snap.id, ...(snap.data() as Agency) }) : null);
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
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

/** 010-1234-5678 꼴로 맞춘다. 문자 발송과 화면 표시가 같은 모양을 쓴다 */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return value.trim();
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
