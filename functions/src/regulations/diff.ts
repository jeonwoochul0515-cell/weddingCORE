import type { ParsedArticle } from './crawler.js';

export type ArticleChange =
  | { kind: 'new'; article: ParsedArticle }
  | { kind: 'amended'; article: ParsedArticle; oldHash: string }
  | { kind: 'repealed'; articleNumber: string; oldHash: string };

/**
 * 크롤링한 최신 조항 배열과 Firestore에 저장된 기존 조항 맵을 비교하여
 * 신규/개정/폐지 변경을 산출.
 */
export function diffArticles(
  fresh: ParsedArticle[],
  existing: Map<string, { contentHash: string }>,
): ArticleChange[] {
  const changes: ArticleChange[] = [];
  const freshMap = new Map(fresh.map((a) => [a.articleNumber, a]));

  for (const article of fresh) {
    const prev = existing.get(article.articleNumber);
    if (!prev) {
      changes.push({ kind: 'new', article });
    } else if (prev.contentHash !== article.contentHash) {
      changes.push({ kind: 'amended', article, oldHash: prev.contentHash });
    }
  }

  for (const [num, prev] of existing) {
    if (!freshMap.has(num)) {
      changes.push({ kind: 'repealed', articleNumber: num, oldHash: prev.contentHash });
    }
  }

  return changes;
}
