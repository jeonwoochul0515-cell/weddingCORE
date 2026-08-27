// 법제처 개정 공시를 훑어 우리 사업과 관련된 변경만 골라내는 모듈
//
// 조문 전문을 매일 내려받아 글자를 대조하는 방식은 낭비가 크고, 실무를 실제로
// 좌우하는 고시·훈령(행정규칙) 변경은 아예 잡지 못한다. 법제처는 공포·발령
// 목록을 날짜와 함께 제공하므로, 그 목록에서 우리 관심사만 걸러낸다.
//
// 이 방식의 이점은 "시행 전에 미리 안다"는 것이다. 공시에는 시행일이 있어
// 아직 시행되지 않은 개정도 예고로 잡을 수 있다.
import { queryLawCaddyRaw } from './lawCaddyClient.js';
import { ADMIN_RULE_KEYWORDS, MONITORED_STATUTES, RELEVANT_MINISTRIES } from './config.js';
function toArray(value) {
    if (!value)
        return [];
    return Array.isArray(value) ? value : [value];
}
function ymd(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
/** 최근 N일 사이에 공포된 법령 목록. 하루만 보면 주말·공휴일에 놓치므로 여유를 둔다. */
export async function fetchRecentLaws(days = 7) {
    const res = await queryLawCaddyRaw({
        target: 'law',
        ancYd: `${ymd(-days)}~${ymd(0)}`,
        sort: 'ddes',
        display: '100',
    });
    return toArray(res.LawSearch?.law).map((x) => ({
        kind: 'law',
        name: String(x['법령명한글'] ?? '').trim(),
        promulgatedOn: String(x['공포일자'] ?? '').trim(),
        enforcedOn: String(x['시행일자'] ?? '').trim() || null,
        revisionType: String(x['제개정구분명'] ?? '').trim() || null,
        ministry: String(x['소관부처명'] ?? '').trim() || null,
        detailPath: String(x['법령상세링크'] ?? '').trim() || null,
        sourceId: String(x['법령ID'] ?? x['법령일련번호'] ?? '').trim() || null,
    }));
}
/**
 * 최근 발령된 행정규칙 목록.
 * 행정규칙은 날짜 범위 필터가 법령과 달라 최신순 정렬로 받아 날짜로 자른다.
 */
export async function fetchRecentAdminRules(days = 7, display = 200) {
    const res = await queryLawCaddyRaw({
        target: 'admrul',
        sort: 'ddes',
        display: String(display),
    });
    const cutoff = ymd(-days);
    return toArray(res.AdmRulSearch?.admrul)
        .map((x) => ({
        kind: 'admrul',
        name: String(x['행정규칙명'] ?? '').trim(),
        promulgatedOn: String(x['발령일자'] ?? '').trim(),
        enforcedOn: String(x['시행일자'] ?? '').trim() || null,
        revisionType: String(x['제개정구분명'] ?? x['행정규칙종류'] ?? '').trim() || null,
        ministry: String(x['소관부처명'] ?? '').trim() || null,
        detailPath: String(x['행정규칙상세링크'] ?? '').trim() || null,
        sourceId: String(x['행정규칙일련번호'] ?? '').trim() || null,
    }))
        .filter((item) => item.promulgatedOn >= cutoff);
}
/** 공백·중점 차이로 매칭이 어긋나지 않게 정규화한다. */
function normalize(name) {
    return name.replace(/[\s·ㆍ・]/g, '');
}
/**
 * 공시 목록에서 우리 사업과 관련된 것만 고른다.
 * 법령은 이름이 정확히 일치해야 하고, 행정규칙은 키워드를 포함하면 잡는다.
 * (행정규칙은 이름이 제각각이라 정확 매칭이 불가능하다)
 */
export function selectRelevant(items) {
    const hits = [];
    for (const item of items) {
        const flat = normalize(item.name);
        if (!flat)
            continue;
        if (item.kind === 'law') {
            const statute = MONITORED_STATUTES.find((s) => normalize(s.lawName) === flat);
            if (statute) {
                hits.push({
                    item,
                    matchedBy: statute.lawName,
                    statuteId: statute.statuteId,
                    priority: statute.priority,
                    tracks: [...statute.tracks],
                });
            }
            continue;
        }
        // 이름만 보면 오탐이 많다("항공신체검사증명"에 '사증'이 포함된다).
        // 우리 업무와 관련 있는 부처가 낸 것만 인정한다.
        const ministryOk = !!item.ministry && RELEVANT_MINISTRIES.some((m) => item.ministry.includes(m));
        if (!ministryOk)
            continue;
        const keyword = ADMIN_RULE_KEYWORDS.find((k) => flat.includes(normalize(k.term)));
        if (keyword) {
            hits.push({
                item,
                matchedBy: keyword.term,
                statuteId: null,
                priority: keyword.priority,
                tracks: [...keyword.tracks],
            });
        }
    }
    return hits;
}
/** 시행일 기준 상태. 아직 시행 전이면 미리 대비할 수 있다. */
export function enforcementStatus(enforcedOn) {
    if (!enforcedOn || enforcedOn.length !== 8)
        return 'unknown';
    return enforcedOn > ymd(0) ? 'upcoming' : 'in_effect';
}
