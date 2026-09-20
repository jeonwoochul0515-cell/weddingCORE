// 결제 주문 판정 검증 — 돈이 새는 길을 막는다
import { describe, expect, it } from 'vitest';
import { grantPlan, marketingQuote, verifyOrder, type StoredOrder } from './orderCheck.js';

const caratOrder = (over: Partial<StoredOrder> = {}): StoredOrder => ({
  amount: 110_000,
  status: 'pending',
  kind: 'carat',
  carats: 110,
  label: '110캐럿',
  itemId: 'pack_110',
  billing: 'once',
  ...over,
});

const marketingOrder = (over: Partial<StoredOrder> = {}): StoredOrder => ({
  amount: 500_000,
  status: 'pending',
  kind: 'marketing',
  carats: null,
  label: '네이버 검색노출·플레이스 광고 최적화',
  itemId: 'naver-seo',
  billing: 'once',
  ...over,
});

describe('verifyOrder', () => {
  it('금액이 맞으면 승인을 진행한다', () => {
    expect(verifyOrder(caratOrder(), 110_000)).toEqual({ action: 'proceed' });
  });

  it('금액을 깎아 보내면 거부한다 — 값을 바꿔 결제하는 공격', () => {
    const v = verifyOrder(caratOrder(), 1_000);
    expect(v.action).toBe('reject');
    expect(v).toMatchObject({ reason: 'amount-mismatch' });
  });

  it('금액을 부풀려 보내도 거부한다', () => {
    // 더 내겠다는 것도 받지 않는다. 주문과 다른 금액은 전부 거부다.
    expect(verifyOrder(caratOrder(), 200_000).action).toBe('reject');
  });

  it('1원만 달라도 거부한다 (경계)', () => {
    expect(verifyOrder(caratOrder(), 109_999).action).toBe('reject');
    expect(verifyOrder(caratOrder(), 110_001).action).toBe('reject');
  });

  it('이미 지급된 주문은 다시 지급하지 않는다 — 새로고침 재요청', () => {
    expect(verifyOrder(caratOrder({ status: 'paid' }), 110_000)).toEqual({ action: 'already-paid' });
  });

  it('이미 지급된 주문은 금액이 틀려도 already-paid로 본다', () => {
    // 중복 방지가 금액 대조보다 먼저다. 지급이 끝났으면 더 볼 것이 없다.
    expect(verifyOrder(caratOrder({ status: 'paid' }), 1).action).toBe('already-paid');
  });

  it('실패한 주문을 되살려 승인하지 않는다', () => {
    const v = verifyOrder(caratOrder({ status: 'failed' }), 110_000);
    expect(v.action).toBe('reject');
    expect(v).toMatchObject({ reason: 'bad-status' });
  });

  it('모르는 상태값도 거부한다', () => {
    expect(verifyOrder(caratOrder({ status: 'cancelled' }), 110_000).action).toBe('reject');
  });

  it('승인 중에 끊긴 주문(confirming)은 다시 진행한다 — 돈만 받고 물건이 안 나가는 길', () => {
    expect(verifyOrder(caratOrder({ status: 'confirming' }), 110_000)).toEqual({ action: 'proceed' });
  });

  it('confirming이어도 금액이 다르면 거부한다', () => {
    const v = verifyOrder(caratOrder({ status: 'confirming' }), 1_000);
    expect(v.action).toBe('reject');
    expect(v).toMatchObject({ reason: 'amount-mismatch' });
  });

  it('거부 사유에는 사용자에게 보일 말이 있다', () => {
    const v = verifyOrder(caratOrder(), 1_000);
    expect(v.action).toBe('reject');
    if (v.action === 'reject') expect(v.message.length).toBeGreaterThan(0);
  });
});

describe('grantPlan', () => {
  it('캐럿 주문은 잔고를 올린다', () => {
    expect(grantPlan(caratOrder())).toEqual({ addCarats: 110, createMarketingRequest: false });
  });

  it('마케팅 주문은 신청서를 만든다 — 없으면 돈만 받고 주문이 사라진다', () => {
    expect(grantPlan(marketingOrder())).toEqual({ addCarats: 0, createMarketingRequest: true });
  });

  it('캐럿 수가 비어 있으면 아무것도 지급하지 않는다', () => {
    expect(grantPlan(caratOrder({ carats: null })).addCarats).toBe(0);
  });

  it('마케팅 주문에 캐럿을 붙이지 않는다', () => {
    expect(grantPlan(marketingOrder({ carats: 999 })).addCarats).toBe(0);
  });
});

describe('marketingQuote', () => {
  it('1회성은 초기비용으로 적는다', () => {
    expect(marketingQuote(marketingOrder())).toEqual({ onceTotal: 500_000, monthlyTotal: 0 });
  });

  it('월정액은 월비용으로 적는다', () => {
    const q = marketingQuote(marketingOrder({ amount: 100_000, billing: 'monthly' }));
    expect(q).toEqual({ onceTotal: 0, monthlyTotal: 100_000 });
  });

  it('두 칸에 같은 금액을 동시에 적지 않는다', () => {
    const q = marketingQuote(marketingOrder());
    expect(q.onceTotal === 0 || q.monthlyTotal === 0).toBe(true);
  });
});
