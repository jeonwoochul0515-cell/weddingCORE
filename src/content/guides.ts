// 결혼중개업법 해석 글 전체 — 법령해석과 재결례를 한 목록으로 합친다
//
// 두 자료는 성격이 다르다. 법령해석은 "법을 어떻게 읽나", 재결례는 "그 처분이 정당했나"다.
// 파일은 나눠 두되 화면에서는 한 목록으로 보여주고 종류만 구분해 표시한다.

import { INTERPRETATIONS, type Interpretation } from './interpretations';
import { RULINGS } from './rulings';
import { COURT_CASES } from './courtCases';

export type { Interpretation, RulingCase } from './interpretations';
export { sourceUrl } from './interpretations';

/**
 * 형사 판례 → 재결례 → 법령해석 순으로 둔다.
 * 업체에게 급한 순서다. 형사처벌이 가장 무겁고, 그다음이 행정처분, 마지막이 해석이다.
 */
export const GUIDES: Interpretation[] = [...COURT_CASES, ...RULINGS, ...INTERPRETATIONS];

export const findGuide = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

export const COURT_COUNT = COURT_CASES.length;
export const RULING_COUNT = RULINGS.length;
export const INTERPRETATION_COUNT = INTERPRETATIONS.length;
