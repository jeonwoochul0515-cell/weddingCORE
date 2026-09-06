// 직원 초대 — 대표가 이메일로 부르고, 그 이메일로 가입한 사람이 그 업체 직원이 된다
//
// 왜 서버가 하나
//   업체 소속과 역할은 커스텀 클레임에 들어간다. 클레임은 클라이언트가 못 바꾼다.
//   초대장을 확인하고 클레임을 넣는 일은 서버만 할 수 있다.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const REGION = 'asia-northeast3';
const ROLES = ['manager', 'staff', 'readonly'] as const;
type StaffRole = (typeof ROLES)[number];

const db = () => getFirestore();

/** 대문자·공백 때문에 초대가 안 맞는 일을 막는다 */
const normalize = (email: string) => email.trim().toLowerCase();

/**
 * 로그인은 했는데 아직 어느 업체에도 속하지 않은 사람이 부른다.
 * 자기 이메일로 온 초대장이 있으면 그 업체 직원이 된다.
 */
export const claimStaffInvite = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email as string | undefined;
  if (!uid || !email) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  // 이미 소속이 있으면 손대지 않는다. 초대로 소속을 갈아타지 못하게 한다.
  if (request.auth?.token?.agencyId) return { joined: false, reason: 'already-member' };

  const snap = await db()
    .collectionGroup('invites')
    .where('email', '==', normalize(email))
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (snap.empty) return { joined: false, reason: 'no-invite' };

  const invite = snap.docs[0]!;
  const agencyId = invite.ref.parent.parent?.id;
  if (!agencyId) throw new HttpsError('internal', '초대장의 업체를 찾지 못했습니다.');
  const role = (invite.get('role') as StaffRole) ?? 'staff';
  if (!ROLES.includes(role)) throw new HttpsError('failed-precondition', '초대장의 역할이 올바르지 않습니다.');

  // 승인 전 업체에는 직원을 붙이지 않는다. 승인 뒤 다시 부르면 된다.
  const agency = await db().doc(`agencies/${agencyId}`).get();
  if (!agency.exists) throw new HttpsError('not-found', '업체를 찾지 못했습니다.');

  await getAuth().setCustomUserClaims(uid, { agencyId, role });
  await db().doc(`agencies/${agencyId}/members/${uid}`).set({
    uid,
    email: normalize(email),
    role,
    invitedAt: invite.get('invitedAt') ?? FieldValue.serverTimestamp(),
    joinedAt: FieldValue.serverTimestamp(),
  });
  await invite.ref.update({
    status: 'accepted',
    acceptedUid: uid,
    acceptedAt: FieldValue.serverTimestamp(),
  });

  return { joined: true, agencyId, role };
});

/**
 * 대표가 직원을 내보낸다. 클레임을 지워야 실제로 접근이 끊기므로 서버가 한다.
 * 화면에서 members 문서만 지우면 토큰이 살아 있어 그대로 들어온다.
 */
export const removeStaff = onCall({ region: REGION }, async (request) => {
  const agencyId = request.auth?.token?.agencyId as string | undefined;
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  if (!agencyId || request.auth.token?.role !== 'owner') {
    throw new HttpsError('permission-denied', '대표만 직원을 내보낼 수 있습니다.');
  }
  const { uid } = request.data as { uid?: string };
  if (!uid) throw new HttpsError('invalid-argument', '내보낼 직원을 지정해 주세요.');
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', '대표는 스스로를 내보낼 수 없습니다.');
  }

  const member = await db().doc(`agencies/${agencyId}/members/${uid}`).get();
  if (!member.exists) throw new HttpsError('not-found', '그 직원을 찾지 못했습니다.');

  await getAuth().setCustomUserClaims(uid, {});
  await db().doc(`agencies/${agencyId}/members/${uid}`).delete();
  return { removed: true };
});

/**
 * 역할 바꾸기. 클레임과 members 문서를 함께 고쳐야 한다.
 * 한쪽만 고치면 화면에는 바뀐 것으로 보이는데 실제 권한은 그대로다.
 */
export const changeStaffRole = onCall({ region: REGION }, async (request) => {
  const agencyId = request.auth?.token?.agencyId as string | undefined;
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  if (!agencyId || request.auth.token?.role !== 'owner') {
    throw new HttpsError('permission-denied', '대표만 역할을 바꿀 수 있습니다.');
  }
  const { uid, role } = request.data as { uid?: string; role?: StaffRole };
  if (!uid || !role || !ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', '직원과 역할을 올바르게 지정해 주세요.');
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', '대표는 스스로의 역할을 바꿀 수 없습니다.');
  }

  await getAuth().setCustomUserClaims(uid, { agencyId, role });
  await db().doc(`agencies/${agencyId}/members/${uid}`).update({ role });
  return { changed: true };
});
