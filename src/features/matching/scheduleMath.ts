// 일정 계산 — 시차와 시간 구간
//
// Firebase를 부르지 않는 순수 계산만 둔다. 시차는 틀리면 상대가 자는 시각에 약속을 잡는
// 사고가 나므로 반드시 테스트로 못 박는다.

/**
 * 나라별 시차 (한국 기준, 분).
 *
 * 서머타임을 쓰는 나라는 넣지 않았다. 넣으려면 고정값이 아니라 Intl로 바꿔야 한다 —
 * 고정값으로 두면 일 년에 두 번 한 시간씩 틀린다.
 */
export const OFFSET_MINUTES: Record<string, number> = {
  베트남: -120,
  라오스: -120,
  캄보디아: -120,
  태국: -120,
  미얀마: -150,
  필리핀: -60,
  몽골: -60,
  중국: -60,
  인도네시아: -120,
  우즈베키스탄: -240,
  키르기스스탄: -180,
  네팔: -195,
  인도: -210,
  일본: 0,
};

/**
 * 한국 시각이 상대 나라에서 몇 시인가.
 *
 * 모르는 나라면 null이다. 짐작해서 틀린 시각을 보여 주느니 모른다고 하는 편이 낫다 —
 * 화면이 「현지 오후 6시」라고 적어 두면 사람은 그걸 믿고 전화한다.
 */
export function localTimeOf(nationality: string | undefined | null, korean: Date): Date | null {
  if (!nationality) return null;
  if (Number.isNaN(korean.getTime())) return null;
  const key = Object.keys(OFFSET_MINUTES).find((k) => nationality.includes(k));
  const offset = key === undefined ? undefined : OFFSET_MINUTES[key];
  if (offset === undefined) return null;
  return new Date(korean.getTime() + offset * 60_000);
}

const DAY = 24 * 60 * 60 * 1000;

export type Bucket = '지났음' | '오늘' | '내일' | '이번 주' | '이번 달' | '그 뒤';

/**
 * 언제쯤인가를 묶는다.
 *
 * 날짜를 읽고 오늘과 견주는 것보다 「오늘·내일」이라고 적힌 쪽이 빠르다.
 * 자정을 기준으로 가른다 — 밤 11시에 보는 「내일 오전 9시」는 열 시간 뒤지만 내일이다.
 */
export function bucketOf(start: Date, now: Date): Bucket {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const days = Math.floor((start.getTime() - midnight.getTime()) / DAY);
  if (days < 0) return '지났음';
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  if (days <= 7) return '이번 주';
  if (days <= 30) return '이번 달';
  return '그 뒤';
}

/**
 * 아직 남은 약속인가.
 *
 * 시작 시각이 아니라 **끝나는 시각**으로 본다. 두 시간짜리 맞선이 한 시간 전에
 * 시작했으면 지금 진행 중이지 지나간 것이 아니다. 시작 시각으로 가르면
 * 진행 중인 약속이 「지난 약속」으로 접혀 들어간다.
 */
export function isUpcomingAt(
  startMs: number | null,
  durationMinutes: number,
  status: string,
  nowMs: number,
): boolean {
  if (startMs === null) return false;
  if (status === 'canceled' || status === 'done' || status === 'noshow') return false;
  return startMs + durationMinutes * 60_000 >= nowMs;
}

/** 「9/21(일) 20:00–21:00」 */
export function formatWhen(start: Date, minutes: number): string {
  const end = new Date(start.getTime() + minutes * 60_000);
  const date = start.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const t = (d: Date) =>
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${t(start)}–${t(end)}`;
}
