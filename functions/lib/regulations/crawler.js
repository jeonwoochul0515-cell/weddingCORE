/**
 * 법령 조문 수집 클라이언트.
 *
 * 법제처 Open API는 호출 서버의 IP·도메인을 사전 등록해야 응답하므로 Cloud Functions에서
 * 직접 부를 수 없다. 등록이 끝난 law-caddy를 유일한 창구로 거친다. (전역 규칙 CLAUDE.md §20)
 *
 * 사전 준비: Secret Manager에 LAW_CADDY_TOKEN 등록 후 함수에 연결.
 */
import { createHash } from 'node:crypto';
import { queryLawCaddy } from './lawCaddyClient.js';
/**
 * 법령 전문을 조문 단위로 가져온다.
 * law-caddy의 target=lawBody가 법제처 lawService.do를 중계해 조문 전체를 준다.
 * (target=law는 법령 목록 검색이라 조문 본문이 없다)
 */
export async function fetchStatuteArticles(lawName, mst) {
    const res = await queryLawCaddy({
        target: 'lawBody',
        query: lawName,
        ...(mst ? { mst } : {}),
    });
    return (res.articles ?? []).map((a) => {
        const content = normalizeContent(a.articleContent ?? '');
        return {
            articleNumber: String(a.articleNumber ?? '').trim(),
            title: String(a.articleTitle ?? '').trim(),
            content,
            contentHash: sha256(content),
        };
    });
}
function normalizeContent(s) {
    // 공백/개행 정규화 (해시 안정성 확보)
    return s.replace(/\s+/g, ' ').trim();
}
function sha256(s) {
    return createHash('sha256').update(s, 'utf8').digest('hex');
}
