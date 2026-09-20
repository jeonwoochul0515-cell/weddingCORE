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

  // ★ 메일 주소를 정말 가진 사람인가.
  // Firebase 이메일·비밀번호 가입은 소유 확인 없이 아무 주소나 쓸 수 있다. 이걸 안 보면
  // 남의 직원 이메일을 아는 사람이 그 주소로 가입해 그 업체 고객 명부를 통째로 가져간다.
  // 구글 로그인은 email_verified가 처음부터 true라 그대로 통과한다.
  if (request.auth?.token?.email_verified !== true) {
    return { joined: false, reason: 'email-unverified' };
  }

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

  // 반려된 업체에는 직원을 붙이지 않는다.
  // (사용 권한은 가입 즉시 나가고 verified는 공시 인증 배지라, pending은 막을 이유가 없다)
  const agency = await db().doc(`agencies/${agencyId}`).get();
  if (!agency.exists) throw new HttpsError('not-found', '업체를 찾지 못했습니다.');
  if (agency.get('verificationStatus') === 'rejected') {
    throw new HttpsError('failed-precondition', '가입이 반려된 업체입니다.');
  }

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

  // ★ 클레임을 쓰기 전에 「정말 우리 직원인가」를 먼저 본다.
  // 이 확인이 없으면 대표가 아무 uid나 넣어 그 사람의 클레임을 통째로 덮어쓸 수 있다.
  // 피해자는 자기 업체에서 튕겨 나와 남의 업체 직원이 된다. members 문서 갱신이
  // 뒤이어 실패해도 클레임은 이미 바뀐 뒤라 되돌릴 방법이 없다.
  const memberRef = db().doc(`agencies/${agencyId}/members/${uid}`);
  const member = await memberRef.get();
  if (!member.exists) throw new HttpsError('not-found', '그 직원을 찾지 못했습니다.');
  if (member.get('role') === 'owner') {
    throw new HttpsError('failed-precondition', '대표의 역할은 바꿀 수 없습니다.');
  }

  await getAuth().setCustomUserClaims(uid, { agencyId, role });
  await memberRef.update({ role });
  return { changed: true };
});
