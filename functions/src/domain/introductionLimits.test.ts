// 제12조의2 ① 2호·3호 — 한 번에 여러 명을 보여주는 자리를 막는다
import { describe, expect, it } from 'vitest';
import {
  checkIntroductionLimits,
  dayKeyKst,
  overlaps,
  placeKey,
  type ScheduledMeeting,
} from './introductionLimits.js';

/** 2026-09-21(월) 14:00 KST */
const AT = (kstIsoLocal: string) => new Date(`${kstIsoLocal}+09:00`).getTime();

const meeting = (over: Partial<ScheduledMeeting> = {}): ScheduledMeeting => ({
  id: 'apt_1',
  clientId: 'cli_1',
  partnerId: 'ptn_1',
  clientName: '김철수',
  partnerName: '흐엉',
  startMs: AT('2026-09-21T14:00:00'),
  durationMinutes: 60,
  place: '하노이 OO호텔 로비',
  mode: 'offline',
  status: 'planned',
  ...over,
});

const reasons = (bs: ReturnType<typeof checkIntroductionLimits>) => bs.map((b) => b.reason).join(' | ');

describe('dayKeyKst', () => {
  it('한국 시각 자정 직후는 그날이다', () => {
    expect(dayKeyKst(AT('2026-09-21T00:10:00'))).toBe('2026-09-21');
  });

  it('★ 한국 시각 밤 11시는 UTC로 다음 날이지만 같은 날로 센다', () => {
    expect(dayKeyKst(AT('2026-09-21T23:30:00'))).toBe('2026-09-21');
  });
});

describe('placeKey', () => {
  it('띄어쓰기와 대소문자를 무시한다', () => {
    expect(placeKey('Lotte  Hotel 로비')).toBe(placeKey('lottehotel로비'));
  });

  it('공백뿐이면 장소가 없는 것으로 본다', () => {
    expect(placeKey('   ')).toBeNull();
  });
});

describe('overlaps', () => {
  it('끝나는 시각과 시작 시각이 맞닿으면 겹친 것이 아니다 (경계)', () => {
    const a = meeting({ startMs: AT('2026-09-21T14:00:00'), durationMinutes: 60 });
    const b = meeting({ id: 'apt_2', startMs: AT('2026-09-21T15:00:00') });
    expect(overlaps(a, b)).toBe(false);
  });

  it('1분이라도 물리면 겹친 것이다 (경계)', () => {
    const a = meeting({ startMs: AT('2026-09-21T14:00:00'), durationMinutes: 60 });
    const b = meeting({ id: 'apt_2', startMs: AT('2026-09-21T14:59:00') });
    expect(overlaps(a, b)).toBe(true);
  });
});

describe('checkIntroductionLimits — 2호 같은 시간', () => {
  it('같은 고객에게 같은 시간 다른 후보가 잡혀 있으면 막는다', () => {
    const other = meeting({ id: 'apt_2', partnerId: 'ptn_2', partnerName: '란' });
    const bs = checkIntroductionLimits(meeting(), [other]);
    expect(reasons(bs)).toContain('같은 시간');
    expect(bs[0]?.legalBasis).toContain('2호');
  });

  it('같은 후보와의 자리는 겹쳐도 2호가 아니다 — 2명 이상이 아니다', () => {
    const other = meeting({ id: 'apt_2', partnerId: 'ptn_1', place: '하노이 OO호텔 로비' });
    const bs = checkIntroductionLimits(meeting(), [other]);
    expect(reasons(bs)).not.toContain('같은 시간');
  });

  it('다른 고객의 자리가 겹치는 것은 2호가 아니다 — 조문은 「이용자에게」로 시작한다', () => {
    const other = meeting({ id: 'apt_2', clientId: 'cli_2', partnerId: 'ptn_2', place: '다른 곳' });
    const bs = checkIntroductionLimits(meeting(), [other]);
    expect(reasons(bs)).not.toContain('같은 시간');
  });

  it('취소된 약속은 세지 않는다', () => {
    const other = meeting({ id: 'apt_2', partnerId: 'ptn_2', status: 'canceled' });
    expect(checkIntroductionLimits(meeting(), [other])).toHaveLength(0);
  });

  it('화상이어도 같은 시간이면 막는다 — 2호에 장소 요건이 없다', () => {
    const target = meeting({ mode: 'online', place: null });
    const other = meeting({ id: 'apt_2', partnerId: 'ptn_2', mode: 'online', place: null });
    expect(reasons(checkIntroductionLimits(target, [other]))).toContain('같은 시간');
  });
});

describe('checkIntroductionLimits — 3호 같은 날 같은 장소', () => {
  it('★ 시간을 나눠도 같은 날 같은 장소면 막는다 — 「순차적으로」도 금지다', () => {
    const other = meeting({
      id: 'apt_2',
      clientId: 'cli_2',
      partnerId: 'ptn_2',
      startMs: AT('2026-09-21T17:00:00'),
    });
    const bs = checkIntroductionLimits(meeting(), [other]);
    expect(reasons(bs)).toContain('같은 날 같은 장소');
    expect(bs.some((b) => b.legalBasis.includes('3호'))).toBe(true);
  });

  it('고객이 2명이어도 후보가 한 명이면 걸리지 않는다', () => {
    const other = meeting({
      id: 'apt_2',
      clientId: 'cli_2',
      partnerId: 'ptn_1',
      startMs: AT('2026-09-21T17:00:00'),
    });
    expect(reasons(checkIntroductionLimits(meeting(), [other]))).not.toContain('같은 날');
  });

  it('장소가 다르면 걸리지 않는다', () => {
    const other = meeting({
      id: 'apt_2',
      clientId: 'cli_2',
      partnerId: 'ptn_2',
      startMs: AT('2026-09-21T17:00:00'),
      place: '하이퐁 XX카페',
    });
    expect(reasons(checkIntroductionLimits(meeting(), [other]))).not.toContain('같은 날');
  });

  it('날이 다르면 걸리지 않는다', () => {
    const other = meeting({
      id: 'apt_2',
      clientId: 'cli_2',
      partnerId: 'ptn_2',
      startMs: AT('2026-09-22T14:00:00'),
    });
    expect(reasons(checkIntroductionLimits(meeting(), [other]))).not.toContain('같은 날');
  });

  it('직접 만나는데 장소가 없으면 판정할 수 없으니 막는다', () => {
    const bs = checkIntroductionLimits(meeting({ place: null }), []);
    expect(reasons(bs)).toContain('장소가 적혀 있지 않습니다');
  });

  it('화상 약속에는 장소를 요구하지 않는다', () => {
    expect(checkIntroductionLimits(meeting({ mode: 'online', place: null }), [])).toHaveLength(0);
  });
});

describe('checkIntroductionLimits — 기본', () => {
  it('겹치는 것이 없으면 아무것도 막지 않는다', () => {
    expect(checkIntroductionLimits(meeting(), [])).toHaveLength(0);
  });

  it('자기 자신이 목록에 섞여 들어와도 자기와 겹쳤다고 하지 않는다', () => {
    expect(checkIntroductionLimits(meeting(), [meeting()])).toHaveLength(0);
  });

  it('시각이 없으면 확정하지 못한다', () => {
    const bs = checkIntroductionLimits(meeting({ startMs: null }), []);
    expect(reasons(bs)).toContain('약속 시각이 없습니다');
  });
});
