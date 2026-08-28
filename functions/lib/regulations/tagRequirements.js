// 모아둔 판례·재결례를 요건에 연결한다 — "이 사건은 무엇 때문에 걸린 사건인가"
//
// 사건을 쌓아만 두면 쓸 수 없다. 실무에서 필요한 것은 "소득요건이 문제될 때 참고할
// 사건"이므로, 요건 쪽에서 사건을 찾아갈 수 있어야 한다.
//
// 자동 분류는 후보를 좁히는 데까지다. 본문에 낱말이 나왔다고 그 요건이 쟁점이었다는
// 보장은 없으므로, 근거로 인용하기 전에는 사람이 확인해야 한다(confidence 필드).
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { REQUIREMENT_HINTS } from '../domain/visaRequirements.js';
const REGION = 'asia-northeast3';
const TZ = 'Asia/Seoul';
const MAX_BATCH_OPS = 400;
/**
 * 어느 자리에서 낱말이 나왔는지에 따라 무게를 달리 본다.
 * 요지(holding)에 나오면 그게 쟁점이었을 가능성이 높고, 본문에만 나오면
 * 사실관계를 나열하다 스친 것일 수 있다.
 */
const WEIGHT = { holding: 3, summary: 2, caseName: 2, body: 1 };
function scoreRequirements(doc) {
    const fields = [
        ['caseName', doc.caseName ?? ''],
        ['summary', doc.summary ?? ''],
        ['holding', doc.holding ?? ''],
        // 본문은 앞부분만 본다. 뒤로 갈수록 인용된 다른 법령 이야기가 섞인다.
        ['body', (doc.body ?? '').slice(0, 8000)],
    ];
    const out = [];
    for (const [key, hints] of Object.entries(REQUIREMENT_HINTS)) {
        let score = 0;
        for (const [field, text] of fields) {
            if (!text)
                continue;
            for (const hint of hints) {
                if (text.includes(hint))
                    score += WEIGHT[field];
            }
        }
        if (score > 0)
            out.push({ key, score });
    }
    return out.sort((a, b) => b.score - a.score);
}
async function runTagging() {
    const db = getFirestore();
    const snap = await db.collection('precedents').get();
    let tagged = 0;
    let untagged = 0;
    const perRequirement = {};
    let batch = db.batch();
    let ops = 0;
    for (const d of snap.docs) {
        const data = d.data();
        const scored = scoreRequirements(data);
        // 요지·사건명에 걸린 것(3점 이상)은 쟁점일 가능성이 높다고 본다.
        const strong = scored.filter((s) => s.score >= 3).map((s) => s.key);
        const weak = scored.filter((s) => s.score < 3).map((s) => s.key);
        if (strong.length === 0 && weak.length === 0)
            untagged += 1;
        else
            tagged += 1;
        for (const k of strong)
            perRequirement[k] = (perRequirement[k] ?? 0) + 1;
        batch.update(d.ref, {
            requirements: strong,
            requirementsWeak: weak,
            // 자동 분류임을 남긴다. 검수를 거치면 사람이 'reviewed'로 바꾼다.
            requirementConfidence: strong.length > 0 ? 'auto' : 'none',
        });
        ops += 1;
        if (ops >= MAX_BATCH_OPS) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
        }
    }
    if (ops > 0)
        await batch.commit();
    logger.info(`요건 연결 — 전체 ${snap.size}건 · 연결 ${tagged}건 · 미연결 ${untagged}건`, perRequirement);
    return { ok: true, total: snap.size, tagged, untagged, perRequirement };
}
/** 수집(일요일 04시) 뒤에 돌도록 한 시간 늦춘다. */
export const tagPrecedentRequirements = onSchedule({
    region: REGION,
    schedule: '0 5 * * 0',
    timeZone: TZ,
    timeoutSeconds: 540,
    memory: '512MiB',
}, async () => {
    await runTagging();
});
export const runRequirementTaggingNow = onCall({ region: REGION, timeoutSeconds: 540 }, async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
    }
    return runTagging();
});
