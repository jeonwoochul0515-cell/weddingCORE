import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { OBLIGATION_TEMPLATES } from './obligationTemplates.js';

const REGION = 'asia-northeast3';

/**
 * 40개 의무 템플릿을 Firestore `obligationTemplates` 컬렉션에 업서트.
 * 관리자 또는 변호사만 호출 가능.
 */
export const seedObligationTemplates = onCall({ region: REGION }, async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'admin' && role !== 'lawyer') {
    throw new HttpsError('permission-denied', '관리자 또는 변호사만 호출 가능합니다.');
  }

  const db = getFirestore();
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  const updatedBy = (request.auth!.token!.lawyerId as string | undefined) ?? request.auth!.uid;

  for (const tpl of OBLIGATION_TEMPLATES) {
    const ref = db.doc(`obligationTemplates/${tpl.code}`);
    batch.set(ref, { ...tpl, updatedBy, updatedAt: now }, { merge: true });
  }
  await batch.commit();

  return { ok: true, count: OBLIGATION_TEMPLATES.length };
});
