// 중앙 접수함 주간 지표(GET /api/admin/weekly)의 순수 계산 — 기간 해석과 notes 문장 만들기
//
// 규격: lead-inbox/admin-api-v2.md "주간 지표". 기간은 UTC "YYYY-MM-DD HH:MM:SS", since 이상 until 미만.
// notes는 60자 이하 최대 3개, 손님 개인정보 금지(업체명까지만).

const UTC_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/** "YYYY-MM-DD HH:MM:SS"(UTC)를 Date로. 형식이 틀리거나 없는 날짜면 null */
export function parseUtc(value: unknown): Date | null {
  const m = UTC_RE.exec(String(value ?? '').trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  // 2026-02-30 같은 값은 Date가 조용히 넘겨 버린다. 되돌려 같은지 본다.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== mi ||
    date.getUTCSeconds() !== s
  ) {
    return null;
  }
  return date;
}

/** since·until을 해석한다. 둘 다 맞고 since < until일 때만 값을 준다 */
export function parseWeeklyRange(since: unknown, until: unknown): { since: Date; until: Date } | null {
  const a = parseUtc(since);
  const b = parseUtc(until);
  if (!a || !b || a.getTime() >= b.getTime()) return null;
  return { since: a, until: b };
}

const MAX_NOTE = 60;

function clip(text: string): string {
  return text.length <= MAX_NOTE ? text : text.slice(0, MAX_NOTE - 1) + '…';
}

export type WeeklyFacts = {
  /** 업체별 홈페이지·점검 접수 수(0건 업체는 빼도 된다) */
  agencyLeads: Array<{ name: string; count: number }>;
  marketing: { total: number; paid: number };
  legalDrafts: { total: number; awaitingReview: number };
};

/** 그 주 대표가 알아야 할 일을 60자 이하 문장 최대 3개로. 0건 항목은 적지 않는다 */
export function buildWeeklyNotes(facts: WeeklyFacts): string[] {
  const notes: string[] = [];

  const agencies = facts.agencyLeads.filter((a) => a.count > 0).sort((x, y) => y.count - x.count);
  const leadTotal = agencies.reduce((sum, a) => sum + a.count, 0);
  if (leadTotal > 0) {
    const names = agencies.map((a) => `${a.name || '이름 없는 업체'} ${a.count}`).join('·');
    notes.push(clip(`업체 접수 ${leadTotal}건(${names})`));
  }

  if (facts.marketing.total > 0) {
    notes.push(clip(`마케팅 신청 ${facts.marketing.total}건(결제 ${facts.marketing.paid}건)`));
  }

  if (facts.legalDrafts.total > 0) {
    notes.push(clip(`AI 서면 초안 ${facts.legalDrafts.total}건, 그중 검토 대기 ${facts.legalDrafts.awaitingReview}건`));
  }

  return notes.slice(0, 3);
}
