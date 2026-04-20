import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
const REGION = 'asia-northeast3';
/**
 * 고객 생성 시 obligationTemplates를 복제해 timeline 서브컬렉션 시드.
 */
export const onClientCreated = onDocumentCreated({ region: REGION, document: 'agencies/{agencyId}/clients/{clientId}' }, async (event) => {
    const db = getFirestore();
    const { agencyId, clientId } = event.params;
    if (!agencyId || !clientId)
        return;
    const templatesSnap = await db.collection('obligationTemplates').get();
    if (templatesSnap.empty) {
        logger.warn('obligationTemplates가 비어있습니다. seedObligationTemplates를 먼저 실행하세요.');
        return;
    }
    const now = new Date();
    const batch = db.batch();
    for (const tplDoc of templatesSnap.docs) {
        const tpl = tplDoc.data();
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
            dueDate: Timestamp.fromDate(dueDate),
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
});
/**
 * 타임라인 항목 업데이트 감지:
 * - status 변경 → 감사로그 기록 + 단계 캐스케이드(A1) + 이전 상태로부터 복귀 처리
 * - evidence 변경 + checkRule.type='document_uploaded' → 필요 docType 일치 시 자동 done(A3)
 */
export const onTimelineItemUpdated = onDocumentUpdated({ region: REGION, document: 'agencies/{agencyId}/clients/{clientId}/timeline/{itemId}' }, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after)
        return;
    const { agencyId, clientId, itemId } = event.params;
    if (!agencyId || !clientId || !itemId)
        return;
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
    if (after.status !== 'done' &&
        after.checkRule?.type === 'document_uploaded' &&
        after.evidence.length > before.evidence.length) {
        const requiredType = after.checkRule.params?.docType;
        if (requiredType) {
            const newDocs = after.evidence.filter((e) => !before.evidence.some((b) => b.docId === e.docId));
            for (const e of newDocs) {
                const docSnap = await db
                    .doc(`agencies/${agencyId}/clients/${clientId}/documents/${e.docId}`)
                    .get();
                if (docSnap.exists && docSnap.data()?.type === requiredType) {
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
});
async function cascadeStageUnblock(agencyId, clientId, completedStage) {
    const db = getFirestore();
    const timelineCol = db.collection(`agencies/${agencyId}/clients/${clientId}/timeline`);
    const stageItems = await timelineCol.where('stage', '==', completedStage).get();
    const allDone = stageItems.docs.every((d) => d.data().status === 'done');
    if (!allDone)
        return;
    const nextStage = Math.min(completedStage + 1, 6);
    const batch = db.batch();
    if (nextStage > completedStage) {
        const blockedNext = await timelineCol
            .where('stage', '==', nextStage)
            .where('status', '==', 'blocked')
            .get();
        for (const d of blockedNext.docs) {
            batch.update(d.ref, {
                status: 'pending',
                blockedReason: null,
                updatedAt: FieldValue.serverTimestamp(),
            });
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
    if (!['owner', 'manager', 'staff', 'admin'].includes(role)) {
        throw new HttpsError('permission-denied', '권한 없음');
    }
    const callerAgencyId = request.auth?.token?.agencyId;
    const { agencyId, clientId, anchor, eventDate } = request.data;
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
    await clientRef.set({ anchors: { [anchor]: Timestamp.fromDate(eventAt) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const timelineSnap = await db
        .collection(`agencies/${agencyId}/clients/${clientId}/timeline`)
        .get();
    const batch = db.batch();
    let updated = 0;
    for (const d of timelineSnap.docs) {
        const data = d.data();
        if (data.dueDateRule?.anchor !== anchor)
            continue;
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
        actorUid: request.auth.uid,
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
export const checkTimelineOverdue = onSchedule({ region: REGION, schedule: '0 1 * * *', timeZone: 'Asia/Seoul', timeoutSeconds: 540 }, async () => {
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
        const data = d.data();
        const overdueDays = Math.floor((now.getTime() - data.dueDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
        const nextStatus = overdueDays > 3 ? 'violated' : 'warning';
        await d.ref.update({
            status: nextStatus,
            warningReason: `기한 ${overdueDays}일 경과`,
            updatedAt: FieldValue.serverTimestamp(),
        });
        if (nextStatus === 'violated')
            violated++;
        else
            warned++;
    }
    logger.info(`기한초과 점검: warning ${warned}건, violated ${violated}건`);
});
function computeInitialDueDate(anchor, offsetDays, now) {
    // Phase 1: client_created만 즉시 계산. 나머지 anchor는 발생 시점 이후 markAnchorEvent에서 재계산.
    if (anchor === 'client_created') {
        const d = new Date(now);
        d.setDate(d.getDate() + offsetDays);
        return d;
    }
    // 임시로 현재 기준 offsetDays만큼 + 60일 버퍼 (anchor 기록 전까지의 placeholder)
    const d = new Date(now);
    d.setDate(d.getDate() + Math.abs(offsetDays) + 60);
    return d;
}
function isStageBlocked(stage) {
    // 1단계는 즉시 활성, 나머지는 blocked 상태로 시작
    return stage > 1;
}
