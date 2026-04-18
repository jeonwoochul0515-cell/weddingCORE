import { onDocumentCreated } from 'firebase-functions/v2/firestore';
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
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    logger.info(`[${clientId}] 타임라인 ${templatesSnap.size}개 항목 시드 완료`);
});
function computeInitialDueDate(anchor, offsetDays, now) {
    // Phase 1: client_created만 즉시 계산. 나머지 anchor는 발생 시점 이후 업데이트(추후).
    if (anchor === 'client_created') {
        const d = new Date(now);
        d.setDate(d.getDate() + offsetDays);
        return d;
    }
    // 임시로 현재 기준 offsetDays만큼 + 60일 버퍼
    const d = new Date(now);
    d.setDate(d.getDate() + Math.abs(offsetDays) + 60);
    return d;
}
function isStageBlocked(stage) {
    // 1단계는 즉시 활성, 나머지는 blocked 상태로 시작
    return stage > 1;
}
