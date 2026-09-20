// 호출 빈도 판정 검증 — 남이 우리 지갑을 여는 길을 막는다
import { describe, expect, it } from 'vitest';
import { decideRateLimit, type RateLimitState } from './rateLimitMath.js';

const RULE = { windowMs: 10 * 60_000, max: 5 };
const NOW = 1_700_000_000_000;

/** 창이 열린 지 얼마 안 된 상태 */
const open = (count: number): RateLimitState => ({ count, resetAt: NOW + 60_000 });

describe('decideRateLimit', () => {
  it('첫 호출은 통과하고 창을 연다', () => {
    const d = decideRateLimit(null, NOW, RULE);
    expect(d).toEqual({ limited: false, next: { count: 1, resetAt: NOW + RULE.windowMs } });
  });

  it('창 안에서 한도 미만이면 통과하고 센다', () => {
    const d = decideRateLimit(open(3), NOW, RULE);
    expect(d).toEqual({ limited: false, next: { count: 4, resetAt: NOW + 60_000 } });
  });

  it('창은 호출해도 늘어나지 않는다 — 늘리면 영영 안 닫혀 정상 손님이 먼저 막힌다', () => {
    const d = decideRateLimit(open(1), NOW, RULE);
    expect(d.limited).toBe(false);
    if (!d.limited) expect(d.next.resetAt).toBe(NOW + 60_000);
  });

  it('한도에 닿으면 막는다', () => {
    expect(decideRateLimit(open(RULE.max), NOW, RULE)).toEqual({ limited: true });
  });

  it('한도 직전 한 번은 통과한다 (경계)', () => {
    const d = decideRateLimit(open(RULE.max - 1), NOW, RULE);
    expect(d.limited).toBe(false);
    if (!d.limited) expect(d.next.count).toBe(RULE.max);
  });

  it('한도를 넘어선 값이 저장돼 있어도 막는다', () => {
    expect(decideRateLimit(open(RULE.max + 10), NOW, RULE)).toEqual({ limited: true });
  });

  it('막을 때는 세지 않는다 — 막힌 호출이 창을 늘리면 한 번 막힌 사람은 계속 막힌다', () => {
    const d = decideRateLimit(open(RULE.max), NOW, RULE);
    expect(d).not.toHaveProperty('next');
  });

  it('창이 지나면 처음부터 다시 센다', () => {
    const past: RateLimitState = { count: RULE.max, resetAt: NOW - 1 };
    const d = decideRateLimit(past, NOW, RULE);
    expect(d).toEqual({ limited: false, next: { count: 1, resetAt: NOW + RULE.windowMs } });
  });

  it('resetAt이 정확히 지금이면 만료로 본다 (경계)', () => {
    // 닫히는 순간을 아직 열린 것으로 보면 창마다 max+1이 통과한다.
    const edge: RateLimitState = { count: RULE.max, resetAt: NOW };
    expect(decideRateLimit(edge, NOW, RULE).limited).toBe(false);
  });

  it('resetAt이 1ms 뒤면 아직 창 안이다 (경계)', () => {
    const edge: RateLimitState = { count: RULE.max, resetAt: NOW + 1 };
    expect(decideRateLimit(edge, NOW, RULE).limited).toBe(true);
  });

  it('max가 1이면 창당 한 번만 통과한다', () => {
    const rule = { windowMs: 1000, max: 1 };
    expect(decideRateLimit(null, NOW, rule).limited).toBe(false);
    expect(decideRateLimit({ count: 1, resetAt: NOW + 500 }, NOW, rule).limited).toBe(true);
  });

  it('창을 연속으로 채워도 한도를 넘겨 통과시키지 않는다', () => {
    let state: RateLimitState | null = null;
    let passed = 0;
    for (let i = 0; i < RULE.max + 20; i += 1) {
      const d = decideRateLimit(state, NOW, RULE);
      if (d.limited) continue;
      passed += 1;
      state = d.next;
    }
    expect(passed).toBe(RULE.max);
  });
});
