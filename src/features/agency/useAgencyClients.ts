// 업체 고객 목록·단건 구독과 고객 등록·기본정보 수정·종료 처리
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { Client, ClientIntake } from '@/types/schema';

/** 접수에서 넘어올 때 고객 문서에 함께 저장되는 기록 */
export type CreateClientIntake = ClientIntake;

export type ClientListItem = Client & { id: string };

/** 등록·수정 창이 다루는 기본정보. 주민번호는 다루지 않는다 */
export type ClientBasics = {
  name: string;
  birthDate: Date;
  gender: 'M' | 'F';
  phone: string;
  address: string;
  incomeAnnual: number | null;
  occupation: string;
  maritalHistory: string;
};

export type ClientScope = 'active' | 'closed';

/** 진행 중 고객이 기본. 종료(완료·취소)한 고객은 따로 본다 */
export function useAgencyClients(scope: ClientScope = 'active') {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    setLoading(true);
    const statusFilter = scope === 'active'
      ? where('status', '==', 'active')
      : where('status', 'in', ['completed', 'cancelled']);
    const q = query(
      collection(db, `agencies/${agencyId}/clients`),
      statusFilter,
      orderBy('updatedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Client) })));
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, scope]);

  return { items, loading };
}

export function useClient(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [client, setClient] = useState<ClientListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
    const unsub = onSnapshot(ref, (snap) => {
      setClient(snap.exists() ? { id: snap.id, ...(snap.data() as Client) } : null);
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId]);

  return { client, loading };
}

export async function createClient(
  agencyId: string,
  uid: string,
  data: ClientBasics,
  origin?: { source: Client['source']; intake: CreateClientIntake },
) {
  const ref = await addDoc(collection(db, `agencies/${agencyId}/clients`), {
    agencyId,
    // 어디서 온 고객인지. 접수에서 오면 점검 결과가 접수 기록으로 따라간다.
    source: origin?.source ?? { type: 'manual' },
    intake: origin?.intake ?? null,
    koreanClient: {
      name: data.name,
      birthDate: Timestamp.fromDate(data.birthDate),
      gender: data.gender,
      nationalIdMasked: '',
      phone: data.phone,
      address: data.address,
      maritalHistory: data.maritalHistory,
      incomeAnnual: data.incomeAnnual,
      occupation: data.occupation,
    },
    assignedStaffUid: uid,
    currentStage: 1,
    overallProgress: 0,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * 기본정보만 고친다. 필드 경로로 써서 nationalIdMasked 같은 나머지 값은 건드리지 않는다.
 * 규칙상 agencyId·automationConsents 외에는 업체 구성원이 바꿀 수 있다.
 */
export async function updateClientBasics(agencyId: string, clientId: string, data: ClientBasics) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
  await updateDoc(ref, {
    'koreanClient.name': data.name,
    'koreanClient.birthDate': Timestamp.fromDate(data.birthDate),
    'koreanClient.gender': data.gender,
    'koreanClient.phone': data.phone,
    'koreanClient.address': data.address,
    'koreanClient.maritalHistory': data.maritalHistory,
    'koreanClient.incomeAnnual': data.incomeAnnual,
    'koreanClient.occupation': data.occupation,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 종료(완료·취소)하거나 다시 진행 중으로 되돌린다. 문서는 지우지 않는다.
 * 완료는 혼인·비자까지 끝난 경우, 취소는 계약이 깨지거나 중단된 경우다.
 */
export async function setClientStatus(
  agencyId: string,
  clientId: string,
  status: Client['status'],
  reason?: string,
) {
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
  const closing = status !== 'active';
  await updateDoc(ref, {
    status,
    closedAt: closing ? serverTimestamp() : null,
    closeReason: closing ? (reason?.trim() || null) : null,
    updatedAt: serverTimestamp(),
  });
}
