// 규제 레이더: 법제처 개정 공시를 훑어 우리 사업 관련 변경만 잡아내는 스케줄 작업
//
// 예전에는 법령 전문을 매일 내려받아 조문 해시를 대조했다. 비용이 크고,
// 실무를 실제로 좌우하는 고시·훈령(행정규칙)은 아예 감지하지 못했다.
// 지금은 공포·발령 목록을 조회해 우리 관심사만 고른 뒤, 걸린 것만 상세를 본다.
//
// 얻는 것: (1) 하위법령까지 감지 (2) 시행 전 예고를 미리 파악
//         (3) 매일 API 두 번이면 끝

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { fetchStatuteArticles } from './crawler.js';
import { diffArticles } from './diff.js';
import {
  enforcementStatus,
  fetchRecentAdminRules,
  fetchRecentLaws,
  selectRelevant,
  type WatchHit,
} from './watch.js';

const REGION = 'asia-northeast3';
const SCHEDULE = '0 3 * * *'; // 매일 03:00 KST
const TZ = 'Asia/Seoul';
const LOOKBACK_DAYS = 7; // 주말·공휴일에 놓치지 않도록 여유를 둔다
const MAX_BATCH_OPS = 400; // Firestore 배치 한도 500. 여유 확보

export const crawlRegulations = onSchedule(
  {
    region: REGION,
    schedule: SCHEDULE,
    timeZone: TZ,
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: ['LAW_CADDY_TOKEN'],
  },
  async () => {
    await runRadar();
  },
);

export const runCrawlNow = onCall(
  { region: REGION, timeoutSeconds: 540, secrets: ['LAW_CADDY_TOKEN'] },
  async (request) => {
    if (request.auth?.token?.role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자만 호출 가능합니다.');
    }
    return runRadar();
  },
);

/** 같은 개정을 매일 다시 기록하지 않도록 결정적인 문서 ID를 만든다. */
function deltaId(hit: WatchHit): string {
  const base = hit.item.sourceId || hit.item.name;
  return `${hit.item.kind}_${base}_${hit.item.promulgatedOn}`.replace(/[^\w가-힣-]/g, '_').slice(0, 400);
}

async function runRadar() {
  const db = getFirestore();

  const [laws, adminRules] = await Promise.all([
    fetchRecentLaws(LOOKBACK_DAYS),
    fetchRecentAdminRules(LOOKBACK_DAYS),
  ]);
  const scanned = laws.length + adminRules.length;
  const hits = selectRelevant([...laws, ...adminRules]);

  logger.info(`공시 ${scanned}건 확인 · 관련 ${hits.length}건`);
  if (hits.length === 0) {
    return { ok: true, scanned, matched: 0, recorded: 0 };
  }

  // 이미 기록한 개정은 건너뛴다
  const fresh: WatchHit[] = [];
  for (const hit of hits) {
    const ref = db.collection('regulatoryDelta').doc(deltaId(hit));
    const snap = await ref.get();
    if (!snap.exists) fresh.push(hit);
  }

  if (fresh.length === 0) {
    logger.info('새로 기록할 개정 없음 (모두 기존 감지분)');
    return { ok: true, scanned, matched: hits.length, recorded: 0 };
  }

  // 법률 조문이 바뀐 경우에만 무엇이 달라졌는지 확인한다.
  // 행정규칙은 조문 API가 따로 없어 공시 정보만 남긴다.
  const articleSummary = new Map<string, string>();
  for (const hit of fresh) {
    if (hit.item.kind !== 'law' || !hit.statuteId) continue;
    try {
      const parsed = await fetchStatuteArticles(hit.item.name);
      const existingSnap = await db.collection(`regulations/${hit.statuteId}/articles`).get();
      const existing = new Map(
        existingSnap.docs.map((d) => [d.id, { contentHash: d.get('contentHash') as string }]),
      );
      const changes = diffArticles(parsed, existing);
      const added = changes.filter((c) => c.kind === 'new').length;
      const amended = changes.filter((c) => c.kind === 'amended').length;
      const repealed = changes.filter((c) => c.kind === 'repealed').length;
      articleSummary.set(hit.statuteId, `신설 ${added} · 개정 ${amended} · 삭제 ${repealed}`);

      // 기준선 갱신 (다음 개정 때 비교 대상)
      await saveArticles(db, hit.statuteId, parsed);
    } catch (error) {
      logger.warn(`[${hit.statuteId}] 조문 상세 확인 실패`, error);
    }
  }

  const now = FieldValue.serverTimestamp();
  const ops: Array<(b: FirebaseFirestore.WriteBatch) => void> = [];

  for (const hit of fresh) {
    const status = enforcementStatus(hit.item.enforcedOn);
    const ref = db.collection('regulatoryDelta').doc(deltaId(hit));
    ops.push((batch) =>
      batch.set(ref, {
        kind: hit.item.kind,
        name: hit.item.name,
        statuteId: hit.statuteId,
        matchedBy: hit.matchedBy,
        priority: hit.priority,
        tracks: hit.tracks,
        promulgatedOn: hit.item.promulgatedOn,
        enforcedOn: hit.item.enforcedOn,
        enforcementStatus: status,
        revisionType: hit.item.revisionType,
        ministry: hit.item.ministry,
        sourceUrl: hit.item.detailPath
          ? `https://www.law.go.kr${hit.item.detailPath}`
          : 'https://www.law.go.kr',
        articleSummary: hit.statuteId ? articleSummary.get(hit.statuteId) ?? null : null,
        detectedAt: now,
        notifiedAgencies: [],
      }),
    );
  }

  // 업체 알림 — 중요도가 높은 것만. 시행 전 예고와 이미 시행된 것을 구분해 알린다.
  const notable = fresh.filter((h) => h.priority !== 'medium');
  if (notable.length > 0) {
    const agenciesSnap = await db
      .collection('agencies')
      .where('verificationStatus', '==', 'verified')
      .get();
    for (const agencyDoc of agenciesSnap.docs) {
      for (const hit of notable) {
        const status = enforcementStatus(hit.item.enforcedOn);
        const ref = db.collection(`agencies/${agencyDoc.id}/notifications`).doc();
        ops.push((batch) =>
          batch.set(ref, {
            notifId: ref.id,
            type: 'regulatory_change',
            severity: hit.priority === 'critical' ? 'critical' : 'warning',
            title:
              status === 'upcoming'
                ? `${hit.item.name} 시행 예정`
                : `${hit.item.name} 개정`,
            message:
              status === 'upcoming'
                ? `${hit.item.enforcedOn} 시행 예정입니다. 미리 확인해 주세요.`
                : `${hit.item.revisionType ?? '개정'} 내용이 반영되었습니다.`,
            link: '/agency/regulatory',
            targetUids: [],
            readBy: {},
            createdAt: now,
          }),
        );
      }
    }
  }

  await commitInChunks(db, ops);
  logger.info(`개정 ${fresh.length}건 기록 (알림 대상 ${notable.length}건)`);
  return { ok: true, scanned, matched: hits.length, recorded: fresh.length };
}

/** 조문 기준선을 갱신한다. 다음 개정 때 무엇이 달라졌는지 비교할 대상이 된다. */
async function saveArticles(
  db: FirebaseFirestore.Firestore,
  statuteId: string,
  articles: Awaited<ReturnType<typeof fetchStatuteArticles>>,
) {
  const col = db.collection(`regulations/${statuteId}/articles`);
  const now = FieldValue.serverTimestamp();
  const ops = articles.map((a) => (batch: FirebaseFirestore.WriteBatch) =>
    batch.set(
      col.doc(a.articleNumber),
      {
        statuteId,
        articleNumber: a.articleNumber,
        title: a.title,
        content: a.content,
        contentHash: a.contentHash,
        status: 'active',
        lastCrawledAt: now,
      },
      { merge: true },
    ),
  );
  await commitInChunks(db, ops);
}

/** 민법처럼 조문이 1000개가 넘는 법령도 있어 배치를 나눠 커밋한다. */
async function commitInChunks(
  db: FirebaseFirestore.Firestore,
  ops: Array<(b: FirebaseFirestore.WriteBatch) => void>,
) {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + MAX_BATCH_OPS)) op(batch);
    await batch.commit();
  }
}
