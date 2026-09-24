// 주간 지표 기간 해석과 notes 문장 시험
import { describe, expect, it } from 'vitest';
import { buildWeeklyNotes, parseUtc, parseWeeklyRange } from './weeklyReport.js';

describe('parseUtc', () => {
  it('UTC 문자열을 그대로 UTC 시각으로 읽는다', () => {
    expect(parseUtc('2026-09-21 15:00:00')?.toISOString()).toBe('2026-09-21T15:00:00.000Z');
  });
  it('형식이 틀리거나 없는 날짜면 null', () => {
    expect(parseUtc('2026-09-21T15:00:00Z')).toBeNull();
    expect(parseUtc('2026-02-30 00:00:00')).toBeNull();
    expect(parseUtc('')).toBeNull();
    expect(parseUtc(undefined)).toBeNull();
  });
});

describe('parseWeeklyRange', () => {
  it('since < until이면 값을 준다', () => {
    const r = parseWeeklyRange('2026-09-14 15:00:00', '2026-09-21 15:00:00');
    expect(r?.until.getTime()! - r?.since.getTime()!).toBe(7 * 24 * 3600 * 1000);
  });
  it('순서가 뒤집히거나 같으면 null', () => {
    expect(parseWeeklyRange('2026-09-21 15:00:00', '2026-09-14 15:00:00')).toBeNull();
    expect(parseWeeklyRange('2026-09-21 15:00:00', '2026-09-21 15:00:00')).toBeNull();
  });
});

describe('buildWeeklyNotes', () => {
  const empty = { agencyLeads: [], marketing: { total: 0, paid: 0 }, legalDrafts: { total: 0, awaitingReview: 0 } };

  it('모두 0건이면 빈 배열', () => {
    expect(buildWeeklyNotes(empty)).toEqual([]);
  });

  it('업체 접수는 많은 순, 0건 업체는 뺀다', () => {
    const notes = buildWeeklyNotes({
      ...empty,
      agencyLeads: [
        { name: '가업체', count: 1 },
        { name: '나업체', count: 0 },
        { name: '다업체', count: 3 },
      ],
    });
    expect(notes).toEqual(['업체 접수 4건(다업체 3·가업체 1)']);
  });

  it('세 항목을 모두 적고 각 문장은 60자 이하', () => {
    const notes = buildWeeklyNotes({
      agencyLeads: Array.from({ length: 20 }, (_, i) => ({ name: `아주긴업체이름${i}`, count: 1 })),
      marketing: { total: 2, paid: 1 },
      legalDrafts: { total: 5, awaitingReview: 3 },
    });
    expect(notes).toHaveLength(3);
    expect(notes[1]).toBe('마케팅 신청 2건(결제 1건)');
    expect(notes[2]).toBe('AI 서면 초안 5건, 그중 검토 대기 3건');
    for (const n of notes) expect(n.length).toBeLessThanOrEqual(60);
  });
});
