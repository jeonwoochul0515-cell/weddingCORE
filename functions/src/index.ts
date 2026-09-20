/**
 * weddingCORE Cloud Functions 엔트리.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
// 상수 하나 때문에 automation/index를 불러오면 Anthropic SDK가 모든 함수의
// 콜드스타트에 딴려온다. 정의만 들어 있는 파일에서 읽는다.
import { DEFAULT_MONTHLY_ALLOWANCE } from './domain/credits.js';
import { matchBrokerRegistry } from './registry/lookup.js';

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
 * 가입 문서의 소유권을 확인한 뒤 서비스 사용 권한만 부여한다.
 * 가입 플로우에서 agency 문서를 생성한 본인(ownerUid == auth.uid)이 호출하면
 * owner Custom Claims를 주입한다. 공시 인증 배지는 관리자 검증 전까지 pending이다.
 */
export const selfProvisionAgency = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const uid = request.auth.uid;
  const { agencyId } = request.data as { agencyId?: string };
  if (!agencyId) throw new HttpsError('invalid-argument', 'agencyId가 필요합니다.');
  if (agencyId !== `ag_${uid.slice(0, 12)}`) {
    throw new HttpsError('permission-denied', '허용되지 않은 업체 식별자입니다.');
  }

  const snap = await db.doc(`agencies/${agencyId}`).get();
  if (!snap.exists) throw new HttpsError('not-found', '업체 문서를 찾을 수 없습니다.');
  const agency = snap.data()!;
  if (agency.ownerUid !== uid) {
    throw new HttpsError('permission-denied', '해당 업체의 소유자가 아닙니다.');
  }
  if (!agency.registrationNumber) {
    throw new HttpsError('failed-precondition', '결혼중개업 등록번호가 누락되었습니다.');
  }
  if (agency.verificationStatus !== 'pending') {
    throw new HttpsError('failed-precondition', '승인 대기 중인 업체만 등록할 수 있습니다.');
  }

  await adminAuth.setCustomUserClaims(uid, { agencyId, role: 'owner' });
  await db.doc(`agencies/${agencyId}`).update({
    aiCredits: {
      monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
      used: 0,
      resetAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`users/${uid}`).set({ role: 'agency_owner', agencyId }, { merge: true });

  return { ok: true, agencyId, verificationStatus: 'pending' };
});

export const approveAgency = onCall(
  { region: REGION, secrets: ['DATA_GO_KR_KEY'], timeoutSeconds: 30 },
  async (request) => {
  await requireAdmin(request.auth);
  const { agencyId, force, forceReason } = request.data as {
    agencyId?: string;
    force?: boolean;
    forceReason?: string;
  };
  if (!agencyId) throw new HttpsError('invalid-argument', 'agencyId가 필요합니다.');

  const agencySnap = await db.doc(`agencies/${agencyId}`).get();
  if (!agencySnap.exists) throw new HttpsError('not-found', '업체를 찾을 수 없습니다.');
  const agency = agencySnap.data()!;
  if (agency.verificationStatus === 'verified') {
    return { ok: true, message: '이미 승인된 업체입니다.' };
  }

  // ★ 공시에서 찾히는가. 이 공시는 국제결혼중개업체만 담으므로,
  // 찾히지 않으면 국제 등록이 없다는 뜻이다. 무등록 국제중개는 법 제26조 제1항으로
  // 5년 이하 징역 또는 5천만원 이하 벌금이다. 우리가 배지를 주면 그걸 거든는 꼴이 된다.
  //
  // 막지 않고 멈추기만 한다. 새로 등록한 업체는 공시 반영이 늦을 수 있어,
  // 사람이 등록증을 눈으로 보고 사유를 적어 넘길 길을 둔다.
  let registry: Awaited<ReturnType<typeof matchBrokerRegistry>> | null = null;
  try {
    registry = await matchBrokerRegistry(
      String(agency.name ?? ''),
      String(agency.ownerName ?? '') || null,
    );
  } catch (err) {
    // 공시 API가 죽었다고 승인을 못 하게 만들지는 않는다. 확인 못 했다고만 적는다.
    logger.warn('공시 대조 실패', { agencyId, message: (err as Error).message });
  }

  if (registry && !registry.found && !force) {
    const hint = registry.ownerMismatch
      ? `공시에 같은 상호가 있지만 대표자가 다릅니다(공시: ${registry.hit?.rprsvNm}).`
      : registry.candidates.length > 0
        ? `비슷한 업체: ${registry.candidates.slice(0, 3).map((c) => `${c.entrpsNm}(${c.rprsvNm})`).join(', ')}`
        : '공시에서 찾지 못했습니다.';
    throw new HttpsError(
      'failed-precondition',
      `국제결혼중개업 등록을 공시에서 확인하지 못했습니다. ${hint} ` +
        '등록증을 직접 확인하셨으면 사유를 적어 다시 인증해 주세요.',
    );
  }

  const ownerUid = agency.ownerUid as string;
  await adminAuth.setCustomUserClaims(ownerUid, { agencyId, role: 'owner' });

  await db.doc(`agencies/${agencyId}`).update({
    verificationStatus: 'verified',
    verifiedAt: FieldValue.serverTimestamp(),
    registryVerified: registry?.found
      ? {
          source: '성평등가족부 결혼중개업 공시',
          entrpsNm: registry.hit?.entrpsNm ?? '',
          rprsvNm: registry.hit?.rprsvNm ?? '',
          region: registry.hit?.region ?? '',
          registeredOn: registry.hit?.mrbrkRegYmd ?? null,
          operating: registry.hit?.operYn ?? false,
          hasSanctions: registry.hit?.hasSanctions ?? false,
          checkedAt: FieldValue.serverTimestamp(),
        }
      : {
          source: '성평등가족부 결혼중개업 공시',
          found: false,
          // 사람이 눈으로 보고 넘겼다면 그 사유를 남긴다. 나중에 누가 왜 통과시켰는지 묻는다.
          forcedBy: request.auth!.uid,
          forceReason: String(forceReason ?? '').slice(0, 300),
          checkedAt: FieldValue.serverTimestamp(),
        },
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

    return { ok: true, registryFound: registry?.found ?? null };
  },
);

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

// 가입 시 사업자등록증 자동 판독
export { extractBusinessRegistration } from './agency/registrationOcr.js';
// 현지 에이전트가 카톡으로 보낸 후보 자료(글 + 프로필 카드 사진)를 명부 폼으로 바꾼다
export { extractPartnerProfile } from './agency/partnerIntake.js';

// 직원 초대·역할·내보내기. 클레임을 다루므로 서버에서만 한다.
export { claimStaffInvite, removeStaff, changeStaffRole } from './agency/staff.js';

// AI document automation + lawyer review
export {
  generateLegalDocument,
  grantAiCarats,
  recordAutomationConsent,
  reviewLegalDocument,
} from './automation/index.js';

// 상담 접수와 중앙 접수함 연동
export {
  submitConsult,
  submitCheckLead,
  weddingcoreAdmin,
  purgeOldConsultSessions,
  purgeRateLimits,
} from './consult/index.js';
// 상담 캐릭터 하람의 대화 엔진 (워커 /api/chat이 넘겨준다)
export { haramChat } from './consult/haramChat.js';

// 비자 거부·불허 판례·결정례 수집
export { collectPrecedents, runPrecedentCollectNow } from './regulations/precedents.js';
export { tagPrecedentRequirements, runRequirementTaggingNow } from './regulations/tagRequirements.js';
export { searchPrecedents, precedentCounts, getPrecedent } from './regulations/precedentSearch.js';

// 결제 (토스페이먼츠)
export { createPaymentOrder, confirmPayment } from './payments/toss.js';

// 영상통화 — 업체를 거쳐야만 연결된다. 법정의무를 다 마치기 전에는 방이 안 열린다.
export {
  checkVideoCallReadiness,
  startVideoCall,
  joinVideoCall,
  appendCallTranscript,
  endVideoCall,
  purgeExpiredCallRecords,
} from './video/index.js';
