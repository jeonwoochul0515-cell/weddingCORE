#!/usr/bin/env node
/**
 * 에뮬레이터 부트스트랩.
 * 실행: node scripts/seedEmulator.mjs (에뮬레이터가 켜져 있어야 함)
 *
 * 수행:
 *  1) admin 사용자 생성 (admin@wedding.local / admin1234)
 *  2) 해당 UID에 Custom Claims { role: 'admin' } 설정
 *  3) 변호사 사용자 생성 (lawyer@wedding.local / lawyer1234) + role: 'lawyer'
 *  4) obligationTemplates 시드 호출 (seedObligationTemplates Functions)
 *
 * 참고: 에뮬레이터에서는 FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST 환경변수로 자동 라우팅.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { OBLIGATION_TEMPLATES } from '../functions/lib/admin/obligationTemplates.js';

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.GCLOUD_PROJECT ??= 'wedding-core-prod';

initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const auth = getAuth();
const db = getFirestore();

async function ensureUser(email, password, claims) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`기존 사용자: ${email} (${user.uid})`);
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true });
    console.log(`생성: ${email} (${user.uid})`);
  }
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`  → claims =`, claims);
  return user;
}

const admin = await ensureUser('admin@wedding.local', 'admin1234', { role: 'admin' });
const lawyer = await ensureUser('lawyer@wedding.local', 'lawyer1234', {
  role: 'lawyer',
  lawyerId: 'lawyer_changhee',
});

await db.doc(`users/${admin.uid}`).set(
  {
    uid: admin.uid,
    email: admin.email,
    displayName: '플랫폼 관리자',
    role: 'admin',
    agencyId: null,
    lawyerId: null,
  },
  { merge: true },
);

await db.doc(`users/${lawyer.uid}`).set(
  {
    uid: lawyer.uid,
    email: lawyer.email,
    displayName: '창희 변호사',
    role: 'lawyer',
    agencyId: null,
    lawyerId: 'lawyer_changhee',
  },
  { merge: true },
);

await db.doc('lawyers/lawyer_changhee').set(
  {
    lawyerId: 'lawyer_changhee',
    name: '창희',
    firmName: '법률사무소 청송',
    specialty: 'family_law',
    uid: lawyer.uid,
  },
  { merge: true },
);

// 40개 의무 템플릿 시드
const batch = db.batch();
const now = FieldValue.serverTimestamp();
for (const tpl of OBLIGATION_TEMPLATES) {
  batch.set(
    db.doc(`obligationTemplates/${tpl.code}`),
    { ...tpl, updatedBy: lawyer.uid, updatedAt: now },
    { merge: true },
  );
}
await batch.commit();
console.log(`obligationTemplates: ${OBLIGATION_TEMPLATES.length}개 시드 완료`);

console.log('\n완료. 로그인 정보:');
console.log('  관리자 : admin@wedding.local  / admin1234');
console.log('  변호사 : lawyer@wedding.local / lawyer1234');
