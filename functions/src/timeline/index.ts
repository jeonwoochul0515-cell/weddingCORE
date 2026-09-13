import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const REGION = 'asia-northeast3';

type DueDateRule = {
  type: 'relative' | 'absolute';
  anchor: 'client_created' | 'contract_signed' | 'meeting_scheduled' | 'marriage_registered' | 'entry_date'
    // 체류만료일. 연장 때마다 새 만료일로 갱신하면 다음 기한이 자동으로 다시 계산된다.
    | 'stay_expiry';
  offsetDays: number;
};

type CheckRule = {
  type: 'manual' | 'document_uploaded' | 'field_filled' | 'translation_completed';
  params: Record<string, unknown>;
};

type TimelineDoc = {
  itemId: string;
  agencyId: string;
  clientId: string;
  templateCode: string;
  stage: number;
  title: string;
  legalBasis: string;
  status: 'pending' | 'in_progress' | 'done' | 'warning' | 'violated' | 'blocked';
  /** 기준일(맞선일·혼인신고일 등)을 아직 기록하지 않은 항목은 기한이 없다. 지어내지 않는다. */
  dueDate: Timestamp | null;
  completedAt: Timestamp | null;
  completedBy: string | null;
  evidence: Array<{ docId: string; addedAt: Timestamp }>;
  blockedReason: string | null;
  warningReason: string | null;
  notes: string;
  dueDateRule?: DueDateRule;
  checkRule?: CheckRule;
  updatedAt: Timestamp;
};

/**
 * 고객 생성 시 obligationTemplates를 복제해 timeline 서브컬렉션 시드.
 */
export const onClientCreated = onDocumentCreated(
  { region: REGION, document: 'agencies/{agencyId}/clients/{clientId}' },
  async (event) => {
    const db = getFirestore();
    const { agencyId, clientId } = event.params;
    if (!agencyId || !clientId) return;

    const templatesSnap = await db.collection('obligationTemplates').get();
    if (templatesSnap.empty) {
      logger.warn('obligationTemplates가 비어있습니다. seedObligationTemplates를 먼저 실행하세요.');
      return;
    }

    const now = new Date();
    const batch = db.batch();

    for (const tplDoc of templatesSnap.docs) {
      const tpl = tplDoc.data() as {
        code: string;
        stage: number;
        title: string;
        legalBasis: string;
        severity: string;
        dueDateRule: DueDateRule;
        checkRule?: CheckRule;
      };

      const dueDate = computeInitialDueDate(tpl.dueDateRule.anchor, tpl.dueDateRule.offsetDays, now);
      const status = isStageBlocked(tpl.stage) ? 'blocked' : 'pending';
      const blockedReason = status === 'blocked' ? '이전 단계 완료 후 활성화됩니다.' : null;

      const ref = db
        .collection(`agencies/${agencyId}/clients/${clientId}/timeline`)
        .doc(tpl.code);

      batch.set(ref, {
        itemId: tpl.code,
        agencyId,
        clientId,
        templateCode: tpl.code,
        stage: tpl.stage,
        title: tpl.title,
        legalBasis: tpl.legalBasis,
        status,
        dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
        completedAt: null,
        completedBy: null,
        evidence: [],
        blockedReason,
        warningReason: null,
        notes: '',
        dueDateRule: tpl.dueDateRule,
        checkRule: tpl.checkRule ?? { type: 'manual', params: {} },
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    logger.info(`[${clientId}] 타임라인 ${templatesSnap.size}개 항목 시드 완료`);
  },
);

/**
 * 타임라인 항목 업데이트 감지:
 * - status 변경 → 감사로그 기록 + 단계 캐스케이드(A1) + 이전 상태로부터 복귀 처리
 * - evidence 변경 + checkRule.type='document_uploaded' → 필요 docType 일치 시 자동 done(A3)
 */
export const onTimelineItemUpdated = onDocumentUpdated(
  { region: REGION, document: 'agencies/{agencyId}/clients/{clientId}/timeline/{itemId}' },
  async (event) => {
    if (!event.data) return;
    const before = event.data.before.data() as TimelineDoc | undefined;
    const after = event.data.after.data() as TimelineDoc | undefined;
    if (!before || !after) return;
    const { agencyId, clientId, itemId } = event.params;
    if (!agencyId || !clientId || !itemId) return;

    const db = getFirestore();

    // 상태 변경 → 감사로그 (A4)
    if (before.status !== after.status) {
      await db.collection('auditLogs').add({
        actorUid: after.completedBy ?? 'system',
        agencyId,
        action: 'timeline.status_changed',
        targetPath: `agencies/${agencyId}/clients/${clientId}/timeline/${itemId}`,
        before: { status: before.status },
        after: { status: after.status, warningReason: after.warningReason ?? null },
        ip: '',
        userAgent: '',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // A3: evidence 추가 → document_uploaded 룰 자동 done
    if (
      after.status !== 'done' &&
      after.checkRule?.type === 'document_uploaded' &&
      after.evidence.length > before.evidence.length
    ) {
      const requiredType = after.checkRule.params?.docType as string | undefined;
      // 누구 서류인지도 본다. 예전에는 종류만 맞으면 완료 처리해서, 한국인 건강진단서
      // 한 장으로 「외국인 측 건강상태 확인」까지 끝났다(점검 04-16·05-10).
      const requiredSubject = after.checkRule.params?.subject as string | undefined;
      // 「기타」는 아무 파일이나 해당되므로 자동으로 완료시키지 않는다. 사람이 눌러야 한다.
      if (requiredType && requiredType !== 'other') {
        const newDocs = after.evidence.filter(
          (e) => !before.evidence.some((b) => b.docId === e.docId),
        );
        for (const e of newDocs) {
          const docSnap = await db
            .doc(`agencies/${agencyId}/clients/${clientId}/documents/${e.docId}`)
            .get();
          const docData = docSnap.data();
          const subjectMatches =
            !requiredSubject || docData?.subject === requiredSubject || docData?.subject === 'both';
          if (docSnap.exists && docData?.type === requiredType && subjectMatches) {
            await event.data.after.ref.update({
              status: 'done',
              completedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            return; // 스스로 재진입 시 캐스케이드는 후속 트리거 호출에서 처리
          }
        }
      }
    }

    // A1: status → done 변경 시 단계 캐스케이드
    if (before.status !== 'done' && after.status === 'done') {
      await cascadeStageUnblock(agencyId, clientId, after.stage);
    }
  },
);

async function cascadeStageUnblock(
  agencyId: string,
  clientId: string,
  completedStage: number,
): Promise<void> {
  const db = getFirestore();
  const timelineCol = db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`);

  const stageItems = await timelineCol.where('stage', '==', completedStage).get();
  const allDone = stageItems.docs.every((d) => (d.data() as TimelineDoc).status === 'done');
  if (!allDone) return;

  const nextStage = Math.min(completedStage + 1, 6);
  const batch = db.batch();

  if (nextStage > completedStage) {
    const blockedNext = await timelineCol
      .where('stage', '==', nextStage)
      .where('status', '==', 'blocked')
      .get();
    const unblockedAt = new Date();
    for (const d of blockedNext.docs) {
      const item = d.data() as TimelineDoc;
      // 잠겨 있던 동안에도 시계가 돌아, 앞 단계가 늦게 끝나면 열리자마자 「위반」이 되던 것을
      // 막는다. 고객 등록일 기준 항목은 잠금이 풀리는 시점에서 다시 센다(점검 02-3·04-3).
      const patch: Record<string, unknown> = {
        status: 'pending',
        blockedReason: null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (item.dueDateRule?.anchor === 'client_created') {
        const recomputed = new Date(unblockedAt);
        recomputed.setDate(recomputed.getDate() + item.dueDateRule.offsetDays);
        patch.dueDate = Timestamp.fromDate(recomputed);
      }
      batch.update(d.ref, patch);
    }
  }

  batch.update(db.doc(`agencies/${agencyId}/clients/${clientId}`), {
    currentStage: nextStage,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  logger.info(`[${clientId}] 단계 ${completedStage} 완료 → 단계 ${nextStage} 활성화`);
}

/**
 * A2: 기준일(anchor) 이벤트 기록.
 * 업체 담당자가 "계약 체결" / "맞선 예정일" 등을 기록하면
 * 해당 anchor 를 가진 timeline 항목들의 dueDate를 offsetDays 기준으로 재계산.
 */
export const markAnchorEvent = onCall({ region: REGION }, async (request) => {
  const role = request.auth?.token?.role;
  if (!['owner', 'manager', 'staff', 'admin'].includes(role as string)) {
    throw new HttpsError('permission-denied', '권한 없음');
  }
  const callerAgencyId = request.auth?.token?.agencyId as string | undefined;

  const { agencyId, clientId, anchor, eventDate } = request.data as {
    agencyId?: string;
    clientId?: string;
    anchor?: DueDateRule['anchor'];
    eventDate?: string; // ISO
  };
  if (!agencyId || !clientId || !anchor || !eventDate) {
    throw new HttpsError('invalid-argument', '필수 파라미터 누락');
  }
  if (role !== 'admin' && callerAgencyId !== agencyId) {
    throw new HttpsError('permission-denied', '다른 업체의 자료 접근 불가');
  }
  const eventAt = new Date(eventDate);
  if (isNaN(eventAt.getTime())) {
    throw new HttpsError('invalid-argument', '유효하지 않은 eventDate');
  }

  const db = getFirestore();
  const clientRef = db.doc(`agencies/${agencyId}/clients/${clientId}`);
  await clientRef.set(
    { anchors: { [anchor]: Timestamp.fromDate(eventAt) }, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  const timelineSnap = await db
    .collection(`agencies/${agencyId}/clients/${clientId}/timeline`)
    .get();

  const batch = db.batch();
  let updated = 0;
  for (const d of timelineSnap.docs) {
    const data = d.data() as TimelineDoc;
    if (data.dueDateRule?.anchor !== anchor) continue;
    const recomputed = new Date(eventAt);
    recomputed.setDate(recomputed.getDate() + data.dueDateRule.offsetDays);
    batch.update(d.ref, {
      dueDate: Timestamp.fromDate(recomputed),
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated++;
  }
  await batch.commit();

  await db.collection('auditLogs').add({
    actorUid: request.auth!.uid,
    agencyId,
    action: 'timeline.anchor_recorded',
    targetPath: `agencies/${agencyId}/clients/${clientId}`,
    before: null,
    after: { anchor, eventDate, updatedItems: updated },
    ip: request.rawRequest.ip ?? '',
    userAgent: request.rawRequest.headers['user-agent'] ?? '',
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, updated };
});

/**
 * A4: 매일 기한초과 점검.
 * pending/in_progress 상태에서 dueDate가 지나면
 *   - 3일 이내 초과: warning
 *   - 3일 초과: violated
 */
export const checkTimelineOverdue = onSchedule(
  { region: REGION, schedule: '0 1 * * *', timeZone: 'Asia/Seoul', timeoutSeconds: 540 },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const nowTs = Timestamp.fromDate(now);

    const snap = await db
      .collectionGroup('timeline')
      .where('status', 'in', ['pending', 'in_progress'])
      .where('dueDate', '<', nowTs)
      .get();

    let warned = 0;
    let violated = 0;

    for (const d of snap.docs) {
      const data = d.data() as TimelineDoc;
      // 기한이 없는 항목(기준일 미기록)은 넘긴다. Firestore 정렬에서 null이 Timestamp보다
      // 앞이라 「dueDate < 지금」 조회에 딸려 오기 때문에 여기서 반드시 걸러야 한다.
      if (!data.dueDate) continue;
      const overdueDays = Math.floor(
        (now.getTime() - data.dueDate.toDate().getTime()) / (1000 * 60 * 60 * 24),
      );
      const nextStatus = overdueDays > 3 ? 'violated' : 'warning';
      await d.ref.update({
        status: nextStatus,
        warningReason: `기한 ${overdueDays}일 경과`,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (nextStatus === 'violated') violated++;
      else warned++;
    }

    logger.info(`기한초과 점검: warning ${warned}건, violated ${violated}건`);
  },
);

/**
 * 고객을 등록할 때 정할 수 있는 기한만 정한다.
 *
 * 예전에는 기준일(맞선일·혼인신고일·입국일)을 모르면 「등록일 + |일수| + 60일」이라는
 * 임시 날짜를 넣었다. 화면에는 그 값이 「D-67」처럼 진짜 기한으로 보여서, 맞선을 잡지도
 * 않은 고객의 항목이 두 달 뒤 한꺼번에 경고·위반으로 바뀌었다. 실제로는 아무 법도
 * 어기지 않은 상태다. 그래서 기준일이 없으면 기한을 비워 둔다(점검 02-3·04-2).
 */
function computeInitialDueDate(anchor: string, offsetDays: number, now: Date): Date | null {
  if (anchor === 'client_created') {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return d;
  }
  return null;
}

function isStageBlocked(stage: number): boolean {
  // 1단계는 즉시 활성, 나머지는 blocked 상태로 시작
  return stage > 1;
}
