// 보존기간이 끝난 고객 자료를 지운다
//
// 법은 5년 **보존**을 요구하고(법 제10조의4, 시행규칙 제9조), 개인정보보호법은 목적을
// 다한 개인정보를 **지체 없이 파기**하라고 한다. 두 요구는 충돌하지 않는다 —
// 5년을 채운 뒤에는 지우는 것이 맞다. 지금까지 이 제품에는 채우는 쪽만 있었다.
//
// 종료(완료·취소)한 고객의 신상정보·서류·타임라인이 영원히 남아 있었다. 국제결혼중개는
// 여권·범죄경력·건강진단서·소득증빙처럼 민감한 서류를 다루는 일이다. 쌓아 두는 것은
// 안전이 아니라 위험이다. 유출되면 그 책임은 업체가 진다.
//
// ★ 지우는 기준은 **종료 시점**이다. closedAt이 없는 고객은 손대지 않는다.
//   진행 중인 건을 지우는 것보다 며칠 늦게 지우는 편이 낫다. 되돌릴 수 없는 일에서는
//   의심스러우면 멈춘다.
//
// ★ 무엇을 지웠는지는 남긴다. 문서를 통째로 지우면 「우리가 제때 파기했다」는 것을
//   증명할 수 없다. 개인정보가 없는 표식(purgedClients)만 남긴다.

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';

const REGION = 'asia-northeast3';

/** 법이 요구하는 보존기간. 시행규칙 제9조 */
export const CLIENT_RETENTION_YEARS = 5;

/** 종료 상태. 진행 중인 고객은 기간과 무관하게 손대지 않는다 */
const CLOSED_STATUSES = new Set(['completed', 'cancelled']);

/** 하루에 지우는 최대 건수. 남으면 다음 날 이어서 한다 */
const DAILY_LIMIT = 50;

export function retentionCutoff(now: Date, years = CLIENT_RETENTION_YEARS): Date {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff;
}

/**
 * 파기해도 되는 고객인가.
 *
 * 저장소를 부르지 않는 판정만 떼어 둔다 — 지우는 코드는 검증하기 어렵고,
 * 틀리면 되돌릴 수 없다.
 */
export function shouldPurge(
  client: { status?: unknown; closedAt?: { toMillis?: () => number } | null },
  cutoffMs: number,
): boolean {
  if (!CLOSED_STATUSES.has(String(client.status ?? ''))) return false;
  const closedMs = client.closedAt?.toMillis?.();
  if (typeof closedMs !== 'number') return false;
  return closedMs < cutoffMs;
}

export const purgeExpiredClientRecords = onSchedule(
  { region: REGION, schedule: '20 4 * * *', timeZone: 'Asia/Seoul', timeoutSeconds: 540 },
  async () => {
    const db = getFirestore();
    const cutoff = retentionCutoff(new Date());
    const cutoffMs = cutoff.getTime();

    // 업체는 많아야 수백이다. 고객을 컬렉션그룹으로 훑으면 복합 색인이 필요해지고,
    // 색인 하나를 빠뜨리면 파기가 조용히 멈춘다. 업체를 돌며 각자의 고객만 본다.
    const agencies = await db.collection('agencies').select().get();

    let purged = 0;
    for (const agency of agencies.docs) {
      if (purged >= DAILY_LIMIT) break;

      const snap = await agency.ref
        .collection('clients')
        .where('closedAt', '<', Timestamp.fromDate(cutoff))
        .orderBy('closedAt', 'asc')
        .limit(DAILY_LIMIT - purged)
        .get();

      for (const doc of snap.docs) {
        const data = doc.data();
        if (!shouldPurge(data, cutoffMs)) continue;

        // 서류 원본은 Storage에 있다. Firestore만 지우면 파일이 주인 없이 남는다 —
        // 그것도 여권과 범죄경력 증명서다.
        const prefix = `agencies/${agency.id}/clients/${doc.id}/`;
        try {
          await getStorage().bucket().deleteFiles({ prefix });
        } catch (err) {
          logger.error('고객 서류 파일 파기 실패', {
            agencyId: agency.id,
            clientId: doc.id,
            message: (err as Error).message,
          });
          // 파일을 못 지웠으면 문서도 남긴다. 반쪽 파기는 다음 날 다시 시도하는 편이 낫다.
          continue;
        }

        // 타임라인·서류·신상정보와 그 아래 번역·전달 기록까지 한 번에 지운다.
        await db.recursiveDelete(doc.ref);

        // 개인정보가 없는 표식만 남긴다. 「제때 파기했다」는 것을 이걸로 보인다.
        await agency.ref.collection('purgedClients').doc(doc.id).set({
          clientId: doc.id,
          closedAt: data.closedAt ?? null,
          retentionYears: CLIENT_RETENTION_YEARS,
          basis: '결혼중개업법 제10조의4, 시행규칙 제9조(5년 보존) 경과 후 파기',
          purgedAt: FieldValue.serverTimestamp(),
        });

        purged += 1;
        if (purged >= DAILY_LIMIT) break;
      }
    }

    if (purged > 0) {
      logger.info(`보존기간(${CLIENT_RETENTION_YEARS}년)이 지난 고객 자료 ${purged}건 파기`, {
        cutoff: cutoff.toISOString(),
      });
    }
  },
);
