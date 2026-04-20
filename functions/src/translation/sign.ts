/**
 * 번역 서명 (B4): 서버측에서 stale / missing field 검증 후
 * signedAt/signedByName/signedByUid 기록 + auditLogs 스냅샷.
 *
 * 클라이언트 직접 쓰기를 대체하여 감사 추적성 확보.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const REGION = 'asia-northeast3';

const REQUIRED_FIELDS = [
  'maritalHistory',
  'hasChildren',
  'health',
  'criminalRecord',
  'occupation',
  'income',
  'property',
  'residence',
  'familySituation',
] as const;

export const signBackgroundTranslation = onCall(
  { region: REGION },
  async (request) => {
    const role = request.auth?.token?.role;
    if (!['owner', 'manager', 'staff', 'admin'].includes(role as string)) {
      throw new HttpsError('permission-denied', '권한 없음');
    }
    const callerAgencyId = request.auth?.token?.agencyId as string | undefined;

    const { agencyId, clientId, infoId, lang, signerName } = request.data as {
      agencyId?: string;
      clientId?: string;
      infoId?: string;
      lang?: string;
      signerName?: string;
    };
    if (!agencyId || !clientId || !infoId || !lang || !signerName?.trim()) {
      throw new HttpsError('invalid-argument', '필수 파라미터 누락');
    }
    if (role !== 'admin' && callerAgencyId !== agencyId) {
      throw new HttpsError('permission-denied', '다른 업체의 자료 접근 불가');
    }

    const db = getFirestore();
    const infoRef = db.doc(`agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}`);
    const translationRef = db.doc(
      `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}/translations/${lang}`,
    );

    const [infoSnap, translationSnap] = await Promise.all([infoRef.get(), translationRef.get()]);
    if (!infoSnap.exists) throw new HttpsError('not-found', '신상정보 없음');
    const info = infoSnap.data() as {
      sourceLang: string;
      fields: Record<string, string | number>;
      fieldsUpdatedAt?: Timestamp;
    };
    const isSource = info.sourceLang === lang;

    let translation:
      | {
          lang: string;
          fields: Record<string, string>;
          translatedBy: 'ai' | 'human';
          translationQuality: string;
          translatedAt?: Timestamp;
        }
      | null = translationSnap.exists ? (translationSnap.data() as never) : null;

    // 원본 서명: 번역 문서가 없으면 원본 자체로 생성 후 서명
    if (isSource && !translation) {
      translation = {
        lang,
        fields: Object.fromEntries(
          Object.entries(info.fields).map(([k, v]) => [k, String(v)]),
        ),
        translatedBy: 'human',
        translationQuality: 'certified',
        translatedAt: Timestamp.now(),
      };
      await translationRef.set({
        ...translation,
        translatedAt: FieldValue.serverTimestamp(),
      });
    }
    if (!translation) {
      throw new HttpsError('failed-precondition', '번역 문서가 없습니다. 먼저 번역을 생성하세요.');
    }

    // 누락 필드 검증
    const missing: string[] = [];
    for (const key of REQUIRED_FIELDS) {
      const srcVal = info.fields?.[key];
      if (srcVal === undefined || srcVal === null || String(srcVal).trim() === '') continue;
      const tgtVal = translation.fields?.[key];
      if (tgtVal === undefined || tgtVal === null || String(tgtVal).trim() === '') {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new HttpsError(
        'failed-precondition',
        `번역 누락 필드: ${missing.join(', ')}`,
      );
    }

    // stale 검증 (원본은 자기 자신이므로 skip)
    if (!isSource) {
      const srcUpdatedMs = info.fieldsUpdatedAt?.toMillis?.();
      const translatedMs = translation.translatedAt?.toMillis?.();
      if (srcUpdatedMs && translatedMs && srcUpdatedMs > translatedMs) {
        throw new HttpsError(
          'failed-precondition',
          '원본이 번역 이후 수정되었습니다. 번역을 재생성하세요.',
        );
      }
    }

    await translationRef.update({
      signedAt: FieldValue.serverTimestamp(),
      signedByName: signerName.trim(),
      signedByUid: request.auth!.uid,
    });

    await db.collection('auditLogs').add({
      actorUid: request.auth!.uid,
      agencyId,
      action: 'background_info.signed',
      targetPath: `agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}/translations/${lang}`,
      before: null,
      after: {
        signedByName: signerName.trim(),
        sourceLang: info.sourceLang,
        targetLang: lang,
        translationQuality: translation.translationQuality,
        translatedBy: translation.translatedBy,
        sourceFields: info.fields,
        translatedFields: translation.fields,
      },
      ip: request.rawRequest.ip ?? '',
      userAgent: request.rawRequest.headers['user-agent'] ?? '',
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  },
);
