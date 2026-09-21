// 업체 고객 목록·단건 구독과 고객 등록·기본정보 수정·종료 처리
import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
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
import { liveDoc, liveErrorMessage, liveQuery } from '@/lib/live';
import { ageOnDate, MINIMUM_INTRODUCTION_AGE } from '@/domain/introductionAge';
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

/**
 * 만 18세 미만은 고객으로도 받지 않는다.
 *
 * 조문은 「18세 미만인 사람을 소개하는 행위」를 금지할 뿐 소개되는 쪽을 가리지 않는다.
 * 엑셀 가져오기는 이미 거르고 있었는데(clientCsv.ts) 직접 등록은 그냥 들어왔다.
 * 들어오는 문을 하나로 맞춘다.
 */
function assertIntroducible(birthDate: Date) {
  const age = ageOnDate(birthDate);
  if (age < MINIMUM_INTRODUCTION_AGE) {
    throw new Error(
      `만 ${age}세입니다. 18세 미만은 소개할 수 없어 등록하지 않습니다. (결혼중개업법 제12조의2 ① 1호)`,
    );
  }
}

function clientDocument(
  clientId: string,
  agencyId: string,
  uid: string,
  data: ClientBasics,
  source: Client['source'] = { type: 'manual' },
  intake: CreateClientIntake | null = null,
  photoUrl: string | null = null,
) {
  return {
    clientId,
    agencyId,
    source,
    intake,
    photoUrl,
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const statusFilter = scope === 'active'
      ? where('status', '==', 'active')
      : where('status', 'in', ['completed', 'cancelled']);
    const q = query(
      collection(db, `agencies/${agencyId}/clients`),
      statusFilter,
      orderBy('updatedAt', 'desc'),
    );
    return liveQuery(
      '고객 목록',
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Client) })));
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId, scope]);

  return { items, loading, error };
}

export function useClient(clientId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [client, setClient] = useState<ClientListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId || !clientId) { setLoading(false); return; }
    setError(null);
    const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
    return liveDoc(
      '고객 상세',
      ref,
      (snap) => {
        setClient(snap.exists() ? { id: snap.id, ...(snap.data() as Client) } : null);
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId, clientId]);

  return { client, loading, error };
}

/**
 * CSV 가져오기 중복 확인용. 진행·종료 상태와 관계없이 전화번호만 모은다.
 *
 * 실시간 구독(onSnapshot)이 아니라 한 번만 읽는다. 예전에는 고객 목록 화면이
 * 뜨기만 하면 업체의 고객 전체를 살아있는 구독으로 끌고 있었다. 쓰는 곳은
 * 「엑셀 가져오기」 창 하나뿐인데, 명단이 큰 업체일수록 읽기 비용과 메모리가
 * 그대로 나갔다. 중복 확인은 파일을 고를 때 한 번이면 충분하다.
 */
export async function fetchClientPhones(agencyId: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, `agencies/${agencyId}/clients`));
  return snapshot.docs
    .map((item) => (item.data() as Client).koreanClient?.phone ?? '')
    .filter(Boolean);
}

/**
 * 등록 창이 저장 전에 사진을 올릴 수 있게 id를 미리 만든다.
 * 사진은 Storage 경로에 고객 id가 들어가므로 id 없이는 올릴 곳이 없다.
 */
export const newClientId = (agencyId: string) =>
  doc(collection(db, `agencies/${agencyId}/clients`)).id;

export async function createClient(
  agencyId: string,
  uid: string,
  data: ClientBasics,
  origin?: { source: Client['source']; intake: CreateClientIntake },
  /** 등록 창이 미리 잡아 둔 id와 먼저 올린 사진 */
  preset?: { clientId?: string; photoUrl?: string | null },
) {
  assertIntroducible(data.birthDate);
  const ref = preset?.clientId
    ? doc(db, `agencies/${agencyId}/clients/${preset.clientId}`)
    : doc(collection(db, `agencies/${agencyId}/clients`));
  await setDoc(
    ref,
    clientDocument(
      ref.id,
      agencyId,
      uid,
      data,
      origin?.source ?? { type: 'manual' },
      origin?.intake ?? null,
      preset?.photoUrl ?? null,
    ),
  );
  return ref.id;
}

/**
 * 기존 명단을 한 번에 옮긴다. 200명씩 나눠 쓰므로 Firestore의 배치 한도를 넘지 않는다.
 * 각 고객 문서가 만들어지면 기존 onClientCreated 함수가 법정의무 타임라인을 전개한다.
 */
export async function importClients(agencyId: string, uid: string, clients: ClientBasics[]) {
  for (const client of clients) assertIntroducible(client.birthDate);
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
export async function updateClientBasics(
  agencyId: string,
  clientId: string,
  data: ClientBasics,
  /** 넘기지 않으면 지금 사진을 그대로 둔다. null이면 사진을 뗀다 */
  photoUrl?: string | null,
) {
  assertIntroducible(data.birthDate);
  const ref = doc(db, `agencies/${agencyId}/clients/${clientId}`);
  await updateDoc(ref, {
    ...(photoUrl === undefined ? {} : { photoUrl }),
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
