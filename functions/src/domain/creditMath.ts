// 캐럿 차감·복구의 셈
//
// 왜 떼어냈나. 이 계산은 돈이다. 그런데 automation/index.ts 안에서는 Firestore 트랜잭션에
// 묶여 있어 검증하려면 에뮬레이터를 띄워야 한다. 그러면 아무도 검증하지 않게 된다.
// 저장소를 건드리는 부분과 셈하는 부분을 갈라, 셈은 그대로 시험할 수 있게 한다.
//
// 지키는 규칙 두 가지.
//   1) 월 무료분을 먼저 쓰고 모자란 만큼 충전분에서 뺀다.
//   2) 되돌릴 때는 뺀 곳으로 그대로 돌려준다. 이걸 어기면 돈 주고 산 캐럿이
//      월말에 소멸하는 무료분으로 바뀐다.

export type CreditState = {
  monthlyAllowance: number;
  used: number;
  purchased: number;
};

export type Consumption = {
  /** 차감 뒤의 사용량·충전분 */
  used: number;
  purchased: number;
  /** 어디서 얼마를 뺐는지. 복구할 때 이 숫자가 그대로 필요하다 */
  fromMonthly: number;
  fromPurchased: number;
  /** 차감 뒤 남은 총량(무료 잔여 + 충전분) */
  remaining: number;
};

/** 지금 쓸 수 있는 총량. 무료 잔여와 충전분을 합한 값이다. */
export function availableCredits(state: CreditState): number {
  return Math.max(0, state.monthlyAllowance - state.used) + state.purchased;
}

/**
 * cost만큼 차감한 결과를 셈한다. 모자라면 null을 돌려준다(호출한 쪽이 오류를 만든다).
 * 무료분을 먼저 쓴다 — 무료분은 월말에 사라지고 충전분은 남으므로, 사라질 것부터 쓰는 것이 이득이다.
 */
export function computeConsumption(state: CreditState, cost: number): Consumption | null {
  const monthlyRemaining = Math.max(0, state.monthlyAllowance - state.used);
  if (monthlyRemaining + state.purchased < cost) return null;

  const fromMonthly = Math.min(cost, monthlyRemaining);
  const fromPurchased = cost - fromMonthly;

  return {
    used: state.used + fromMonthly,
    purchased: state.purchased - fromPurchased,
    fromMonthly,
    fromPurchased,
    remaining: monthlyRemaining + state.purchased - cost,
  };
}

/**
 * 뺀 곳으로 그대로 되돌린다.
 *
 * 되돌리는 사이에 달이 바뀌어 사용량이 이미 0으로 초기화됐으면 음수로 내려가지 않게 막는다.
 * 그때 못 돌려주는 무료분은 어차피 월말에 소멸하는 몫이고, 돈을 낸 충전분은 전액 돌아간다.
 */
export function computeRestore(
  current: { used: number; purchased: number },
  fromMonthly: number,
  fromPurchased: number,
): { used: number; purchased: number } {
  const backToMonthly = Math.min(fromMonthly, current.used);
  return {
    used: current.used - backToMonthly,
    purchased: current.purchased + fromPurchased,
  };
}
