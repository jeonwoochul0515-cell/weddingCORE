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
    return (res.articles ?? [])
        .filter((a) => !isStructuralHeading(a.articleTitle, a.articleContent))
        .map((a) => {
        const content = normalizeContent(a.articleContent ?? '');
        return {
            // 제10조와 제10조의2는 조문번호가 둘 다 "10"이다. 가지번호를 붙이지 않으면
            // 문서 ID가 겹쳐 조문이 서로 덮어써진다(신상정보 제공 조항 등이 통째로 사라짐).
            articleNumber: articleKey(a.articleNumber, a.articleBranch),
            title: String(a.articleTitle ?? '').trim(),
            content,
            contentHash: sha256(content),
        };
    });
}
/**
 * 편·장·절·관 제목인지 판별한다.
 * 법제처는 "제3장 외국인의 입국"처럼 편제 표시도 조문단위에 담아 보내는데,
 * 이들은 바로 뒤 조문과 같은 조문번호를 쓴다. 조문으로 저장하면 서로 덮어쓴다.
 */
function isStructuralHeading(title, content) {
    if (String(title ?? '').trim())
        return false;
    // "제3장 총칙"뿐 아니라 "제6절의2 의견진술", "제8장의2 출국대기실"처럼
    // 가지 편제도 있다. 이들도 바로 뒤 조문과 번호가 겹친다.
    return /^제\s*\d+\s*(편|장|절|관)(의\s*\d+)?\s/.test(String(content ?? '').trim());
}
/** 조문 식별자. 가지조문은 "10-2" 형태로 구분한다. */
function articleKey(number, branch) {
    const base = String(number ?? '').trim();
    const sub = String(branch ?? '').trim();
    return sub && sub !== '0' ? `${base}-${sub}` : base;
}
function normalizeContent(s) {
    // 공백/개행 정규화 (해시 안정성 확보)
    return s.replace(/\s+/g, ' ').trim();
}
function sha256(s) {
    return createHash('sha256').update(s, 'utf8').digest('hex');
}
