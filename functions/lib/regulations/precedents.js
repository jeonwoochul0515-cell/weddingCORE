// 비자 거부·불허 사건의 판례와 결정례를 모으는 수집기
//
// 왜 필요한가: 조문만으로는 "왜 거부되는가"를 알 수 없다. 실제 거부 사유와
// 그것이 어떤 논리로 유지되거나 뒤집혔는지는 판례·결정례에 있다.
// 이 자료가 있어야 문서 초안이 "근거 있는 문서"가 된다.
//
// 법제처는 호출 도메인을 사전 등록해야 응답하므로 law-caddy 창구를 거친다.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { queryLawCaddyRaw } from './lawCaddyClient.js';
const REGION = 'asia-northeast3';
const TZ = 'Asia/Seoul';
/**
 * 수집 질의. 법제처는 질의를 엄격히 매칭하므로 두 단어를 붙이면 0건이 나온다.
 * 처분 이름 그대로 한 덩어리씩 던진다.
 */
const CASE_QUERIES = [
    // 처분 이름 그대로 던진다. 두 단어를 붙이면 법제처가 0건을 준다.
    { q: '사증발급거부', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '사증발급', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '체류자격', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '체류기간연장불허가', tracks: ['extension'], kind: 'prec' },
    { q: '체류자격변경불허가', tracks: ['extension', 'study'], kind: 'prec' },
    { q: '외국인등록', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '출국명령', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '강제퇴거', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '불법체류', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '출입국관리법위반', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '통보의무', tracks: ['marriage', 'study', 'extension'], kind: 'prec' },
    { q: '결혼이민', tracks: ['marriage'], kind: 'prec' },
    { q: '국제결혼', tracks: ['marriage'], kind: 'prec' },
    { q: '혼인무효', tracks: ['marriage'], kind: 'prec' },
    { q: '귀화', tracks: ['marriage'], kind: 'prec' },
    { q: '국적취득', tracks: ['marriage'], kind: 'prec' },
    { q: '국적신청불허', tracks: ['marriage'], kind: 'prec' },
    { q: '결혼중개업', tracks: ['marriage'], kind: 'prec' },
    { q: '유학', tracks: ['study'], kind: 'prec' },
    { q: '난민인정', tracks: ['extension'], kind: 'prec' },
    { q: '난민불인정', tracks: ['extension'], kind: 'prec' },
    // 행정심판 재결례(국민권익위원회). '사증' 한 단어로 던지면 "항공신체검사증명" 같은
    // 부분 문자열 오탐이 섞이므로 처분 이름으로 좁힌다.
    { q: '사증발급거부', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
    { q: '사증발급', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
    { q: '사증발급인정서', tracks: ['marriage', 'study'], kind: 'decc' },
    { q: '체류자격', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
    { q: '체류기간연장', tracks: ['extension'], kind: 'decc' },
    { q: '체류자격변경', tracks: ['extension', 'study'], kind: 'decc' },
    { q: '근무처변경', tracks: ['extension'], kind: 'decc' },
    { q: '출국명령', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
    { q: '국제결혼', tracks: ['marriage'], kind: 'decc' },
    { q: '결혼중개업', tracks: ['marriage'], kind: 'decc' },
    { q: '귀화', tracks: ['marriage'], kind: 'decc' },
    { q: '유학', tracks: ['study'], kind: 'decc' },
    { q: '외국인근로자', tracks: ['extension'], kind: 'decc' },
    { q: '난민인정', tracks: ['extension'], kind: 'decc' },
    // 2차 확장. 실효성을 미리 재서 결과가 있는 것만 남겼다.
    // '이혼'(674건)·'보호명령'(107건)은 일반 가사·가정폭력 사건이 대부분이라 넣지 않는다.
    // 관련성 검사(isRelevant)가 걸러내긴 하지만, 조회 자체가 낭비다.
    { q: '체류허가', tracks: ['extension'], kind: 'decc' }, // 재결례 120건. 이번 확장의 핵심
    { q: '체류허가', tracks: ['extension'], kind: 'prec' },
    { q: '영주', tracks: ['marriage', 'extension'], kind: 'prec' },
    { q: '영주', tracks: ['marriage', 'extension'], kind: 'decc' },
    { q: '신원보증', tracks: ['marriage', 'study'], kind: 'prec' },
    { q: '초청', tracks: ['marriage'], kind: 'prec' },
    { q: '입국불허', tracks: ['marriage', 'study', 'extension'], kind: 'decc' },
    { q: '재입국허가', tracks: ['extension'], kind: 'decc' },
    { q: '등록외국인', tracks: ['extension'], kind: 'prec' },
    { q: '외국인보호', tracks: ['extension'], kind: 'prec' },
    { q: '보호일시해제', tracks: ['extension'], kind: 'decc' },
    { q: '간이귀화', tracks: ['marriage'], kind: 'decc' },
    { q: '국적판정', tracks: ['marriage'], kind: 'prec' },
    { q: '혼인파탄', tracks: ['marriage'], kind: 'prec' },
    { q: '난민신청', tracks: ['extension'], kind: 'prec' },
    // 통고처분·범칙금은 출입국사범 사건이 섞여 있으나 관세·도로교통이 더 많다.
    // 관련성 검사에 걸러지도록 두되 조회는 한다 — 출입국사범 사건이 실무에 직결된다.
    { q: '통고처분', tracks: ['extension'], kind: 'decc' },
    { q: '출입국사범', tracks: ['extension'], kind: 'prec' },
    // 유학 트랙 보강 시도. 결과는 신규 0건이었다(2026-08-28 실측).
    // 후보 검색어를 전부 재도 17건뿐이었고, 그 17건이 모두 관련성 검사에 걸러졌다
    // — 학사 징계·학위 다툼이지 비자 사건이 아니었다.
    // ⇒ 유학 비자 거부는 재신청이 빨라 다투지 않는다는 것이 실증됐다.
    //   유학 요건의 기준은 판례가 아니라 시행규칙 별표와 교육부 교육국제화역량
    //   인증제(인증 여부가 재정 증빙 요구 수준을 좌우한다)에서 와야 한다.
    // 질의는 남겨 둔다 — "이미 다 뒤졌다"는 기록이자, 나중에 사건이 생기면 잡힌다.
    // '제적'(246건)은 학생 징계·군 제적이 대부분이라 넣지 않는다.
    { q: '유학생', tracks: ['study'], kind: 'decc' },
    { q: '입학허가', tracks: ['study'], kind: 'prec' },
    { q: '입학허가', tracks: ['study'], kind: 'decc' },
    { q: '대학원', tracks: ['study'], kind: 'prec' },
    { q: '대학원', tracks: ['study'], kind: 'decc' },
    { q: '휴학', tracks: ['study'], kind: 'decc' },
];
/**
 * 우리 영역의 사건인지 본다.
 *
 * 법제처 검색은 낱말만 맞으면 돌려주므로 '통고처분'에 관세 사건이, '영주'에
 * 지명이 섞인다. 무관한 사건이 쌓이면 나중에 근거로 인용할 때 걸러낼 수 없다.
 * 저장 전에 한 번 거른다.
 */
const DOMAIN_TERMS = [
    '출입국관리법',
    '체류자격',
    '체류기간',
    '사증',
    '외국인등록',
    '강제퇴거',
    '출국명령',
    '입국금지',
    '귀화',
    '국적법',
    '난민',
    '결혼중개',
    '재외동포',
    '영주자격',
    '외국인근로자',
    '고용허가',
    '출입국·외국인',
    '출입국관리사무소',
];
/**
 * 부분문자열 오탐을 막는다.
 * '사증'을 그냥 includes로 찾으면 "준공검사증발급", "항공신체검사증명"이 걸린다.
 * 실제로 「하천공작물(보)설치공사준공검사증발급처분취소」가 이렇게 들어왔다.
 * 앞 글자가 한글이면 다른 낱말의 일부이므로 제외한다.
 */
const BOUNDARY_TERMS = {
    사증: /(?<![가-힣])사증/,
    귀화: /(?<![가-힣])귀화/,
};
function hasTerm(text, term) {
    const re = BOUNDARY_TERMS[term];
    return re ? re.test(text) : text.includes(term);
}
function isRelevant(...parts) {
    const text = parts.join(' ');
    return DOMAIN_TERMS.some((t) => hasTerm(text, t));
}
function toArray(v) {
    if (!v)
        return [];
    return Array.isArray(v) ? v : [v];
}
/** 법제처 본문에는 <br/>와 공백이 섞여 온다. 검색·인용에 쓰려면 평문으로 만든다. */
function clean(html) {
    return String(html ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
async function searchList(kind, query, display = 50) {
    const res = await queryLawCaddyRaw({
        target: kind,
        query,
        display: String(display),
    });
    const rootKey = kind === 'prec' ? 'PrecSearch' : 'Decc';
    const root = res[rootKey];
    return toArray((root?.prec ?? root?.decc));
}
async function fetchDetail(kind, id) {
    const res = await queryLawCaddyRaw({ target: kind, ID: id }, 'service');
    const root = (res.PrecService ?? res.DeccService ?? res.prec ?? res.decc ?? res);
    return root ?? {};
}
async function runCollect(limitPerQuery = 100) {
    const db = getFirestore();
    let seen = 0;
    let saved = 0;
    let offTopic = 0;
    const skipped = [];
    for (const { q, tracks, kind } of CASE_QUERIES) {
        let list = [];
        try {
            list = await searchList(kind, q, limitPerQuery);
        }
        catch (error) {
            logger.warn(`[${q}] 목록 조회 실패`, error);
            skipped.push(q);
            continue;
        }
        seen += list.length;
        for (const item of list.slice(0, limitPerQuery)) {
            const serial = String(item['판례일련번호'] ?? item['행정심판재결례일련번호'] ?? item['id'] ?? '').trim();
            const caseNumber = String(item['사건번호'] ?? item['사건번호'] ?? '').trim();
            const docId = serial || caseNumber;
            if (!docId)
                continue;
            const ref = db.collection('precedents').doc(docId);
            const existing = await ref.get();
            if (existing.exists) {
                // 이미 있는 판례는 트랙 표시만 넓힌다. 본문을 다시 받지 않아 호출을 아낀다.
                await ref.update({
                    tracks: FieldValue.arrayUnion(...tracks),
                    matchedBy: FieldValue.arrayUnion(q),
                });
                continue;
            }
            let detail = {};
            try {
                detail = await fetchDetail(kind, serial || caseNumber);
            }
            catch (error) {
                logger.warn(`[${docId}] 상세 조회 실패`, error);
            }
            // 판례와 행정심판 재결례는 필드 이름이 다르다. 재결례에는 "왜 거부했고
            // 왜 유지·취소됐는지"가 이유·재결요지에 들어 있어 실무에서 가장 값지다.
            const isRuling = kind === 'decc';
            const caseName = clean(item['사건명'] ?? detail['사건명']);
            const holding = clean(isRuling ? detail['재결요지'] : detail['판결요지']);
            const references = clean(detail['참조조문']);
            const body = clean(isRuling ? detail['이유'] : detail['판례내용']);
            // 낱말만 맞은 무관한 사건은 저장하지 않는다. 한 번 섞이면 나중에 걸러낼 수 없다.
            if (!isRelevant(caseName, holding, references, body.slice(0, 5000))) {
                offTopic += 1;
                continue;
            }
            await ref.set({
                kind,
                caseNumber: caseNumber || clean(detail['사건번호']),
                caseName,
                courtName: clean(item['법원명'] ?? item['재결청'] ?? detail['재결청']),
                // 재결례는 처분청(거부한 기관)이 누구인지가 중요하다
                agency: clean(item['처분청'] ?? detail['처분청']),
                decidedOn: clean(item['선고일자'] ?? item['의결일자'] ?? detail['의결일자']),
                disposedOn: clean(item['처분일자'] ?? detail['처분일자']),
                caseType: clean(item['사건종류명'] ?? item['재결구분명'] ?? detail['재결례유형명']),
                summary: clean(isRuling ? detail['청구취지'] : detail['판시사항']).slice(0, 4000),
                holding: holding.slice(0, 8000),
                disposition: clean(detail['주문']).slice(0, 2000),
                references: references.slice(0, 2000),
                body: body.slice(0, 40000),
                tracks,
                matchedBy: [q],
                sourceUrl: 'https://www.law.go.kr',
                collectedAt: FieldValue.serverTimestamp(),
            });
            saved += 1;
        }
    }
    logger.info(`판례 수집 — 조회 ${seen}건 · 신규 ${saved}건 · 무관 제외 ${offTopic}건 · 실패 질의 ${skipped.length}`);
    return { ok: true, seen, saved, offTopic, skippedQueries: skipped };
}
/** 판례는 자주 늘지 않는다. 주 1회면 충분하다. */
export const collectPrecedents = onSchedule({
    region: REGION,
    schedule: '0 4 * * 0',
    timeZone: TZ,
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: ['LAW_CADDY_TOKEN'],
}, async () => {
    await runCollect();
});
export const runPrecedentCollectNow = onCall({ region: REGION, timeoutSeconds: 540, secrets: ['LAW_CADDY_TOKEN'] }, async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
    }
    return runCollect();
});
