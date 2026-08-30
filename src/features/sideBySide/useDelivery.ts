// 신상정보를 언제 누구에게 어떻게 줬는지 기록한다 — 처분을 가르는 지점이다
//
// 왜 필요한가. 우리가 모은 자료가 한 곳을 가리킨다.
//  - 대법원 2018도7989 — 제공 의무는 "이용자와 상대방이 만나기 이전"에 이행해야 한다.
//  - 재결례 4건 — 통역이 설명했다·나중에 번역해 줬다는 항변이 모두 기각됐고
//    영업정지 45일에서 3개월이 유지됐다.
//  - 실태조사 — 이용자와 외국인 배우자 양쪽이 꼽은 피해 1위가 "상대방 정보 확인 소홀"이다.
//
// 그런데 지금까지는 서류 업로드 시각으로 제공 시점을 짐작했다. 업로드는 제공이 아니다.
// 실제로 언제 건넸고 상대가 받았다고 확인했는지를 남겨야 다툴 때 근거가 된다.

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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { SupportedLang } from './fields';
import type { BackgroundSubject } from './useBackgroundInfo';

/** 어떻게 건넸는가. 대면 교부가 가장 안전하고, 그 외는 수령 증빙을 함께 남긴다. */
export type DeliveryMethod = 'in_person' | 'email' | 'post' | 'messenger' | 'other';

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  in_person: '대면 교부',
  email: '전자우편',
  post: '우편',
  messenger: '메신저',
  other: '기타',
};

export type DeliveryRecord = {
  id: string;
  /** 이 신상정보를 누구에게 줬는가 (신상정보의 subject와 반대편이 원칙) */
  to: BackgroundSubject;
  /** 어떤 언어본을 줬는가 */
  lang: SupportedLang;
  method: DeliveryMethod;
  /** 실제로 건넨 시각. 업로드 시각과 다르다 */
  deliveredAt: Timestamp;
  /** 받았다고 확인받았는가 */
  receiptConfirmed: boolean;
  receiptSignerName: string | null;
  /** 수령확인서·서명본 등 증빙 파일 */
  receiptEvidenceUrl: string | null;
  /** 내용을 설명했는가. 서면 교부만으로 끝나지 않는다 */
  explained: boolean;
  explainedBy: string | null;
  note: string;
  recordedBy: string;
  recordedAt: Timestamp;
};

export function useDeliveries(clientId: string | undefined, infoId: string | undefined) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [items, setItems] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId || !clientId || !infoId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(
        db,
        `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}/deliveries`,
      ),
      orderBy('deliveredAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeliveryRecord, 'id'>) })));
      setLoading(false);
    });
    return () => unsub();
  }, [agencyId, clientId, infoId]);

  return { items, loading };
}

export async function addDelivery(params: {
  agencyId: string;
  clientId: string;
  infoId: string;
  to: BackgroundSubject;
  lang: SupportedLang;
  method: DeliveryMethod;
  deliveredAt: Date;
  receiptConfirmed: boolean;
  receiptSignerName: string | null;
  explained: boolean;
  explainedBy: string | null;
  note: string;
  recordedBy: string;
}) {
  const { agencyId, clientId, infoId, deliveredAt, ...rest } = params;
  await addDoc(
    collection(db, `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}/deliveries`),
    {
      ...rest,
      deliveredAt: Timestamp.fromDate(deliveredAt),
      receiptEvidenceUrl: null,
      recordedAt: serverTimestamp(),
    },
  );
}

export async function removeDelivery(params: {
  agencyId: string;
  clientId: string;
  infoId: string;
  deliveryId: string;
}) {
  const { agencyId, clientId, infoId, deliveryId } = params;
  await deleteDoc(
    doc(
      db,
      `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}/deliveries/${deliveryId}`,
    ),
  );
}

/** 제공 기록을 맞선일과 대조해 무엇이 문제인지 알려준다 */
export type DeliveryCheck = {
  level: 'ok' | 'warning' | 'critical';
  message: string;
};

export function checkDelivery(input: {
  records: DeliveryRecord[];
  meetingAt: Date | null;
}): DeliveryCheck {
  const { records, meetingAt } = input;

  if (records.length === 0) {
    return {
      level: 'critical',
      message: '제공 기록이 없습니다. 서류를 만들어 둔 것과 실제로 건넨 것은 다릅니다.',
    };
  }

  if (!meetingAt) {
    return {
      level: 'warning',
      message: '맞선 예정일이 기록되지 않아 제공 시점이 맞는지 확인할 수 없습니다.',
    };
  }

  const before = records.filter((r) => r.deliveredAt.toDate().getTime() <= meetingAt.getTime());
  if (before.length === 0) {
    return {
      level: 'critical',
      message:
        '모든 제공이 맞선일 이후입니다. 대법원은 만남 이전에 이행할 의무로 보았습니다(2018도7989).',
    };
  }

  const confirmed = before.filter((r) => r.receiptConfirmed);
  if (confirmed.length === 0) {
    return {
      level: 'warning',
      message: '맞선 전에 건넸으나 수령 확인이 없습니다. 다툴 때 증빙이 되지 못할 수 있습니다.',
    };
  }

  const explained = confirmed.filter((r) => r.explained);
  if (explained.length === 0) {
    return {
      level: 'warning',
      message:
        '수령 확인은 있으나 설명 기록이 없습니다. 서면 교부만으로는 부족하다고 다뤄진 사건이 있습니다.',
    };
  }

  return { level: 'ok', message: '맞선 전 제공·수령 확인·설명이 모두 기록되어 있습니다.' };
}
