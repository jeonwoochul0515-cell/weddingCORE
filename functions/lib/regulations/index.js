import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { MONITORED_STATUTES } from './config.js';
import { fetchStatuteArticles } from './crawler.js';
import { diffArticles } from './diff.js';
const REGION = 'asia-northeast3';
const SCHEDULE = '0 3 * * *'; // 매일 03:00 KST
const TZ = 'Asia/Seoul';
/**
 * 매일 03시 KST에 실행되는 법령 변경 크롤러.
 */
export const crawlRegulations = onSchedule({ region: REGION, schedule: SCHEDULE, timeZone: TZ, timeoutSeconds: 540, memory: '512MiB' }, async () => {
    await runCrawl();
});
/**
 * 관리자가 수동으로 크롤을 강제 실행.
 */
export const runCrawlNow = onCall({ region: REGION, timeoutSeconds: 540 }, async (request) => {
    if (request.auth?.token?.role !== 'admin') {
        throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
    }
    const result = await runCrawl();
    return result;
});
async function runCrawl() {
    const db = getFirestore();
    const summary = {};
    for (const statute of MONITORED_STATUTES) {
        try {
            const fresh = await fetchStatuteArticles(statute.lawName, statute.mst);
            // 기존 조항 로드
            const articlesCol = db.collection(`regulations/${statute.statuteId}/articles`);
            const existingSnap = await articlesCol.get();
            const existing = new Map(existingSnap.docs.map((d) => [d.id, { contentHash: d.get('contentHash') }]));
            const changes = diffArticles(fresh, existing);
            if (changes.length === 0) {
                logger.info(`[${statute.statuteId}] 변경 없음`);
                summary[statute.statuteId] = 0;
                continue;
            }
            // 조항 업서트 + regulatoryDelta 기록 (배치)
            const batch = db.batch();
            const now = FieldValue.serverTimestamp();
            for (const change of changes) {
                if (change.kind === 'new' || change.kind === 'amended') {
                    const ref = articlesCol.doc(change.article.articleNumber);
                    batch.set(ref, {
                        statuteId: statute.statuteId,
                        articleNumber: change.article.articleNumber,
                        title: change.article.title,
                        content: change.article.content,
                        contentHash: change.article.contentHash,
                        status: 'active',
                        lastCrawledAt: now,
                    }, { merge: true });
                }
                if (change.kind === 'repealed') {
                    const ref = articlesCol.doc(change.articleNumber);
                    batch.update(ref, { status: 'repealed', lastCrawledAt: now });
                }
                const deltaRef = db.collection('regulatoryDelta').doc();
                batch.set(deltaRef, buildDelta(statute.statuteId, change, statute.priority));
            }
            // 업체 in-app 알림 생성 (critical/high 만)
            if (statute.priority !== 'medium') {
                const agenciesSnap = await db
                    .collection('agencies')
                    .where('verificationStatus', '==', 'verified')
                    .get();
                for (const agencyDoc of agenciesSnap.docs) {
                    const notifRef = db
                        .collection(`agencies/${agencyDoc.id}/notifications`)
                        .doc();
                    batch.set(notifRef, {
                        notifId: notifRef.id,
                        type: 'regulatory_change',
                        severity: statute.priority === 'critical' ? 'critical' : 'warning',
                        title: `${statute.lawName} 변경 감지`,
                        message: `조항 ${changes.length}건이 변경되었습니다.`,
                        link: `/agency/regulatory?statute=${statute.statuteId}`,
                        targetUids: [],
                        readBy: {},
                        createdAt: now,
                    });
                }
            }
            await batch.commit();
            summary[statute.statuteId] = changes.length;
            logger.info(`[${statute.statuteId}] 변경 ${changes.length}건 반영`);
        }
        catch (err) {
            logger.error(`[${statute.statuteId}] 크롤 실패`, err);
            summary[statute.statuteId] = -1;
        }
    }
    return { ok: true, summary };
}
function buildDelta(statuteId, change, priority) {
    const base = {
        statuteId,
        priority,
        sourceUrl: 'https://www.law.go.kr',
        detectedAt: FieldValue.serverTimestamp(),
        notifiedAgencies: [],
    };
    if (change.kind === 'new') {
        return {
            ...base,
            articleNumber: change.article.articleNumber,
            changeType: 'new',
            oldHash: null,
            newHash: change.article.contentHash,
            diffSummary: `신설: ${change.article.title}`,
        };
    }
    if (change.kind === 'amended') {
        return {
            ...base,
            articleNumber: change.article.articleNumber,
            changeType: 'amended',
            oldHash: change.oldHash,
            newHash: change.article.contentHash,
            diffSummary: `개정: ${change.article.title}`,
        };
    }
    return {
        ...base,
        articleNumber: change.articleNumber,
        changeType: 'repealed',
        oldHash: change.oldHash,
        newHash: null,
        diffSummary: `폐지: 제${change.articleNumber}조`,
    };
}
