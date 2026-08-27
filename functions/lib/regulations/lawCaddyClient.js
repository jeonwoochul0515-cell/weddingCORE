// 법제처 자료를 law-caddy 창구를 거쳐 받아오는 클라이언트
//
// 법제처 Open API는 호출 서버의 IP·도메인을 사전 등록해야 응답한다.
// Cloud Functions는 IP가 고정되지 않아 직접 호출이 불가능하므로,
// 등록이 끝난 law-caddy.com을 유일한 창구로 쓴다. (전역 규칙 CLAUDE.md §20)
//
// 필요한 환경변수
//   LAW_CADDY_ENDPOINT — 기본값 https://law-caddy.com/api/precedent-search
//   LAW_CADDY_TOKEN    — law-caddy가 요구하는 인증 토큰
const DEFAULT_ENDPOINT = 'https://law-caddy.com/api/precedent-search';
export class LawCaddyUnavailableError extends Error {
}
/**
 * law-caddy를 거쳐 법제처 자료를 조회한다.
 * 인증 토큰이 없으면 호출을 시도하지 않고 명확히 실패시킨다.
 * 조용히 빈 배열을 돌려주면 "법령이 없다"와 "설정이 없다"를 구분할 수 없기 때문이다.
 */
export async function queryLawCaddy(params) {
    const endpoint = process.env.LAW_CADDY_ENDPOINT ?? DEFAULT_ENDPOINT;
    const token = process.env.LAW_CADDY_TOKEN;
    if (!token) {
        throw new LawCaddyUnavailableError('LAW_CADDY_TOKEN이 없습니다. 법제처 자료는 law-caddy를 거쳐야 받을 수 있습니다.');
    }
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            // law-caddy 미들웨어가 검사하는 서비스 간 호출 헤더
            'X-Internal-Token': token,
        },
        body: JSON.stringify({
            query: params.query,
            target: params.target,
            count: params.count ?? 10,
            ...(params.jo ? { jo: params.jo } : {}),
            ...(params.mst ? { mst: params.mst } : {}),
        }),
    });
    if (!response.ok) {
        const detail = await response.text();
        throw new LawCaddyUnavailableError(`law-caddy 조회 실패 (HTTP ${response.status}): ${detail.slice(0, 200)}`);
    }
    return (await response.json());
}
/** 설정이 갖춰졌는지 미리 확인한다. 화면에서 "법령 근거 준비 중"을 알릴 때 쓴다. */
export function isLawCaddyConfigured() {
    return Boolean(process.env.LAW_CADDY_TOKEN);
}
