// 업체 고객 목록·단건 구독과 고객 등록·기본정보 수정·종료 처리
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
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

function clientDocument(
  clientId: string,
  agencyId: string,
  uid: string,
  data: ClientBasics,
  source: Client['source'] = { type: 'manual' },
  intake: CreateClientIntake | null = null,
) {
  return {
    clientId,
    agencyId,
    source,
    intake,
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
  };
}

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

/** CSV 가져오기 중복 확인용. 진행·종료 상태와 관계없이 전화번호만 가볍게 모은다. */
export function useAgencyClientPhones() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [phones, setPhones] = useState<string[]>([]);

  useEffect(() => {
    if (!agencyId) return;
    return onSnapshot(collection(db, `agencies/${agencyId}/clients`), (snapshot) => {
      setPhones(snapshot.docs.map((item) => (item.data() as Client).koreanClient?.phone ?? '').filter(Boolean));
    });
  }, [agencyId]);

  return phones;
}

export async function createClient(
  agencyId: string,
  uid: string,
  data: ClientBasics,
  origin?: { source: Client['source']; intake: CreateClientIntake },
) {
  const ref = doc(collection(db, `agencies/${agencyId}/clients`));
  await setDoc(
    ref,
    clientDocument(
      ref.id,
      agencyId,
      uid,
      data,
      origin?.source ?? { type: 'manual' },
      origin?.intake ?? null,
    ),
  );
  return ref.id;
}

/**
 * 기존 명단을 한 번에 옮긴다. 200명씩 나눠 쓰므로 Firestore의 배치 한도를 넘지 않는다.
 * 각 고객 문서가 만들어지면 기존 onClientCreated 함수가 법정의무 타임라인을 전개한다.
 */
export async function importClients(agencyId: string, uid: string, clients: ClientBasics[]) {
  const chunkSize = 200;
  for (let start = 0; start < clients.length; start += chunkSize) {
    const batch = writeBatch(db);
    for (const client of clients.slice(start, start + chunkSize)) {
      const ref = doc(collection(db, `agencies/${agencyId}/clients`));
      batch.set(
        ref,
        clientDocument(ref.id, agencyId, uid, client, { type: 'manual', via: 'csv_import' }),
      );
    }
    await batch.commit();
  }
  return clients.length;
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
