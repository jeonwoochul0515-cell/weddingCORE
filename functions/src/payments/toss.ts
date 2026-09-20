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
import {
  CARAT_PACKS,
  MARKETING_SERVICES,
  isCaratPack,
  isMarketing,
} from '../domain/pricing.js';
import {
  grantPlan,
  marketingQuote,
  verifyOrder,
  type StoredOrder,
} from '../domain/orderCheck.js';

const REGION = 'asia-northeast3';
const TOSS_SECRET_KEY = defineSecret('TOSS_SECRET_KEY');
const CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const ORDER_LOOKUP_URL = 'https://api.tosspayments.com/v1/payments/orders';

export type OrderKind = 'carat' | 'marketing';

/** 주문번호. 토스는 6~64자를 요구하고 영문·숫자·하이픈만 안전하다. */
function newOrderId(kind: OrderKind): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wc-${kind}-${Date.now().toString(36)}-${rand}`;
}

/**
 * 주문을 만든다. 금액은 여기서 정해지고 이후 바뀌지 않는다.
 */
export const createPaymentOrder = onCall(
  { region: REGION, secrets: [TOSS_SECRET_KEY], timeoutSeconds: 30 },
  async (request) => {
    // 승인에 쓸 시크릿이 없으면 주문부터 막는다.
    // 결제창까지 갔다가 승인이 실패하면 돈이 빠져나갔다 취소되는 일이 생긴다.
    const secret = process.env.TOSS_SECRET_KEY;
    if (!secret || secret === 'NOT_CONFIGURED') {
      throw new HttpsError(
        'failed-precondition',
        '카드 결제가 아직 열리지 않았습니다. 계좌이체로 신청해 주세요.',
      );
    }

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

    // 판정과 「지금 내가 승인한다」 표시를 한 트랜잭션에서 끝낸다.
    // 읽고 나서 따로 쓰면, 같은 주문으로 두 번 들어왔을 때 둘 다 pending을 보고
    // 둘 다 토스로 간다. 하나는 지급하고 하나는 이미 처리됐다는 오류를 받아
    // 끝난 주문을 failed로 덮어쓴다.
    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw new HttpsError('not-found', '주문을 찾을 수 없습니다.');
      const stored = snap.data() as StoredOrder;

      // 판정은 domain/orderCheck가 한다. 여기서는 그 결과대로 움직인다.
      const verdict = verifyOrder(stored, amount);
      if (verdict.action === 'already-paid') return { order: stored, verdict };
      if (verdict.action === 'reject') return { order: stored, verdict };

      tx.update(orderRef, {
        status: 'confirming',
        confirmStartedAt: FieldValue.serverTimestamp(),
      });
      return { order: stored, verdict };
    });

    const order = claim.order;
    if (claim.verdict.action === 'already-paid') {
      // 새로고침이나 재요청으로 두 번 들어올 수 있다. 두 번 지급하지 않는다.
      // 상품 정보는 같이 돌려준다 — 안 그랬다가 새로고침한 사람에게만 「신청이 접수됐습니다」가
      // 뜨고 충전된 캐럿 수가 안 보인다.
      return {
        ok: true,
        alreadyPaid: true,
        kind: order.kind,
        label: order.label,
        carats: order.carats,
      };
    }
    if (claim.verdict.action === 'reject') {
      logger.error('결제 승인 거부', {
        orderId,
        reason: claim.verdict.reason,
        expected: order.amount,
        received: amount,
        status: order.status,
      });
      throw new HttpsError('invalid-argument', claim.verdict.message);
    }

    const auth = Buffer.from(`${secret}:`).toString('base64');
    let res = await fetch(CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: order.amount }),
    });
    let body = (await res.json()) as Record<string, unknown>;

    // 이미 승인된 결제다. 지급 전에 끊긴 것을 다시 시도했거나 두 번 들어왔다는 뜻이다.
    // 여기서 그냥 실패로 적으면 손님 카드에서는 돈이 빠졌는데 물건은 안 들어간다.
    // 토스에 주문번호로 다시 물어 실제로 난 결제면 지급을 이어서 한다.
    if (!res.ok && body.code === 'ALREADY_PROCESSED_PAYMENT') {
      const lookup = await fetch(`${ORDER_LOOKUP_URL}/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const found = (await lookup.json()) as Record<string, unknown>;
      if (lookup.ok && found.status === 'DONE' && Number(found.totalAmount) === order.amount) {
        logger.warn('이미 승인된 결제를 복구해 지급한다', { orderId });
        res = lookup;
        body = found;
      }
    }

    if (!res.ok) {
      // 다른 호출이 먼저 지급을 끝냈을 수 있다. 끝난 주문을 failed로 덮지 않는다.
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(orderRef);
        if ((fresh.data()?.status as string) === 'paid') return;
        tx.update(orderRef, {
          status: 'failed',
          failReason: String(body.message ?? '승인 실패'),
          failedAt: FieldValue.serverTimestamp(),
        });
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
        // 복구 경로에서는 토스가 돌려준 키가 정본이다. 클라이언트가 보낸 것은 보조로만 쓴다.
        paymentKey: String(body.paymentKey ?? paymentKey),
        method: String(body.method ?? ''),
        approvedAt: String(body.approvedAt ?? ''),
        receiptUrl: String((body.receipt as { url?: string } | undefined)?.url ?? ''),
        paidAt: FieldValue.serverTimestamp(),
      });

      const plan = grantPlan(order);

      if (plan.addCarats > 0) {
        // 충전분은 aiCredits.purchased에 더한다. 월초에 소멸하지 않는 몫이다.
        // (automation/index.ts의 consumeCredits가 이 필드를 읽는다)
        tx.update(agencyRef, {
          'aiCredits.purchased': FieldValue.increment(plan.addCarats),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // 마케팅은 지급할 잔고가 없다. 담당자가 처리할 신청서를 만드는 것이 지급이다.
      // 이게 없으면 돈만 받고 주문이 사라진다. 무료 상담 요청(MarketingCenterPage)과
      // 같은 marketingRequests 컬렉션에 쌓아 담당자가 한 곳에서 본다.
      if (plan.createMarketingRequest) {
        tx.set(db.collection(`agencies/${agencyId}/marketingRequests`).doc(), {
          agencyId,
          services: [order.itemId],
          quote: {
            promotion: '카드 결제',
            ...marketingQuote(order),
            currency: 'KRW',
            vatIncluded: true,
          },
          keywords: [],
          note: `카드 결제 완료 — ${order.label}`,
          status: 'requested',
          // 결제로 들어온 신청은 상담 요청과 구분한다. 담당자가 먼저 처리해야 한다.
          paid: true,
          orderId,
          paidAmount: order.amount,
          billing: order.billing,
          requestedBy: uid,
          createdAt: FieldValue.serverTimestamp(),
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
