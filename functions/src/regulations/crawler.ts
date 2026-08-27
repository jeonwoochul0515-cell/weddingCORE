/**
 * law.go.kr Open API 클라이언트.
 *
 * 사전 준비:
 *   1. https://open.law.go.kr 에서 사용자 등록 후 OC(조회용 계정 ID) 발급
 *   2. Firebase Functions 환경변수에 `LAW_GO_KR_OC` 설정:
 *        firebase functions:config:set law.oc="YOUR_OC"
 *      또는 v2 방식 (.env):
 *        functions/.env 파일에 LAW_GO_KR_OC=xxx
 */

import { createHash } from 'node:crypto';
import { queryLawCaddy } from './lawCaddyClient.js';
import { LAW_GO_KR_BASE } from './config.js';

export type ParsedArticle = {
  articleNumber: string;
  title: string;
  content: string;
  contentHash: string;
};

/**
 * 법령 전문을 law.go.kr에서 가져와 조항 단위로 파싱.
 * API: lawService.do?OC=xxx&target=law&type=JSON&LM=<lawName> 또는 MST=<mst>
 */
export async function fetchStatuteArticles(
  lawName: string,
  mst?: string,
): Promise<ParsedArticle[]> {
  // 법제처는 호출 서버의 IP·도메인을 사전 등록해야 응답한다. Cloud Functions는 IP가
  // 고정되지 않으므로 등록이 끝난 law-caddy를 거친다. (전역 규칙 CLAUDE.md §20)
  const json = await queryLawCaddy<LawServiceResponse>({
    target: 'law',
    query: mst ?? lawName,
    count: 1,
  });

  // 실제 응답 구조는 ?{조문단위: [ {조문번호, 조문제목, 조문내용}, ... ]}
  const articles = json?.법령?.조문?.조문단위 ?? [];
  return articles.map((a) => {
    const content = normalizeContent(a.조문내용 ?? '');
    return {
      articleNumber: String(a.조문번호 ?? '').trim(),
      title: String(a.조문제목 ?? '').trim(),
      content,
      contentHash: sha256(content),
    };
  });
}

function normalizeContent(s: string): string {
  // 공백/개행 정규화 (해시 안정성 확보)
  return s.replace(/\s+/g, ' ').trim();
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// ===== 응답 타입 (law.go.kr API의 느슨한 구조를 가정) =====
type LawServiceResponse = {
  법령?: {
    조문?: {
      조문단위?: Array<{
        조문번호?: string | number;
        조문제목?: string;
        조문내용?: string;
      }>;
    };
  };
};
