// 호출 빈도 판정의 셈
//
// 왜 떼어냈나. 이 판정이 무너지면 남이 우리 지갑을 연다 — 막는 대상이 문자 발송과 AI 호출이라
// 호출마다 실비가 나간다. 그런데 lib/rateLimit.ts 안에서는 Firestore 트랜잭션에 묶여 있어
// 검증하려면 에뮬레이터를 띄워야 한다. 그러면 아무도 검증하지 않게 된다.
// (creditMath·orderCheck를 떼어낸 것과 같은 이유다)
//
// 지키는 규칙 세 가지.
//   1) 창(window)은 첫 호출에 열리고 그 안에서는 연장되지 않는다.
//      호출할 때마다 창을 밀면 창이 영영 안 닫혀 정상 손님이 먼저 막힌다.
//   2) 막을 때는 세지 않는다. 막힌 호출이 창을 늘리면 한 번 막힌 사람은 계속 막힌다.
//   3) 창이 지나면 처음부터 다시 센다.

export type Rule = { windowMs: number; max: number };

/** 저장소에 들어 있는 값. 문서가 없으면 null이 온다. */
export type RateLimitState = { count: number; resetAt: number };

export type RateLimitDecision =
  /** 한도를 넘었다. 아무것도 쓰지 않는다 */
  | { limited: true }
  /** 통과. next를 그대로 저장하면 된다 */
  | { limited: false; next: RateLimitState };

/**
 * 이번 호출을 받아줄지 판정한다.
 *
 * @param stored 저장된 값. 문서가 없거나 처음이면 null.
 * @param now    지금 시각(ms).
 */
export function decideRateLimit(
  stored: RateLimitState | null,
  now: number,
  rule: Rule,
): RateLimitDecision {
  // resetAt이 지금이거나 그 전이면 창이 닫힌 것이다. 경계(==)는 만료로 본다 —
  // 닫히는 순간에 한 번 더 받아주면 창마다 max+1이 통과한다.
  const expired = !stored || stored.resetAt <= now;
  const count = expired ? 0 : stored.count;

  if (count >= rule.max) return { limited: true };

  return {
    limited: false,
    next: {
      count: count + 1,
      // 창 안이면 원래 닫힐 시각을 그대로 둔다. 여기서 now+windowMs로 새로 잡으면
      // 호출할 때마다 창이 밀려 영영 안 닫힌다.
      resetAt: expired ? now + rule.windowMs : stored.resetAt,
    },
  };
}
