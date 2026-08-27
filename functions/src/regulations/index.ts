import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { MONITORED_STATUTES } from './config.js';
import { fetchStatuteArticles } from './crawler.js';
import { diffArticles, type ArticleChange } from './diff.js';

const REGION = 'asia-northeast3';
const SCHEDULE = '0 3 * * *'; // 매일 03:00 KST
const TZ = 'Asia/Seoul';

/**
 * Firestore 배치는 작업 500개가 한도다. 민법만 해도 조문이 1337개라
 * 한 번에 담으면 반드시 실패하므로 나눠서 커밋한다. 여유를 두고 400으로 잡는다.
 */
const MAX_BATCH_OPS = 400;

type BatchOp = (batch: FirebaseFirestore.WriteBatch) => void;

async function commitInChunks(db: FirebaseFirestore.Firestore, ops: BatchOp[]) {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + MAX_BATCH_OPS)) op(batch);
    await batch.commit();
  }
}

/**
 * 매일 03시 KST에 실행되는 법령 변경 크롤러.
 */
export const crawlRegulations = onSchedule(
  { region: REGION, schedule: SCHEDULE, timeZone: TZ, timeoutSeconds: 540, memory: '512MiB', secrets: ['LAW_CADDY_TOKEN'] },
  async () => {
    await runCrawl();
  },
);

/**
 * 관리자가 수동으로 크롤을 강제 실행.
 */
export const runCrawlNow = onCall({ region: REGION, timeoutSeconds: 540, secrets: ['LAW_CADDY_TOKEN'] }, async (request) => {
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
  }
  const result = await runCrawl();
  return result;
});

async function runCrawl() {
  const db = getFirestore();
  const summary: Record<string, number> = {};

  for (const statute of MONITORED_STATUTES) {
    try {
      const fresh = await fetchStatuteArticles(statute.lawName, statute.mst);

      // 기존 조항 로드
      const articlesCol = db.collection(`regulations/${statute.statuteId}/articles`);
      const existingSnap = await articlesCol.get();
      const existing = new Map(
        existingSnap.docs.map((d) => [d.id, { contentHash: d.get('contentHash') as string }]),
      );

      const changes = diffArticles(fresh, existing);
      if (changes.length === 0) {
        logger.info(`[${statute.statuteId}] 변경 없음`);
        summary[statute.statuteId] = 0;
        continue;
      }

      // 처음 수집하는 법령은 전 조문이 '신설'로 잡힌다. 이때 변경 알림을 보내면
      // 업체에게 "법이 통째로 바뀌었다"는 잘못된 신호가 가므로 조문만 저장한다.
      const isFirstCrawl = existing.size === 0;
      const now = FieldValue.serverTimestamp();
      const ops: BatchOp[] = [];

      for (const change of changes) {
        if (change.kind === 'new' || change.kind === 'amended') {
          const ref = articlesCol.doc(change.article.articleNumber);
          ops.push((batch) => batch.set(ref, {
            statuteId: statute.statuteId,
            articleNumber: change.article.articleNumber,
            title: change.article.title,
            content: change.article.content,
            contentHash: change.article.contentHash,
            status: 'active',
            lastCrawledAt: now,
          }, { merge: true }));
        }
        if (change.kind === 'repealed') {
          const ref = articlesCol.doc(change.articleNumber);
          ops.push((batch) => batch.update(ref, { status: 'repealed', lastCrawledAt: now }));
        }
        if (!isFirstCrawl) {
          const deltaRef = db.collection('regulatoryDelta').doc();
          ops.push((batch) => batch.set(deltaRef, buildDelta(statute.statuteId, change, statute.priority)));
        }
      }

      // 업체 in-app 알림 (critical/high, 최초 수집 제외)
      if (!isFirstCrawl && statute.priority !== 'medium') {
        const agenciesSnap = await db
          .collection('agencies')
          .where('verificationStatus', '==', 'verified')
          .get();
        for (const agencyDoc of agenciesSnap.docs) {
          const notifRef = db.collection(`agencies/${agencyDoc.id}/notifications`).doc();
          ops.push((batch) => batch.set(notifRef, {
            notifId: notifRef.id,
            type: 'regulatory_change',
            severity: statute.priority === 'critical' ? 'critical' : 'warning',
            title: `${statute.lawName} 변경 감지`,
            message: `조항 ${changes.length}건이 변경되었습니다.`,
            link: `/agency/regulatory?statute=${statute.statuteId}`,
            targetUids: [],
            readBy: {},
            createdAt: now,
          }));
        }
      }

      await commitInChunks(db, ops);
      summary[statute.statuteId] = changes.length;
      logger.info(`[${statute.statuteId}] ${isFirstCrawl ? '최초 수집' : '변경'} ${changes.length}건 반영`);
    } catch (err) {
      logger.error(`[${statute.statuteId}] 크롤 실패`, err);
      summary[statute.statuteId] = -1;
    }
  }

  return { ok: true, summary };
}

function buildDelta(
  statuteId: string,
  change: ArticleChange,
  priority: string,
) {
  const base = {
    statuteId,
    priority,
    sourceUrl: 'https://www.law.go.kr',
    detectedAt: FieldValue.serverTimestamp(),
    notifiedAgencies: [] as string[],
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
