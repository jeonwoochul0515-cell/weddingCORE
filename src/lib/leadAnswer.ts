// 답변엔진이 그대로 떼어 갈 「두괄식 답」을 만든다
//
// 왜 길이를 맞추나
//   ChatGPT·Perplexity·구글 AI 개요가 실제로 인용한 문단을 추적한 결과, 인용문은 거의 항상
//   영어 35~65단어 구간에 있었다. 35단어 아래면 근거 없는 주장처럼 읽히고, 65단어를 넘으면
//   모델이 임의로 잘라 뜻이 바뀌며, 80단어를 넘으면 아예 건너뛴다.
//   한국어에서 영어 word에 대응하는 단위는 어절(띄어쓰기 단위)이라 같은 수를 쓴다.
//   근거와 출처는 docs/검색최적화-2026-09-06.md의 「AI가 인용하는 길이」 절.
//
// 왜 글 전체 길이가 아니라 문단인가
//   구글 AI 개요 인용과 글자 수의 상관은 0.04로 사실상 무관하고, 인용의 절반 이상이
//   1,000단어 미만 글에서 나온다. 길이를 늘리는 것보다 「홀로 읽히는 문단」을 갖추는 것이 낫다.

export const LEAD_MIN_EOJEOL = 40;
export const LEAD_MAX_EOJEOL = 65;

/** 어절 수. 한국어에서 영어 word에 대응하는 단위다 */
export const eojeol = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export type LeadAnswer = {
  /** 굵게 보여 줄 결론 한 줄 */
  head: string;
  /** 결론을 홀로 읽히게 하는 뒷받침 문장들 */
  rest: string[];
  /** 화면과 스키마가 함께 쓰는 전체 문장 */
  text: string;
  eojeol: number;
};

/**
 * 앞에서부터 이어 붙이되 40어절을 넘기면 멈춘다. 첫 조각은 결론이라 언제나 들어간다.
 * 넣는 문장은 전부 화면에 있는 것이어야 한다 — 스키마와 화면이 어긋나면 스팸으로 처리된다.
 */
export function buildLeadAnswer(parts: Array<string | undefined | null>): LeadAnswer {
  const clean = parts.map((p) => (p ?? '').trim()).filter(Boolean);
  if (!clean.length) return { head: '', rest: [], text: '', eojeol: 0 };

  const head = clean[0]!;
  const rest: string[] = [];
  let n = eojeol(head);
  for (const part of clean.slice(1)) {
    if (n >= LEAD_MIN_EOJEOL) break;
    // 이미 넣은 문장이 또 들어오면 같은 말을 두 번 하게 된다
    if (rest.includes(part)) continue;
    rest.push(part);
    n += eojeol(part);
  }
  const text = [head, ...rest].join(' ');
  return { head, rest, text, eojeol: eojeol(text) };
}
