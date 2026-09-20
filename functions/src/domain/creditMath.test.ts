// 캐럿 셈 검증 — 돈이 걸린 계산이라 회귀를 막는다
import { describe, expect, it } from 'vitest';
import { availableCredits, computeConsumption, computeRestore } from './creditMath.js';

describe('computeConsumption', () => {
  it('무료분이 넉넉하면 무료분에서만 뺀다', () => {
    const r = computeConsumption({ monthlyAllowance: 20, used: 0, purchased: 100 }, 5);
    expect(r).not.toBeNull();
    expect(r!.fromMonthly).toBe(5);
    expect(r!.fromPurchased).toBe(0);
    expect(r!.purchased).toBe(100);   // 충전분은 건드리지 않는다
    expect(r!.remaining).toBe(115);
  });

  it('무료분이 모자라면 나머지를 충전분에서 뺀다', () => {
    const r = computeConsumption({ monthlyAllowance: 20, used: 15, purchased: 100 }, 30);
    expect(r!.fromMonthly).toBe(5);    // 남은 무료분 5
    expect(r!.fromPurchased).toBe(25);
    expect(r!.used).toBe(20);
    expect(r!.purchased).toBe(75);
    expect(r!.remaining).toBe(75);
  });

  it('무료분을 다 썼으면 전액 충전분에서 뺀다', () => {
    const r = computeConsumption({ monthlyAllowance: 20, used: 20, purchased: 110 }, 110);
    expect(r!.fromMonthly).toBe(0);
    expect(r!.fromPurchased).toBe(110);
    expect(r!.purchased).toBe(0);
    expect(r!.remaining).toBe(0);
  });

  it('총량이 모자라면 null을 준다', () => {
    expect(computeConsumption({ monthlyAllowance: 20, used: 20, purchased: 5 }, 10)).toBeNull();
  });

  it('잔여와 정확히 같은 금액은 통과한다 (경계)', () => {
    const r = computeConsumption({ monthlyAllowance: 20, used: 18, purchased: 8 }, 10);
    expect(r).not.toBeNull();
    expect(r!.remaining).toBe(0);
  });

  it('잔여보다 1 많으면 거부한다 (경계)', () => {
    expect(computeConsumption({ monthlyAllowance: 20, used: 18, purchased: 8 }, 11)).toBeNull();
  });

  it('used가 allowance를 넘어도 무료 잔여를 음수로 보지 않는다', () => {
    // 정책이 바뀌어 allowance가 줄면 used > allowance가 될 수 있다.
    const r = computeConsumption({ monthlyAllowance: 10, used: 25, purchased: 50 }, 20);
    expect(r!.fromMonthly).toBe(0);
    expect(r!.fromPurchased).toBe(20);
    expect(r!.purchased).toBe(30);
  });
});

describe('computeRestore', () => {
  it('뺀 곳으로 그대로 돌려준다', () => {
    const back = computeRestore({ used: 20, purchased: 75 }, 5, 25);
    expect(back.used).toBe(15);
    expect(back.purchased).toBe(100);
  });

  it('돈 주고 산 캐럿이 무료분으로 바뀌지 않는다 (과거 회귀 지점)', () => {
    // 무료 20을 다 쓴 뒤 110을 전액 충전분에서 차감하고 실패한 상황.
    // 예전 구현은 "무료분부터" 되돌려 used를 20→0으로 만들고 충전분엔 90만 돌려줬다.
    // 그러면 업체가 돈 주고 산 20캐럿이 월말에 사라지는 무료분으로 바뀐다.
    const consumed = computeConsumption({ monthlyAllowance: 20, used: 20, purchased: 110 }, 110)!;
    const back = computeRestore({ used: 20, purchased: 0 }, consumed.fromMonthly, consumed.fromPurchased);
    expect(back.used).toBe(20);        // 무료 사용량은 그대로
    expect(back.purchased).toBe(110);  // 충전분이 전액 돌아온다
  });

  it('차감과 복구를 붙이면 원래 상태로 돌아온다', () => {
    const start = { monthlyAllowance: 20, used: 12, purchased: 40 };
    const consumed = computeConsumption(start, 25)!;
    const back = computeRestore(
      { used: consumed.used, purchased: consumed.purchased },
      consumed.fromMonthly,
      consumed.fromPurchased,
    );
    expect(back.used).toBe(start.used);
    expect(back.purchased).toBe(start.purchased);
  });

  it('복구 중 달이 바뀌어 사용량이 0이면 음수로 내려가지 않는다', () => {
    const back = computeRestore({ used: 0, purchased: 10 }, 5, 30);
    expect(back.used).toBe(0);         // 음수가 되지 않는다
    expect(back.purchased).toBe(40);   // 돈 낸 몫은 전액 돌아간다
  });
});

describe('availableCredits', () => {
  it('무료 잔여와 충전분을 합한다', () => {
    expect(availableCredits({ monthlyAllowance: 20, used: 5, purchased: 30 })).toBe(45);
  });

  it('무료분을 초과 사용했어도 충전분만 센다', () => {
    expect(availableCredits({ monthlyAllowance: 10, used: 30, purchased: 7 })).toBe(7);
  });
});
