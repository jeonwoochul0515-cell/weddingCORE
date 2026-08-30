// 토스페이먼츠 결제 — 주문을 서버가 만들고, 승인도 서버가 확인한다
//
// 지키는 선이 하나 있다. **금액은 클라이언트가 정하지 않는다.**
// 결제창에 넘길 금액도, 승인할 금액도 서버가 저장한 주문에서 읽는다. 클라이언트가 보낸
// 금액은 대조에만 쓰고 다르면 승인하지 않는다. 이걸 어기면 값을 바꿔 결제하는 공격이 통한다.
//
// 흐름
//   1) createPaymentOrder — 업체가 상품을 고르면 서버가 금액을 정하고 주문을 만든다
//   2) 클라이언트가 토스 결제창을 띄운다(주문번호와 금액은 1에서 받은 것)
//   3) confirmPayment — 결제 후 돌아온 paymentKey로 토스에 승인을 요청하고,
//      성공하면 상품을 지급한다(캐럿 충전, 마케팅 신청 접수)
//
// 키가 없으면 결제 기능 자체를 끈다. 하드코딩한 테스트 키로 운영에 나가는 일이 없어야 한다.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const REGION = 'asia-northeast3';
const TOSS_SECRET_KEY = defineSecret('TOSS_SECRET_KEY');
const CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

/** 캐럿 팩. 1캐럿 = 1,000원이고 대량 구매에만 할인을 준다. */
export const CARAT_PACKS = {
  pack_50: { label: '50캐럿', carats: 50, amount: 50_000 },
  pack_200: { label: '200캐럿', carats: 200, amount: 180_000 },
  pack_500: { label: '500캐럿', carats: 500, amount: 400_000 },
} as const;

/**
 * 마케팅 서비스. 화면(MarketingCenterPage)과 금액이 같아야 한다.
 * 정본은 여기다 — 화면 값을 고쳤는데 여기를 안 고치면 결제가 막힌다.
 */
export const MARKETING_SERVICES = {
  'naver-seo': { label: '네이버 검색노출·플레이스 광고 최적화', amount: 500_000, billing: 'once' },
  'local-content': { label: '블로그 글 자동 발행', amount: 100_000, billing: 'monthly' },
  'aeo-geo': { label: 'AEO·GEO 콘텐츠 설계', amount: 500_000, billing: 'once' },
  // website(홈페이지 제작)는 회원 무료라 결제 대상이 아니다.
} as const;

type CaratPackId = keyof typeof CARAT_PACKS;
type MarketingId = keyof typeof MARKETING_SERVICES;

export type OrderKind = 'carat' | 'marketing';

const isCaratPack = (v: string): v is CaratPackId => v in CARAT_PACKS;
const isMarketing = (v: string): v is MarketingId => v in MARKETING_SERVICES;

/** 주문번호. 토스는 6~64자를 요구하고 영문·숫자·하이픈만 안전하다. */
function newOrderId(kind: OrderKind): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wc-${kind}-${Date.now().toString(36)}-${rand}`;
}

/**
 * 주문을 만든다. 금액은 여기서 정해지고 이후 바뀌지 않는다.
 */
export const createPaymentOrder = onCall(
  { region: REGION, timeoutSeconds: 30 },
  async (request) => {
    const uid = request.auth?.uid;
    const agencyId = request.auth?.token?.agencyId as string | undefined;
    const role = request.auth?.token?.role as string | undefined;
    if (!uid || !agencyId) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    if (!['owner', 'manager'].includes(role ?? '')) {
      throw new HttpsError('permission-denied', '결제는 대표 또는 관리자만 할 수 있습니다.');
    }

    const { kind, itemId } = request.data as { kind?: string; itemId?: string };
    if (kind !== 'carat' && kind !== 'marketing') {
      throw new HttpsError('invalid-argument', '주문 종류가 올바르지 않습니다.');
    }
    const id = String(itemId ?? '');

    let amount: number;
    let label: string;
    let carats: number | null = null;
    let billing: 'once' | 'monthly' = 'once';

    if (kind === 'carat') {
      if (!isCaratPack(id)) throw new HttpsError('invalid-argument', '없는 캐럿 팩입니다.');
      const pack = CARAT_PACKS[id];
      amount = pack.amount;
      label = pack.label;
      carats = pack.carats;
    } else {
      if (!isMarketing(id)) throw new HttpsError('invalid-argument', '없는 서비스입니다.');
      const svc = MARKETING_SERVICES[id];
      amount = svc.amount;
      label = svc.label;
      billing = svc.billing;
    }

    const orderId = newOrderId(kind);
    await getFirestore().doc(`agencies/${agencyId}/payments/${orderId}`).set({
      orderId,
      kind,
      itemId: id,
      label,
      amount,
      carats,
      billing,
      status: 'pending',
      requestedBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId, amount, label, orderName: label };
  },
);

/**
 * 결제를 승인하고 상품을 지급한다.
 * 승인 요청과 지급은 같은 호출 안에서 끝낸다. 승인만 되고 지급이 빠지면 돈만 받은 꼴이 된다.
 */
export const confirmPayment = onCall(
  { region: REGION, secrets: [TOSS_SECRET_KEY], timeoutSeconds: 60 },
  async (request) => {
    const uid = request.auth?.uid;
    const agencyId = request.auth?.token?.agencyId as string | undefined;
    if (!uid || !agencyId) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 시크릿은 배포를 위해 자리만 만들어 둘 수 있다. 자리표시 값이면 결제를 열지 않는다.
    // (firebase가 defineSecret 된 시크릿이 없으면 배포 자체를 막는다)
    const secret = process.env.TOSS_SECRET_KEY;
    if (!secret || secret === 'NOT_CONFIGURED') {
      throw new HttpsError(
        'failed-precondition',
        '결제 설정이 아직 없습니다. 관리자에게 문의해 주세요.',
      );
    }

    const { paymentKey, orderId, amount } = request.data as {
      paymentKey?: string;
      orderId?: string;
      amount?: number;
    };
    if (!paymentKey || !orderId || typeof amount !== 'number') {
      throw new HttpsError('invalid-argument', '결제 정보가 올바르지 않습니다.');
    }

    const db = getFirestore();
    const orderRef = db.doc(`agencies/${agencyId}/payments/${orderId}`);
    const snap = await orderRef.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', '주문을 찾을 수 없습니다.');
    }
    const order = snap.data() as {
      amount: number;
      status: string;
      kind: OrderKind;
      carats: number | null;
      label: string;
    };

    if (order.status === 'paid') {
      // 새로고침이나 재요청으로 두 번 들어올 수 있다. 두 번 지급하지 않는다.
      return { ok: true, alreadyPaid: true };
    }
    // ★ 금액은 서버 주문이 정본이다. 클라이언트가 보낸 값과 다르면 승인하지 않는다.
    if (order.amount !== amount) {
      logger.error('결제 금액 불일치', { orderId, expected: order.amount, received: amount });
      throw new HttpsError('invalid-argument', '결제 금액이 주문과 다릅니다.');
    }

    const auth = Buffer.from(`${secret}:`).toString('base64');
    const res = await fetch(CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: order.amount }),
    });
    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      await orderRef.update({
        status: 'failed',
        failReason: String(body.message ?? '승인 실패'),
        failedAt: FieldValue.serverTimestamp(),
      });
      logger.error('토스 승인 실패', { orderId, code: body.code, message: body.message });
      throw new HttpsError('aborted', String(body.message ?? '결제 승인에 실패했습니다.'));
    }

    // 승인 성공 — 주문을 닫고 상품을 지급한다
    const agencyRef = db.doc(`agencies/${agencyId}`);
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(orderRef);
      if ((fresh.data()?.status as string) === 'paid') return;

      tx.update(orderRef, {
        status: 'paid',
        paymentKey,
        method: String(body.method ?? ''),
        approvedAt: String(body.approvedAt ?? ''),
        receiptUrl: String((body.receipt as { url?: string } | undefined)?.url ?? ''),
        paidAt: FieldValue.serverTimestamp(),
      });

      if (order.kind === 'carat' && order.carats) {
        // 충전분은 aiCredits.purchased에 더한다. 월초에 소멸하지 않는 몫이다.
        // (automation/index.ts의 consumeCredits가 이 필드를 읽는다)
        tx.update(agencyRef, {
          'aiCredits.purchased': FieldValue.increment(order.carats),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    logger.info('결제 승인 완료', { orderId, kind: order.kind, amount: order.amount });
    return {
      ok: true,
      kind: order.kind,
      label: order.label,
      carats: order.carats,
      receiptUrl: String((body.receipt as { url?: string } | undefined)?.url ?? ''),
    };
  },
);
