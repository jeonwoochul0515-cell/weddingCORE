// 판례·재결례 조회 창구 — 목록은 요약만, 본문은 열 때만 내려준다
//
// 왜 서버를 거치나. 다른 공통 데이터(법령·규제변동)는 클라이언트가 Firestore를 직접
// 읽지만, 판례 문서는 body가 최대 40,000자다. 클라이언트 SDK에는 필드 선택 조회가
// 없어서 목록 20건만 받아도 본문까지 통째로 따라온다. Admin SDK의 select()로 요약만
// 골라 내려주고, 본문은 상세를 열 때 단건으로 가져온다.
//
// 판례는 주 1회 수집이라 거의 늘지 않는다. 함수 인스턴스 메모리에 캐시를 두어
// 매 호출마다 574건을 다시 읽지 않는다.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
const REGION = 'asia-northeast3';
/** 목록에 쓰는 필드만. body와 holding 전문은 여기 담지 않는다. */
const SUMMARY_FIELDS = [
    'kind',
    'caseNumber',
    'caseName',
    'courtName',
    'agency',
    'decidedOn',
    'disposedOn',
    'caseType',
    'summary',
    'requirements',
    'requirementsWeak',
    'requirementConfidence',
    'tracks',
];
let cache = null;
const CACHE_TTL_MS = 30 * 60 * 1000;
const str = (v) => (typeof v === 'string' ? v : '');
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
async function loadRows() {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS)
        return cache.rows;
    const db = getFirestore();
    const snap = await db
        .collection('precedents')
        .select(...SUMMARY_FIELDS)
        .get();
    const rows = snap.docs.map((d) => {
        const v = d.data();
        const caseName = str(v.caseName);
        const summary = str(v.summary);
        return {
            id: d.id,
            kind: str(v.kind) === 'decc' ? 'decc' : 'prec',
            caseNumber: str(v.caseNumber),
            caseName,
            courtName: str(v.courtName),
            agency: str(v.agency),
            decidedOn: str(v.decidedOn),
            caseType: str(v.caseType),
            summary,
            requirements: arr(v.requirements),
            requirementsWeak: arr(v.requirementsWeak),
            requirementConfidence: v.requirementConfidence === 'reviewed'
                ? 'reviewed'
                : v.requirementConfidence === 'auto'
                    ? 'auto'
                    : 'none',
            // 검색은 사건명·요지에서만 한다. 본문까지 넣으면 인용된 다른 사건이 걸린다.
            searchText: `${caseName} ${summary} ${str(v.caseNumber)}`,
        };
    });
    cache = { at: Date.now(), rows };
    logger.info(`판례 캐시 적재 — ${rows.length}건`);
    return rows;
}
/** 선고일자는 '2024.05.16' 또는 '20240516'처럼 들어온다. 숫자만 남겨 비교한다. */
const dateKey = (s) => s.replace(/\D/g, '');
/**
 * 요건·종류·검색어로 좁혀 목록을 돌려준다.
 *
 * 요건 연결은 낱말 매칭에 기반한 자동 분류다. 화면에서 그 사실을 함께 보여줘야 한다.
 */
export const searchPrecedents = onCall({ region: REGION, timeoutSeconds: 30, memory: '512MiB' }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const data = (request.data ?? {});
    const requirement = str(data.requirement).trim();
    const kind = str(data.kind).trim();
    const keyword = str(data.keyword).trim();
    const limit = Math.min(Math.max(Number(data.limit) || 30, 1), 100);
    if (keyword.length > 60) {
        throw new HttpsError('invalid-argument', '검색어가 너무 깁니다.');
    }
    let rows = await loadRows();
    // 약한 연결까지 포함하면 걸리는 사건이 크게 늘지만 쟁점이 아닐 수 있다.
    // 켜고 끄는 것은 화면에서 정하고, 결과에는 어느 쪽으로 걸렸는지 남긴다.
    const includeWeak = data.includeWeak === true;
    if (requirement) {
        rows = rows.filter((r) => r.requirements.includes(requirement) ||
            (includeWeak && r.requirementsWeak.includes(requirement)));
    }
    if (kind === 'prec' || kind === 'decc')
        rows = rows.filter((r) => r.kind === kind);
    if (keyword) {
        const needle = keyword.toLowerCase();
        rows = rows.filter((r) => r.searchText.toLowerCase().includes(needle));
    }
    const total = rows.length;
    const items = rows
        .slice()
        .sort((a, b) => dateKey(b.decidedOn).localeCompare(dateKey(a.decidedOn)))
        .slice(0, limit)
        .map(({ searchText: _searchText, ...rest }) => ({
        ...rest,
        // 목록에서는 요지를 잘라 보낸다. 전문은 상세에서 본다.
        summary: rest.summary.slice(0, 300),
    }));
    return { items, total, returned: items.length };
});
/** 요건별 건수. 화면 필터에 "몇 건인지"를 함께 보여주기 위한 것이다. */
export const precedentCounts = onCall({ region: REGION, timeoutSeconds: 30, memory: '512MiB' }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const rows = await loadRows();
    const byRequirement = {};
    // 약한 연결까지 합친 건수. 화면에서 "포함" 토글을 켰을 때 보여줄 값이다.
    const byRequirementWithWeak = {};
    let prec = 0;
    let decc = 0;
    let unlinked = 0;
    for (const r of rows) {
        if (r.kind === 'decc')
            decc += 1;
        else
            prec += 1;
        if (r.requirements.length === 0 && r.requirementsWeak.length === 0)
            unlinked += 1;
        for (const k of r.requirements) {
            byRequirement[k] = (byRequirement[k] ?? 0) + 1;
        }
        // 같은 사건이 강·약 양쪽에 잡히는 일은 없지만, 중복 계산을 막아 둔다.
        for (const k of new Set([...r.requirements, ...r.requirementsWeak])) {
            byRequirementWithWeak[k] = (byRequirementWithWeak[k] ?? 0) + 1;
        }
    }
    return { total: rows.length, prec, decc, unlinked, byRequirement, byRequirementWithWeak };
});
/** 단건 전문. 목록에서 뺀 본문·주문·참조조문이 여기 들어 있다. */
export const getPrecedent = onCall({ region: REGION, timeoutSeconds: 30, memory: '256MiB' }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const id = str(request.data?.id).trim();
    if (!id) {
        throw new HttpsError('invalid-argument', '사건 식별자가 없습니다.');
    }
    const snap = await getFirestore().collection('precedents').doc(id).get();
    if (!snap.exists) {
        throw new HttpsError('not-found', '해당 사건을 찾을 수 없습니다.');
    }
    const v = snap.data() ?? {};
    return {
        id: snap.id,
        kind: str(v.kind) === 'decc' ? 'decc' : 'prec',
        caseNumber: str(v.caseNumber),
        caseName: str(v.caseName),
        courtName: str(v.courtName),
        agency: str(v.agency),
        decidedOn: str(v.decidedOn),
        disposedOn: str(v.disposedOn),
        caseType: str(v.caseType),
        summary: str(v.summary),
        holding: str(v.holding),
        disposition: str(v.disposition),
        references: str(v.references),
        body: str(v.body),
        requirements: arr(v.requirements),
        requirementsWeak: arr(v.requirementsWeak),
        requirementConfidence: v.requirementConfidence === 'reviewed'
            ? 'reviewed'
            : v.requirementConfidence === 'auto'
                ? 'auto'
                : 'none',
        sourceUrl: str(v.sourceUrl) || 'https://www.law.go.kr',
    };
});
