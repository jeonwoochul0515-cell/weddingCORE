import { describe, it, expect } from 'vitest';
import { bucketOf, isUpcomingAt, localTimeOf } from './scheduleMath';

/** 한국 시각으로 Date를 만든다. 테스트가 도는 기계의 시간대에 기대지 않는다 */
function kst(iso: string): Date {
  return new Date(`${iso}+09:00`);
}

describe('localTimeOf — 시차', () => {
  it('베트남은 두 시간 뒤진다', () => {
    const local = localTimeOf('베트남', kst('2026-09-21T20:00:00'));
    expect(local?.getTime()).toBe(kst('2026-09-21T18:00:00').getTime());
  });

  it('라오스도 두 시간', () => {
    const local = localTimeOf('라오스', kst('2026-09-21T20:00:00'));
    expect(local?.getTime()).toBe(kst('2026-09-21T18:00:00').getTime());
  });

  it('네팔은 45분이 섞인다', () => {
    const local = localTimeOf('네팔', kst('2026-09-21T20:00:00'));
    expect(local?.getTime()).toBe(kst('2026-09-21T16:45:00').getTime());
  });

  it('일본은 같다', () => {
    const local = localTimeOf('일본', kst('2026-09-21T20:00:00'));
    expect(local?.getTime()).toBe(kst('2026-09-21T20:00:00').getTime());
  });

  it('「베트남 하노이」처럼 덧붙어 와도 찾는다', () => {
    expect(localTimeOf('베트남 하노이', kst('2026-09-21T20:00:00'))).not.toBeNull();
  });

  it('모르는 나라는 짐작하지 않고 null', () => {
    expect(localTimeOf('가나', kst('2026-09-21T20:00:00'))).toBeNull();
  });

  it('국적이 비어 있으면 null', () => {
    expect(localTimeOf('', kst('2026-09-21T20:00:00'))).toBeNull();
    expect(localTimeOf(undefined, kst('2026-09-21T20:00:00'))).toBeNull();
    expect(localTimeOf(null, kst('2026-09-21T20:00:00'))).toBeNull();
  });

  it('날짜가 잘못됐으면 null', () => {
    expect(localTimeOf('베트남', new Date('아무거나'))).toBeNull();
  });

  it('★ 자정을 넘기면 날짜도 하루 당겨진다', () => {
    // 한국 새벽 1시는 베트남에서 전날 밤 11시다. 날짜까지 같이 안 바뀌면
    // 「오늘 새벽에 하자」가 상대에게는 어제 밤이 된다.
    const local = localTimeOf('베트남', kst('2026-09-21T01:00:00'));
    expect(local?.getTime()).toBe(kst('2026-09-20T23:00:00').getTime());
  });
});

describe('bucketOf — 언제쯤인가', () => {
  const now = kst('2026-09-20T14:00:00');

  it('같은 날은 오늘', () => {
    expect(bucketOf(kst('2026-09-20T20:00:00'), now)).toBe('오늘');
  });

  it('★ 이미 지난 시각이어도 같은 날이면 오늘이다', () => {
    expect(bucketOf(kst('2026-09-20T09:00:00'), now)).toBe('오늘');
  });

  it('다음 날은 내일', () => {
    expect(bucketOf(kst('2026-09-21T09:00:00'), now)).toBe('내일');
  });

  it('★ 밤 11시에 보는 내일 아침은 내일이다', () => {
    const late = kst('2026-09-20T23:00:00');
    expect(bucketOf(kst('2026-09-21T09:00:00'), late)).toBe('내일');
  });

  it('이레까지는 이번 주', () => {
    expect(bucketOf(kst('2026-09-27T09:00:00'), now)).toBe('이번 주');
  });

  it('여드레부터는 이번 달', () => {
    expect(bucketOf(kst('2026-09-28T09:00:00'), now)).toBe('이번 달');
  });

  it('한 달을 넘으면 그 뒤', () => {
    expect(bucketOf(kst('2026-11-01T09:00:00'), now)).toBe('그 뒤');
  });

  it('어제는 지났음', () => {
    expect(bucketOf(kst('2026-09-19T20:00:00'), now)).toBe('지났음');
  });
});

describe('isUpcomingAt — 아직 남았나', () => {
  const now = kst('2026-09-20T14:00:00').getTime();

  it('앞으로 올 약속은 남았다', () => {
    expect(isUpcomingAt(kst('2026-09-21T20:00:00').getTime(), 60, 'confirmed', now)).toBe(true);
  });

  it('★ 진행 중인 약속은 아직 남은 것으로 본다', () => {
    // 한 시간 전에 시작한 두 시간짜리. 지금 하고 있는 중이다.
    expect(isUpcomingAt(kst('2026-09-20T13:00:00').getTime(), 120, 'confirmed', now)).toBe(true);
  });

  it('끝난 시각이 지났으면 아니다', () => {
    expect(isUpcomingAt(kst('2026-09-20T12:00:00').getTime(), 60, 'confirmed', now)).toBe(false);
  });

  it('취소·끝남·불참은 시각과 무관하게 아니다', () => {
    const future = kst('2026-09-25T20:00:00').getTime();
    expect(isUpcomingAt(future, 60, 'canceled', now)).toBe(false);
    expect(isUpcomingAt(future, 60, 'done', now)).toBe(false);
    expect(isUpcomingAt(future, 60, 'noshow', now)).toBe(false);
  });

  it('잡는 중도 남은 약속이다 — 확정 전이라고 숨기면 잊는다', () => {
    expect(isUpcomingAt(kst('2026-09-25T20:00:00').getTime(), 60, 'planned', now)).toBe(true);
  });

  it('시각이 없으면 아니다', () => {
    expect(isUpcomingAt(null, 60, 'confirmed', now)).toBe(false);
  });
});
