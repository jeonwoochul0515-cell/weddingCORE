// 결제 주문 판정
//
// 왜 떼어냈나. 이 판정이 무너지면 돈이 샌다. 그런데 confirmPayment 안에서는 Firestore와
// 토스 API에 묶여 있어 검증하려면 둘 다 띄워야 한다. 그러면 아무도 검증하지 않게 된다.
//
// 지키는 선 두 가지.
//   1) 금액은 서버 주문이 정본이다. 클라이언트가 보낸 값은 대조에만 쓴다.
//      이걸 어기면 값을 바꿔 결제하는 공격이 통한다.
//   2) 같은 주문에 두 번 지급하지 않는다. 새로고침이나 재요청으로 두 번 들어올 수 있다.
//   3) 승인까지 갔다가 지급에서 넘어진 주문(confirming)은 다시 시도할 수 있어야 한다.
//      이걸 막으면 돈은 빠져나갔는데 물건은 영영 안 들어간다.

export type StoredOrder = {
  amount: number;
  status: string;
  kind: 'carat' | 'marketing';
  carats: number | null;
  label: string;
  itemId: string;
  billing: 'once' | 'monthly';
};

export type OrderVerdict =
  /** 이미 지급이 끝났다. 아무것도 하지 않고 성공으로 돌려준다 */
  | { action: 'already-paid' }
  /** 승인을 진행한다 */
  | { action: 'proceed' }
  /** 거부한다. reason은 로그용, message는 사용자에게 보일 말이다 */
  | { action: 'reject'; reason: 'amount-mismatch' | 'bad-status'; message: string };

/**
 * 승인 요청을 받아들일지 판정한다.
 *
 * amount는 클라이언트(결제 성공 후 리디렉트의 쿼리스트링)에서 온 값이라 믿지 않는다.
 * 주소창을 고쳐 금액을 바꿀 수 있으므로, 저장된 주문과 다르면 승인하지 않는다.
 */
export function verifyOrder(order: StoredOrder, claimedAmount: number): OrderVerdict {
  if (order.status === 'paid') return { action: 'already-paid' };

  // pending이 아닌 상태(failed, cancelled 등)는 다시 승인하지 않는다.
  // confirming은 예외다 — 승인 요청을 보낸 뒤 지급 전에 끊긴 주문이라,
  // 다시 불러 마저 지급해야 한다.
  if (order.status !== 'pending' && order.status !== 'confirming') {
    return {
      action: 'reject',
      reason: 'bad-status',
      message: '이미 처리되었거나 승인할 수 없는 주문입니다.',
    };
  }

  if (order.amount !== claimedAmount) {
    return {
      action: 'reject',
      reason: 'amount-mismatch',
      message: '결제 금액이 주문과 다릅니다.',
    };
  }

  return { action: 'proceed' };
}

/**
 * 승인 성공 후 무엇을 지급할지 정한다.
 * 캐럿은 잔고를 올리고, 마케팅은 담당자가 처리할 신청서를 만든다.
 * 마케팅에 신청서를 안 만들면 돈만 받고 주문이 사라진다.
 */
export function grantPlan(order: StoredOrder): {
  addCarats: number;
  createMarketingRequest: boolean;
} {
  return {
    addCarats: order.kind === 'carat' && order.carats ? order.carats : 0,
    createMarketingRequest: order.kind === 'marketing',
  };
}

/** 마케팅 신청서에 적을 금액. 청구 주기에 따라 초기비용과 월비용으로 갈린다. */
export function marketingQuote(order: StoredOrder): {
  onceTotal: number;
  monthlyTotal: number;
} {
  return {
    onceTotal: order.billing === 'once' ? order.amount : 0,
    monthlyTotal: order.billing === 'monthly' ? order.amount : 0,
  };
}
