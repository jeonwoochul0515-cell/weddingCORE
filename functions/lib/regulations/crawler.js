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
import { LAW_GO_KR_BASE } from './config.js';
/**
 * 법령 전문을 law.go.kr에서 가져와 조항 단위로 파싱.
 * API: lawService.do?OC=xxx&target=law&type=JSON&LM=<lawName> 또는 MST=<mst>
 */
export async function fetchStatuteArticles(lawName, mst) {
    const oc = process.env.LAW_GO_KR_OC;
    if (!oc) {
        throw new Error('LAW_GO_KR_OC 환경변수가 설정되지 않았습니다.');
    }
    const params = new URLSearchParams({
        OC: oc,
        target: 'law',
        type: 'JSON',
    });
    if (mst)
        params.set('MST', mst);
    else
        params.set('LM', lawName);
    const url = `${LAW_GO_KR_BASE}/lawService.do?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`law.go.kr 조회 실패 (${res.status}): ${lawName}`);
    }
    const json = (await res.json());
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
function normalizeContent(s) {
    // 공백/개행 정규화 (해시 안정성 확보)
    return s.replace(/\s+/g, ' ').trim();
}
function sha256(s) {
    return createHash('sha256').update(s, 'utf8').digest('hex');
}
