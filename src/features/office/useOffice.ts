// 업체 자체에 붙는 자료 — 통역자·현지 파트너·처분 이력·결격사유·사무소
//
// 지금까지 시스템은 고객 단위로만 짜여 있었다. 그런데 우리가 모은 판례·재결례·해석이
// 가리키는 위험의 상당수는 고객이 아니라 **업체에 붙는다.**
//
//  - 통역자   : 자격 있는 사람을 쓰고 이해관계인을 배제해야 한다(의무 24번). 재결례에서
//               "상대방이 직원의 친척이라 신원에 문제없다고 보았다"는 항변이 기각된 바 있다.
//  - 현지 파트너: 그 나라가 결혼중개업을 금지하면 서면계약을 해도 제휴 대상이 아니다
//               (여성가족부 법령해석, 2011).
//  - 처분 이력 : 위반 횟수는 등록 관청이 바뀌어도 이어진다(재결례, 2012). 다음 처분 수위를
//               알려면 업체가 스스로 기록해야 한다.
//  - 결격사유 : 벌금형 확정이 등록취소로 이어진 사건이 둘. 대표뿐 아니라 종업원도 대상이다.
//  - 사무소   : 국제결혼중개업 자본금 1억원은 법인 전체가 아니라 사무소마다다(법령해석, 2012).
//
// 모두 `agencies/{aid}` 아래 컬렉션으로 둔다. 고객과 무관하게 업체가 관리하는 자료다.

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

// ── 통역자 ────────────────────────────────────────────────

export type Interpreter = {
  id: string;
  name: string;
  phone: string;
  /** 통역 가능 언어. 자유 입력으로 두어 소수 언어도 담는다 */
  languages: string;
  /** 자격 (TOPIK, 통번역 자격증, 현지 공인 등) */
  certification: string;
  affiliation: string;
  /**
   * 이해관계 없음을 확인했는가.
   * 상대방·현지 업체와 친족이거나 고용 관계면 배제해야 한다.
   */
  conflictChecked: boolean;
  conflictNote: string;
  active: boolean;
  createdAt?: Timestamp;
};

// ── 현지 파트너 ───────────────────────────────────────────

/** 그 나라에서 결혼중개업이 허용되는지. 금지국이면 제휴 자체가 안 된다 */
export type PartnerLegalStatus = 'allowed' | 'banned' | 'unknown';

export const PARTNER_STATUS_LABEL: Record<PartnerLegalStatus, string> = {
  allowed: '허용 확인',
  banned: '금지 국가',
  unknown: '확인 안 됨',
};

export type LocalPartner = {
  id: string;
  companyName: string;
  country: string;
  contactName: string;
  contactInfo: string;
  /** 서면계약을 체결했는가 (법 제14조의2 제1항) */
  writtenContract: boolean;
  contractedAt: Timestamp | null;
  legalStatus: PartnerLegalStatus;
  /** 무엇으로 확인했는지 남긴다 */
  statusEvidence: string;
  statusCheckedAt: Timestamp | null;
  active: boolean;
  note: string;
  createdAt?: Timestamp;
};

// ── 행정처분 이력 ─────────────────────────────────────────

export type SanctionKind = 'suspension' | 'registration_cancel' | 'fine' | 'warning' | 'other';

export const SANCTION_KIND_LABEL: Record<SanctionKind, string> = {
  suspension: '영업정지',
  registration_cancel: '등록취소',
  fine: '과태료·범칙금',
  warning: '경고·행정지도',
  other: '기타',
};

export type Sanction = {
  id: string;
  kind: SanctionKind;
  /** 처분한 관청. 관청이 바뀌어도 횟수는 이어진다 */
  authority: string;
  reason: string;
  /** 근거 조문 */
  article: string;
  disposedOn: Timestamp;
  /** 영업정지 기간(일). 해당 없으면 null */
  suspensionDays: number | null;
  /** 다퉜는가 */
  appealed: boolean;
  appealResult: string;
  note: string;
  createdAt?: Timestamp;
};

// ── 결격사유 점검 ─────────────────────────────────────────

export type PersonRole = 'representative' | 'staff';

export const PERSON_ROLE_LABEL: Record<PersonRole, string> = {
  representative: '대표',
  staff: '종사자',
};

export type DisqualCheck = {
  id: string;
  name: string;
  role: PersonRole;
  /** 결격사유에 해당하는가 */
  disqualified: boolean;
  /** 확인한 내용 (범죄경력 조회 결과 등) */
  basis: string;
  checkedOn: Timestamp;
  /** 다음 확인 예정일. 채용·갱신 주기에 맞춘다 */
  nextCheckOn: Timestamp | null;
  note: string;
  createdAt?: Timestamp;
};

// ── 사무소 ────────────────────────────────────────────────

export type Office = {
  id: string;
  name: string;
  /** 등록번호 */
  registrationNo: string;
  /** 등록 관청 */
  authority: string;
  address: string;
  registeredOn: Timestamp | null;
  /** 이 사무소 몫으로 갖춘 자본금 (국제결혼중개업은 사무소마다 1억원) */
  capital: number;
  isInternational: boolean;
  active: boolean;
  note: string;
  createdAt?: Timestamp;
};

// ── 공통 훅 ───────────────────────────────────────────────

type Collections = {
  interpreters: Interpreter;
  localPartners: LocalPartner;
  sanctions: Sanction;
  disqualChecks: DisqualCheck;
  offices: Office;
};

const ORDER_FIELD: Record<keyof Collections, string> = {
  interpreters: 'name',
  localPartners: 'companyName',
  sanctions: 'disposedOn',
  disqualChecks: 'checkedOn',
  offices: 'name',
};

export function useOfficeCollection<K extends keyof Collections>(name: K) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<Collections[K][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, `agencies/${agencyId}/${name}`), orderBy(ORDER_FIELD[name]));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Collections[K]));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [agencyId, name]);

  return { items, loading };
}

export async function addOfficeItem(
  agencyId: string,
  name: keyof Collections,
  data: Record<string, unknown>,
) {
  await addDoc(collection(db, `agencies/${agencyId}/${name}`), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateOfficeItem(
  agencyId: string,
  name: keyof Collections,
  id: string,
  data: Record<string, unknown>,
) {
  await updateDoc(doc(db, `agencies/${agencyId}/${name}/${id}`), data);
}

export async function removeOfficeItem(agencyId: string, name: keyof Collections, id: string) {
  await deleteDoc(doc(db, `agencies/${agencyId}/${name}/${id}`));
}

/** 지금 위험한 상태인지 한 줄로 알려준다 */
export function officeWarnings(input: {
  interpreters: Interpreter[];
  partners: LocalPartner[];
  offices: Office[];
}): string[] {
  const out: string[] = [];

  const uncheckedInterp = input.interpreters.filter((i) => i.active && !i.conflictChecked);
  if (uncheckedInterp.length > 0) {
    out.push(
      `통역자 ${uncheckedInterp.length}명의 이해관계 확인이 남아 있습니다. 상대방·현지 업체와 친족이거나 고용 관계면 배제해야 합니다.`,
    );
  }

  const banned = input.partners.filter((p) => p.active && p.legalStatus === 'banned');
  if (banned.length > 0) {
    out.push(
      `결혼중개업이 금지된 국가의 파트너 ${banned.length}곳이 활성 상태입니다. 서면계약을 맺어도 업무제휴 대상이 아니라는 해석이 있습니다.`,
    );
  }

  const unknown = input.partners.filter((p) => p.active && p.legalStatus === 'unknown');
  if (unknown.length > 0) {
    out.push(`현지 파트너 ${unknown.length}곳의 그 나라 허용 여부가 확인되지 않았습니다.`);
  }

  const noContract = input.partners.filter((p) => p.active && !p.writtenContract);
  if (noContract.length > 0) {
    out.push(`서면계약이 없는 현지 파트너가 ${noContract.length}곳 있습니다(법 제14조의2).`);
  }

  const shortCapital = input.offices.filter(
    (o) => o.active && o.isInternational && (o.capital ?? 0) < 100_000_000,
  );
  if (shortCapital.length > 0) {
    out.push(
      `국제결혼중개업 사무소 ${shortCapital.length}곳의 자본금이 1억원에 못 미칩니다. 자본금은 사무소마다 갖춰야 한다는 해석이 있습니다.`,
    );
  }

  return out;
}
