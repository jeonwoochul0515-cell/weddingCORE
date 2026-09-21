// 한 번에 여러 명을 보여주는 자리를 막는다
//
// 결혼중개업법 제12조의2 ①은 18세 미만 소개(1호) 말고도 세 가지를 더 금지한다.
//
//   2호 — 이용자에게 **같은 시간에 2명 이상의 상대방**을 소개하는 행위
//   3호 — **같은 날, 같은 장소에서 2명 이상의 이용자에게 2명 이상의 상대방**을
//          동시 또는 순차적으로 소개하는 행위
//   4호 — 결혼중개를 목적으로 2명 이상의 외국인을 같은 장소에 기숙시키는 행위
//
// 왜 이것이 제품의 일인가. 현지에서 하루에 몰아서 보는 것이 업계의 오래된 방식이다.
// 「어차피 비행기 값이 드니 한 번에 여럿 본다」는 말이 실제로 오간다. 그런데 그 자리가
// 정확히 2호·3호다. 재결례에서 이를 이유로 영업정지 3개월 처분이 이뤄진 사건이 있다.
// 일정을 우리 화면에서 잡으면 이 줄이 자동으로 보이게 하는 것이 코어에 맞다.
//
// ★ 4호(기숙)는 여기서 판정하지 않는다. 숙소 자료를 우리가 들고 있지 않다.
//   없는 판정을 있는 척하지 않는다 — 계약서 점검 항목(§11 금지행위)에서 사람이 본다.
//
// ★ 2호는 「이용자에게」로 시작한다. 한 후보를 두 고객에게 같은 시각에 보여 주는 것은
//   조문의 문언에 없다. 상식적으로 나쁜 일이어도 법에 없는 요구는 적지 않는다.

import type { Blocker, Penalty } from './videoCallGate.js';

/** 판정에 필요한 약속 한 건. 저장소 모양에 기대지 않는다 */
export type ScheduledMeeting = {
  id: string;
  clientId: string;
  partnerId: string;
  /** 한국인 고객 이름. 막을 때 누구와 겹치는지 말해 주려고 받는다 */
  clientName?: string;
  partnerName?: string;
  /** 시작 시각(ms). 읽을 수 없으면 판정에서 뺀다 */
  startMs: number | null;
  durationMinutes: number;
  /**
   * 직접 만나는 자리의 장소. 화상이면 null.
   * 이름과 주소를 합쳐 넘긴다 — 「하노이 OO호텔 로비」처럼 사람이 적는 그대로다.
   */
  place: string | null;
  mode: 'online' | 'offline';
  status: string;
};

/**
 * 살아 있는 약속만 센다.
 *
 * 취소·불참은 소개가 이뤄지지 않은 자리다. 끝난 약속(done)은 센다 —
 * 3호는 「동시 또는 순차적으로」라 이미 오전에 한 건을 했으면 그날 두 번째가 위반이다.
 */
const LIVE_STATUSES = new Set(['planned', 'confirmed', 'done']);

/** 위반 시 받는 것. src/content/lawArticles.ts·rulings.ts에 적힌 것을 그대로 옮긴다 */
const PENALTY_PROHIBITED: Penalty = {
  criminal: '3년 이하 징역 또는 3천만원 이하 벌금 (법 제26조 제2항 제9호)',
  administrative: '등록취소 또는 영업정지 (법 제18조 제1항 제18호)',
  precedent: '한 번의 맞선에서 2명 이상을 소개한 것을 이유로 영업정지 3개월 처분이 이뤄진 사건이 있다.',
};

const HOUR = 60 * 60 * 1000;
/** 한국 표준시. 「같은 날」은 업체가 사는 시간대로 센다 */
const KST_OFFSET = 9 * HOUR;

/** 한국 시각 기준 며칠인가. 'YYYY-MM-DD' */
export function dayKeyKst(ms: number): string {
  return new Date(ms + KST_OFFSET).toISOString().slice(0, 10);
}

/** 장소 이름을 견줄 수 있게 다듬는다. 띄어쓰기와 대소문자는 같은 곳을 다르게 보이게 한다 */
export function placeKey(place: string | null): string | null {
  if (!place) return null;
  const key = place.replace(/\s+/g, '').toLowerCase();
  return key.length > 0 ? key : null;
}

const endOf = (m: ScheduledMeeting) =>
  (m.startMs ?? 0) + Math.max(1, m.durationMinutes) * 60 * 1000;

/** 두 약속의 시간이 겹치는가. 끝나는 시각과 시작 시각이 같은 것은 안 겹친 것이다 */
export function overlaps(a: ScheduledMeeting, b: ScheduledMeeting): boolean {
  if (a.startMs === null || b.startMs === null) return false;
  return a.startMs < endOf(b) && b.startMs < endOf(a);
}

/**
 * 이 약속을 확정해도 제12조의2 ① 2호·3호에 걸리지 않는가.
 *
 * others에는 같은 업체의 다른 약속을 넣는다. 자기 자신이 섞여 들어와도 id로 걸러낸다.
 */
export function checkIntroductionLimits(
  target: ScheduledMeeting,
  others: ScheduledMeeting[],
): Blocker[] {
  const blockers: Blocker[] = [];
  if (target.startMs === null) {
    return [
      {
        kind: 'introduction',
        reason: '약속 시각이 없습니다.',
        remedy: '날짜와 시각을 정해 주세요. 시각이 없으면 같은 시간에 겹치는 자리가 있는지 볼 수 없습니다.',
        legalBasis: '결혼중개업법 제12조의2 ① 2호 (같은 시간 2명 이상 소개 금지)',
        penalty: PENALTY_PROHIBITED,
      },
    ];
  }

  const live = others.filter((m) => m.id !== target.id && LIVE_STATUSES.has(m.status));

  // ── 2호. 같은 고객이 같은 시간에 다른 후보를 만나는 자리 ──────────────
  const sameTime = live.filter(
    (m) => m.clientId === target.clientId && m.partnerId !== target.partnerId && overlaps(target, m),
  );
  if (sameTime.length > 0) {
    const names = [...new Set(sameTime.map((m) => m.partnerName || '이름 미입력'))].join(', ');
    blockers.push({
      kind: 'introduction',
      reason: `같은 시간에 ${target.clientName || '이 고객'}의 다른 맞선이 ${sameTime.length}건 있습니다 (${names}).`,
      remedy: '시간을 겹치지 않게 옮기거나, 한쪽 약속을 취소해 주세요.',
      legalBasis: '결혼중개업법 제12조의2 ① 2호 (이용자에게 같은 시간에 2명 이상 소개 금지)',
      penalty: PENALTY_PROHIBITED,
    });
  }

  // ── 3호. 같은 날 같은 장소에 이용자 2명 이상 × 상대방 2명 이상 ────────
  //
  // 「같은 장소」가 요건이라 화상 약속은 여기에 해당하지 않는다고 본다.
  // 직접 만나는데 장소를 안 적었으면 판정할 수가 없다 — 그때는 적어 달라고 막는다.
  // 모르는 채로 확정하면 위반인지 아닌지도 모르는 상태로 사람이 만난다.
  if (target.mode === 'offline') {
    const key = placeKey(target.place);
    if (!key) {
      blockers.push({
        kind: 'introduction',
        reason: '만나는 장소가 적혀 있지 않습니다.',
        remedy: '장소를 적어 주세요. 같은 날 같은 장소에서 여러 건이 겹치는지 확인해야 확정할 수 있습니다.',
        legalBasis: '결혼중개업법 제12조의2 ① 3호 (같은 날 같은 장소에서 2명 이상에게 2명 이상 소개 금지)',
        penalty: PENALTY_PROHIBITED,
      });
    } else {
      const day = dayKeyKst(target.startMs);
      const together = live.filter(
        (m) =>
          m.mode === 'offline' &&
          m.startMs !== null &&
          dayKeyKst(m.startMs) === day &&
          placeKey(m.place) === key,
      );
      const clients = new Set([target.clientId, ...together.map((m) => m.clientId)]);
      const partners = new Set([target.partnerId, ...together.map((m) => m.partnerId)]);
      if (clients.size >= 2 && partners.size >= 2) {
        blockers.push({
          kind: 'introduction',
          reason:
            `같은 날 같은 장소(${target.place})에 고객 ${clients.size}명과 후보 ${partners.size}명의 만남이 잡혀 있습니다.`,
          remedy:
            '날짜나 장소를 나눠 주세요. 시간을 나누는 것만으로는 풀리지 않습니다 — 조문이 「동시 또는 순차적으로」를 함께 막습니다.',
          legalBasis:
            '결혼중개업법 제12조의2 ① 3호 (같은 날 같은 장소에서 2명 이상의 이용자에게 2명 이상의 상대방 소개 금지)',
          penalty: PENALTY_PROHIBITED,
        });
      }
    }
  }

  return blockers;
}
