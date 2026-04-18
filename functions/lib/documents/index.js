import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
const REGION = 'asia-northeast3';
const SCHEDULE = '0 9 * * *'; // 매일 09:00 KST
const TZ = 'Asia/Seoul';
const DOC_TYPE_LABEL = {
    contract: '계약서',
    background_info: '신상정보',
    rights_notice: '권리고지서',
    criminal_record: '범죄경력증명서',
    health_cert: '건강진단서',
    income_proof: '소득증명',
    marital_cert: '혼인관계증명서',
    passport: '여권',
    other: '기타',
};
/**
 * 매일 09시 KST에 만료 임박(30일 이내) 또는 이미 만료된 서류를 찾아
 * 해당 업체에 notifications 생성.
 */
export const checkExpiringDocuments = onSchedule({ region: REGION, schedule: SCHEDULE, timeZone: TZ, timeoutSeconds: 540 }, async () => {
    const db = getFirestore();
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // collectionGroup + agencyId 비정규화된 documents 쿼리
    const snap = await db
        .collectionGroup('documents')
        .where('validUntil', '<=', Timestamp.fromDate(in30Days))
        .get();
    // 업체별로 그룹핑
    const byAgency = new Map();
    for (const d of snap.docs) {
        const data = d.data();
        const agencyId = data.agencyId;
        if (!agencyId)
            continue;
        // 경로에서 clientId 추출: agencies/{aid}/clients/{cid}/documents/{docId}
        const segments = d.ref.path.split('/');
        const clientId = segments[3];
        if (!data.validUntil)
            continue;
        if (!byAgency.has(agencyId))
            byAgency.set(agencyId, []);
        byAgency.get(agencyId).push({
            docId: d.id,
            clientId: clientId ?? '',
            type: data.type ?? 'other',
            validUntil: data.validUntil.toDate(),
            fileName: data.fileName ?? '',
        });
    }
    // 알림 생성 (배치)
    let totalNotifs = 0;
    for (const [agencyId, docs] of byAgency) {
        const batch = db.batch();
        for (const d of docs) {
            const daysLeft = Math.ceil((d.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const severity = daysLeft < 0 ? 'critical' : daysLeft <= 7 ? 'warning' : 'info';
            const state = daysLeft < 0 ? `만료 ${-daysLeft}일 경과` : `D-${daysLeft}`;
            // 중복 방지: 같은 docId 에 대해 오늘 이미 알림이 있으면 skip
            const todayKey = now.toISOString().slice(0, 10);
            const notifId = `doc_${d.docId}_${todayKey}`;
            const ref = db.doc(`agencies/${agencyId}/notifications/${notifId}`);
            batch.set(ref, {
                notifId,
                type: 'doc_expiring',
                severity,
                title: `${DOC_TYPE_LABEL[d.type] ?? d.type} 유효기간 ${state}`,
                message: `${d.fileName || ''} - 갱신이 필요합니다.`,
                link: `/agency/clients/${d.clientId}`,
                targetUids: [],
                readBy: {},
                createdAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            totalNotifs++;
        }
        await batch.commit();
    }
    logger.info(`유효기간 점검: ${byAgency.size}개 업체, 총 ${totalNotifs}건 알림`);
});
