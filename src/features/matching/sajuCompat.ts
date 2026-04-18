/**
 * 사주 궁합 (라이트 버전)
 * "재미로 보는 궁합" — 전통 명리학 참고 콘텐츠, 실제 관계 예측/보장 아님.
 *
 * 양력 생년월일 → 천간/지지 추출 → 오행 상생/상극 + 천간합/지지합 기반 궁합 산출
 */

// 천간 (十天干)
const HEAVENLY_STEMS = ['갑','을','병','정','무','기','경','신','임','계'] as const;
type HeavenlyStem = typeof HEAVENLY_STEMS[number];

// 지지 (十二地支)
const EARTHLY_BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const;
type EarthlyBranch = typeof EARTHLY_BRANCHES[number];

// 오행 (五行)
type Element = '목' | '화' | '토' | '금' | '수';

const STEM_ELEMENT: Record<HeavenlyStem, Element> = {
  '갑': '목', '을': '목',
  '병': '화', '정': '화',
  '무': '토', '기': '토',
  '경': '금', '신': '금',
  '임': '수', '계': '수',
};

const BRANCH_ELEMENT: Record<EarthlyBranch, Element> = {
  '인': '목', '묘': '목',
  '사': '화', '오': '화',
  '진': '토', '술': '토', '축': '토', '미': '토',
  '신': '금', '유': '금',
  '해': '수', '자': '수',
};

// 오행 상생 (서로 살리는 관계, +)
const GENERATES: Record<Element, Element> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
};

// 오행 상극 (서로 극하는 관계, -)
const OVERCOMES: Record<Element, Element> = {
  '목': '토', '화': '금', '토': '수', '금': '목', '수': '화',
};

// 천간합 (天干合) — 합이 되는 쌍
const STEM_UNIONS: [HeavenlyStem, HeavenlyStem][] = [
  ['갑','기'], ['을','경'], ['병','신'], ['정','임'], ['무','계'],
];

// 지지 육합 (地支六合)
const BRANCH_UNIONS: [EarthlyBranch, EarthlyBranch][] = [
  ['자','축'], ['인','해'], ['묘','술'], ['진','유'], ['사','신'], ['오','미'],
];

// 지지 삼합 (地支三合) — 같은 삼합국에 속하면 보너스
const BRANCH_TRIADS: EarthlyBranch[][] = [
  ['신','자','진'], // 수국
  ['해','묘','미'], // 목국
  ['인','오','술'], // 화국
  ['사','유','축'], // 금국
];

// 지지 충 (地支冲) — 대충 관계, 감점
const BRANCH_CLASHES: [EarthlyBranch, EarthlyBranch][] = [
  ['자','오'], ['축','미'], ['인','신'], ['묘','유'], ['진','술'], ['사','해'],
];

/** 양력 날짜로 연주(年柱)의 천간/지지 계산 */
function getYearPillar(year: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const stemIdx = ((year - 4) % 10 + 10) % 10;
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  return {
    stem: HEAVENLY_STEMS[stemIdx]!,
    branch: EARTHLY_BRANCHES[branchIdx]!,
  };
}

/** 양력 날짜로 월주(月柱)의 지지 계산 (간략 버전) */
function getMonthBranch(month: number): EarthlyBranch {
  const idx = ((month + 0) % 12 + 12) % 12;
  return EARTHLY_BRANCHES[idx]!;
}

/** 양력 날짜로 일주(日柱) 천간 계산 (간략 버전) */
function getDayStem(year: number, month: number, day: number): HeavenlyStem {
  const base = new Date(1900, 0, 1);
  const target = new Date(year, month - 1, day);
  const diff = Math.floor((target.getTime() - base.getTime()) / 86400000);
  const idx = (((diff % 10) + 6) % 10 + 10) % 10;
  return HEAVENLY_STEMS[idx]!;
}

function getDayBranch(year: number, month: number, day: number): EarthlyBranch {
  const base = new Date(1900, 0, 1);
  const target = new Date(year, month - 1, day);
  const diff = Math.floor((target.getTime() - base.getTime()) / 86400000);
  const idx = ((diff % 12) + 12) % 12;
  return EARTHLY_BRANCHES[idx]!;
}

type Pillar = { stem: HeavenlyStem; branch: EarthlyBranch };

function getPillars(dateStr: string): { year: Pillar; month: { branch: EarthlyBranch }; day: Pillar } {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return {
    year: getYearPillar(y),
    month: { branch: getMonthBranch(m) },
    day: { stem: getDayStem(y, m, d), branch: getDayBranch(y, m, d) },
  };
}

function checkUnion<T>(pairs: [T, T][], a: T, b: T): boolean {
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function checkTriad(a: EarthlyBranch, b: EarthlyBranch): boolean {
  return BRANCH_TRIADS.some((triad) => triad.includes(a) && triad.includes(b));
}

function elementRelation(a: Element, b: Element): 'generate' | 'overcome' | 'neutral' {
  if (GENERATES[a] === b || GENERATES[b] === a) return 'generate';
  if (OVERCOMES[a] === b || OVERCOMES[b] === a) return 'overcome';
  return 'neutral';
}

export type SajuCompatResult = {
  score: number;
  grade: string;
  gradeColor: string;
  description: string;
  elements: { a: Element; b: Element };
  disclaimer: string;
};

export function getSajuCompat(dateA: string, dateB: string): SajuCompatResult {
  const a = getPillars(dateA);
  const b = getPillars(dateB);

  let score = 50; // 기본 점수

  // 1. 연주 천간합 (+12)
  if (checkUnion(STEM_UNIONS, a.year.stem, b.year.stem)) score += 12;

  // 2. 연주 지지 육합 (+10)
  if (checkUnion(BRANCH_UNIONS, a.year.branch, b.year.branch)) score += 10;

  // 3. 연주 지지 삼합 (+7)
  if (checkTriad(a.year.branch, b.year.branch)) score += 7;

  // 4. 연주 지지 충 (-12)
  if (checkUnion(BRANCH_CLASHES, a.year.branch, b.year.branch)) score -= 12;

  // 5. 일주 천간합 (+10)
  if (checkUnion(STEM_UNIONS, a.day.stem, b.day.stem)) score += 10;

  // 6. 일주 지지 육합 (+8)
  if (checkUnion(BRANCH_UNIONS, a.day.branch, b.day.branch)) score += 8;

  // 7. 일주 지지 충 (-10)
  if (checkUnion(BRANCH_CLASHES, a.day.branch, b.day.branch)) score -= 10;

  // 8. 연주 오행 상생/상극
  const yearElA = STEM_ELEMENT[a.year.stem];
  const yearElB = STEM_ELEMENT[b.year.stem];
  const rel = elementRelation(yearElA, yearElB);
  if (rel === 'generate') score += 8;
  if (rel === 'overcome') score -= 5;

  // 9. 일주 오행 상생/상극
  const dayElA = STEM_ELEMENT[a.day.stem];
  const dayElB = STEM_ELEMENT[b.day.stem];
  const dayRel = elementRelation(dayElA, dayElB);
  if (dayRel === 'generate') score += 6;
  if (dayRel === 'overcome') score -= 4;

  // 10. 월지 삼합 보너스
  if (checkTriad(a.month.branch, b.month.branch)) score += 5;

  // 클램핑
  score = Math.max(20, Math.min(99, score));

  let grade: string;
  let gradeColor: string;
  let description: string;

  if (score >= 85) {
    grade = '천생연분';
    gradeColor = 'text-rose-600';
    description = '하늘이 맺어준 인연입니다. 서로를 깊이 이해하고 함께 성장하는 관계입니다.';
  } else if (score >= 70) {
    grade = '좋은 궁합';
    gradeColor = 'text-blue-600';
    description = '서로에게 좋은 기운을 주고받는 조화로운 관계입니다.';
  } else if (score >= 55) {
    grade = '무난한 궁합';
    gradeColor = 'text-slate-600';
    description = '큰 충돌 없이 안정적인 관계를 유지할 수 있습니다.';
  } else {
    grade = '노력이 필요한 궁합';
    gradeColor = 'text-amber-600';
    description = '서로 다른 기운이지만, 이해와 배려로 좋은 관계를 만들 수 있습니다.';
  }

  return {
    score,
    grade,
    gradeColor,
    description,
    elements: { a: yearElA, b: yearElB },
    disclaimer: '본 궁합은 전통 명리학을 참고한 재미 콘텐츠이며, 실제 관계에 대한 예측이나 보장이 아닙니다.',
  };
}

// 오행 이모지/색상 매핑
export const ELEMENT_STYLE: Record<Element, { emoji: string; color: string; bg: string }> = {
  '목': { emoji: '🌳', color: 'text-green-700', bg: 'bg-green-50' },
  '화': { emoji: '🔥', color: 'text-red-700', bg: 'bg-red-50' },
  '토': { emoji: '🏔️', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  '금': { emoji: '⚔️', color: 'text-slate-700', bg: 'bg-slate-50' },
  '수': { emoji: '💧', color: 'text-blue-700', bg: 'bg-blue-50' },
};
