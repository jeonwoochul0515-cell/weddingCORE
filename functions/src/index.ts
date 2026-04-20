/**
 * weddingCORE Cloud Functions 엔트리.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

const REGION = 'asia-northeast3';

async function requireAdmin(
  authCtx: { uid?: string; token?: Record<string, unknown> } | undefined,
) {
  if (!authCtx?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  if (authCtx.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자만 호출할 수 있습니다.');
  }
}

/**
 * 등록번호 입력만으로 즉시 사용 시작.
 * 가입 플로우에서 agency 문서를 생성한 본인(ownerUid == auth.uid)이 호출하면
 * verified 처리 + owner Custom Claims 주입. 관리자 승인 불필요.
 */
export const selfProvisionAgency = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const uid = request.auth.uid;
  const { agencyId } = request.data as { agencyId?: string };
  if (!agencyId) throw new HttpsError('invalid-argument', 'agencyId가 필요합니다.');

  const snap = await db.doc(`agencies/${agencyId}`).get();
  if (!snap.exists) throw new HttpsError('not-found', '업체 문서를 찾을 수 없습니다.');
  const agency = snap.data()!;
  if (agency.ownerUid !== uid) {
    throw new HttpsError('permission-denied', '해당 업체의 소유자가 아닙니다.');
  }
  if (!agency.registrationNumber) {
    throw new HttpsError('failed-precondition', '결혼중개업 등록번호가 누락되었습니다.');
  }

  await adminAuth.setCustomUserClaims(uid, { agencyId, role: 'owner' });
  await db.doc(`agencies/${agencyId}`).update({
    verificationStatus: 'verified',
    verifiedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`users/${uid}`).set({ role: 'agency_owner', agencyId }, { merge: true });

  return { ok: true, agencyId };
});

export const approveAgency = onCall({ region: REGION }, async (request) => {
  await requireAdmin(request.auth);
  const { agencyId } = request.data as { agencyId?: string };
  if (!agencyId) throw new HttpsError('invalid-argument', 'agencyId가 필요합니다.');

  const agencySnap = await db.doc(`agencies/${agencyId}`).get();
  if (!agencySnap.exists) throw new HttpsError('not-found', '업체를 찾을 수 없습니다.');
  const agency = agencySnap.data()!;
  if (agency.verificationStatus === 'verified') {
    return { ok: true, message: '이미 승인된 업체입니다.' };
  }

  const ownerUid = agency.ownerUid as string;
  await adminAuth.setCustomUserClaims(ownerUid, { agencyId, role: 'owner' });

  await db.doc(`agencies/${agencyId}`).update({
    verificationStatus: 'verified',
    verifiedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('auditLogs').add({
    actorUid: request.auth!.uid,
    agencyId,
    action: 'agency.approved',
    targetPath: `agencies/${agencyId}`,
    before: { verificationStatus: 'pending' },
    after: { verificationStatus: 'verified' },
    ip: request.rawRequest.ip ?? '',
    userAgent: request.rawRequest.headers['user-agent'] ?? '',
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

export const rejectAgency = onCall({ region: REGION }, async (request) => {
  await requireAdmin(request.auth);
  const { agencyId, reason } = request.data as { agencyId?: string; reason?: string };
  if (!agencyId) throw new HttpsError('invalid-argument', 'agencyId가 필요합니다.');

  await db.doc(`agencies/${agencyId}`).update({
    verificationStatus: 'rejected',
    rejectionReason: reason ?? null,
    verifiedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('auditLogs').add({
    actorUid: request.auth!.uid,
    agencyId,
    action: 'agency.rejected',
    targetPath: `agencies/${agencyId}`,
    before: { verificationStatus: 'pending' },
    after: { verificationStatus: 'rejected', rejectionReason: reason ?? null },
    ip: request.rawRequest.ip ?? '',
    userAgent: request.rawRequest.headers['user-agent'] ?? '',
    createdAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

// Regulatory Radar (W4)
export { crawlRegulations, runCrawlNow } from './regulations/index.js';

// Document Expiry Alerts (W8)
export { checkExpiringDocuments } from './documents/index.js';

// Obligation Templates Admin (W5-7)
export { seedObligationTemplates } from './admin/index.js';

// Timeline Seeding on Client Creation (W5-7)
export {
  onClientCreated,
  onTimelineItemUpdated,
  markAnchorEvent,
  checkTimelineOverdue,
} from './timeline/index.js';

// Background Info Translation (W9-10)
export { translateBackgroundInfo } from './translation/index.js';
export { signBackgroundTranslation } from './translation/sign.js';

// Public Registry Lookup (Phase 2 단계 1)
export { searchBrokerRegistry } from './registry/lookup.js';
