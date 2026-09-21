// 파기 판정 — 되돌릴 수 없는 일이라 경계를 못 박는다
import { describe, expect, it } from 'vitest';
import { CLIENT_RETENTION_YEARS, retentionCutoff, shouldPurge } from './purgeClients.js';

const NOW = new Date('2026-09-21T00:00:00Z');
const CUTOFF = retentionCutoff(NOW).getTime();

/** Firestore Timestamp 흉내. toMillis만 쓴다 */
const at = (iso: string) => ({ toMillis: () => new Date(iso).getTime() });

describe('retentionCutoff', () => {
  it('5년 전을 기준으로 삼는다', () => {
    expect(retentionCutoff(NOW).toISOString().slice(0, 10)).toBe('2021-09-21');
    expect(CLIENT_RETENTION_YEARS).toBe(5);
  });
});

describe('shouldPurge', () => {
  it('종료한 지 5년이 지났으면 지운다', () => {
    expect(shouldPurge({ status: 'completed', closedAt: at('2021-09-20T00:00:00Z') }, CUTOFF)).toBe(
      true,
    );
  });

  it('★ 5년 되는 그날은 아직 지우지 않는다 (경계)', () => {
    expect(shouldPurge({ status: 'completed', closedAt: at('2021-09-21T00:00:00Z') }, CUTOFF)).toBe(
      false,
    );
  });

  it('취소한 고객도 같은 기준으로 지운다', () => {
    expect(shouldPurge({ status: 'cancelled', closedAt: at('2019-01-01T00:00:00Z') }, CUTOFF)).toBe(
      true,
    );
  });

  it('★ 진행 중인 고객은 아무리 오래됐어도 손대지 않는다', () => {
    expect(shouldPurge({ status: 'active', closedAt: at('2010-01-01T00:00:00Z') }, CUTOFF)).toBe(
      false,
    );
  });

  it('★ 종료 시점이 없으면 손대지 않는다 — 언제부터 5년인지 모른다', () => {
    expect(shouldPurge({ status: 'completed', closedAt: null }, CUTOFF)).toBe(false);
    expect(shouldPurge({ status: 'completed' }, CUTOFF)).toBe(false);
  });

  it('상태가 비어 있으면 손대지 않는다', () => {
    expect(shouldPurge({ closedAt: at('2010-01-01T00:00:00Z') }, CUTOFF)).toBe(false);
  });
});
