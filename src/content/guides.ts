// 결혼중개업법 해석 글 전체 — 법령해석과 재결례를 한 목록으로 합친다
//
// 두 자료는 성격이 다르다. 법령해석은 "법을 어떻게 읽나", 재결례는 "그 처분이 정당했나"다.
// 파일은 나눠 두되 화면에서는 한 목록으로 보여주고 종류만 구분해 표시한다.

import { INTERPRETATIONS, type Interpretation } from './interpretations';
import { RULINGS } from './rulings';

export type { Interpretation, RulingCase } from './interpretations';
export { sourceUrl } from './interpretations';

/** 재결례를 먼저 둔다. 업체에게는 "실제로 어떻게 됐나"가 더 급한 질문이다. */
export const GUIDES: Interpretation[] = [...RULINGS, ...INTERPRETATIONS];

export const findGuide = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;

export const RULING_COUNT = RULINGS.length;
export const INTERPRETATION_COUNT = INTERPRETATIONS.length;
