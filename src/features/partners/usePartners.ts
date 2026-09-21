// 외국인 후보 명부 — 고객에 매달리지 않는 업체 단위 명부
//
// 왜 따로 두나
//   지금까지 상대방은 `clients/{고객}/partners/{상대}` 아래 있었다. 그래서 "이 손님에게
//   맞는 후보를 찾는다"가 불가능했고 매칭 화면에 이름을 손으로 쳤다.
//   후보는 고객보다 먼저 존재하고 여러 고객에게 소개된다. 업체 단위로 두는 것이 맞다.
import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';
import { ageOfDateString, ageOnDate, isIntroducible } from '@/domain/introductionAge';
import { useAuthStore } from '@/store/authStore';

/** 지금 이 후보를 소개할 수 있는가 */
export type PartnerStatus = 'available' | 'introducing' | 'matched' | 'paused';

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  available: '소개 가능',
  introducing: '소개 중',
  matched: '성사',
  paused: '중단',
};

export const PARTNER_STATUS_CLASS: Record<PartnerStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700',
  introducing: 'bg-sky-50 text-sky-700',
  matched: 'bg-violet-50 text-violet-700',
  paused: 'bg-slate-100 text-slate-500',
};

export type Partner = {
  partnerId: string;
  agencyId: string;
  name: string;
  nationality: string;
  birthDate: Timestamp | null;
  gender: 'M' | 'F' | '';
  region: string;
  occupation: string;
  education: string;
  religion: string;
  maritalHistory: string;
  languages: string;
  height: number | null;
  /**
   * 몸무게. 현지 프로필 카드에 항상 적혀 오고, 키와 같이 봐야 건강 진술이
   * 자료와 어긋나는지 볼 수 있다. 메모에만 적어 두면 아무도 안 본다.
   */
  weight: number | null;
  /** 어느 현지 업체를 통해 소개받았는가. 업체 정보의 현지 파트너와 이어 둔다 */
  localPartner: string;
  memo: string;
  status: PartnerStatus;
  photoUrl: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type PartnerItem = Partner & { id: string };

/** 화면 폼이 다루는 값. 날짜는 문자열로 받고 저장할 때 바꾼다 */
export type PartnerForm = {
  name: string;
  nationality: string;
  birthDate: string;
  gender: 'M' | 'F' | '';
  region: string;
  occupation: string;
  education: string;
  religion: string;
  maritalHistory: string;
  languages: string;
  height: string;
  weight: string;
  localPartner: string;
  memo: string;
  status: PartnerStatus;
};

export const EMPTY_PARTNER: PartnerForm = {
  name: '', nationality: '', birthDate: '', gender: '', region: '', occupation: '',
  education: '', religion: '', maritalHistory: '', languages: '', height: '', weight: '',
  localPartner: '', memo: '', status: 'available',
};

export function usePartners() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return; }
    setError(null);
    const q = query(collection(db, `agencies/${agencyId}/partners`), orderBy('name'));
    return liveQuery(
      '외국인 후보 명부',
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Partner) })));
        setLoading(false);
      },
      (err) => { setError(liveErrorMessage(err)); setLoading(false); },
    );
  }, [agencyId]);

  return { items, loading, error };
}

function toDoc(agencyId: string, id: string, form: PartnerForm, photoUrl: string | null) {
  return {
    partnerId: id,
    agencyId,
    name: form.name.trim(),
    nationality: form.nationality.trim(),
    birthDate: form.birthDate ? Timestamp.fromDate(new Date(form.birthDate)) : null,
    gender: form.gender,
    region: form.region.trim(),
    occupation: form.occupation.trim(),
    education: form.education.trim(),
    religion: form.religion.trim(),
    maritalHistory: form.maritalHistory.trim(),
    languages: form.languages.trim(),
    height: form.height ? Number(form.height) : null,
    weight: form.weight ? Number(form.weight) : null,
    localPartner: form.localPartner.trim(),
    memo: form.memo.trim(),
    status: form.status,
    photoUrl,
    updatedAt: serverTimestamp(),
  };
}

/** 문서 id를 먼저 만든다. 사진을 그 id 아래 올려야 해서 저장 전에 id가 필요하다 */
export const newPartnerId = (agencyId: string) =>
  doc(collection(db, `agencies/${agencyId}/partners`)).id;

export async function savePartner(
  agencyId: string,
  id: string,
  form: PartnerForm,
  photoUrl: string | null,
  isNew: boolean,
) {
  // 법 제12조의2 ① 1호는 18세 미만 소개를 금지한다. 명부에 올려 두면 언젠가 소개된다 —
  // 경고만 띄우고 저장을 허용하면 막은 것이 아니다. 화면이 먼저 걸러내지만 여기서도 막는다.
  const age = ageOfDateString(form.birthDate);
  if (!isIntroducible(age)) {
    throw new Error(
      age === null
        ? '생년월일을 여권에 적힌 대로 넣어 주세요. 나이를 확인하지 않은 후보는 등록할 수 없습니다.'
        : `만 ${age}세입니다. 18세 미만은 소개할 수 없어 명부에 올리지 않습니다. (결혼중개업법 제12조의2 ① 1호)`,
    );
  }
  const ref = doc(db, `agencies/${agencyId}/partners/${id}`);
  const data = toDoc(agencyId, id, form, photoUrl);
  if (isNew) await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  else await updateDoc(ref, data);
}

export async function removePartner(agencyId: string, id: string) {
  await deleteDoc(doc(db, `agencies/${agencyId}/partners/${id}`));
}

/** 생년월일에서 만 나이. 화면 곳곳에서 쓴다 */
export function ageOf(birth: Timestamp | null | undefined): number | null {
  const d = birth?.toDate?.();
  if (!d) return null;
  return ageOnDate(d);
}
