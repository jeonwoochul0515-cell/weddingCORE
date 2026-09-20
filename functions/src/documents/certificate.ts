// 신상정보 교환완료 증명서 — 버튼 하나로 낸다
//
// 이 증명서가 증명하는 것은 「양쪽이 서로의 신상정보를 받고, 모국어로 읽고, 이해했다」는
// 사실이다. 그 사실은 이미 시스템 안에 있다 — 신상정보 문서, 서명된 번역본, 전달·수령 기록.
// 사람이 그걸 다시 워드로 옮겨 적을 이유가 없다.
//
// ★ 없는 사실을 증명서로 만들지 않는다. 번역이 서명되지 않았거나 한쪽만 전달됐으면
//   발급을 거절하고 무엇이 모자란지 돌려준다. 증명서는 나중에 처분을 다툴 때 내는 문서다.
//   그때 근거가 비어 있으면 그 증명서가 오히려 불리한 자료가 된다.

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  deliverySatisfied,
  translationSatisfied,
  type DeliveryRecord,
  type TranslationRecord,
} from '../domain/obligationEvidence.js';

const REGION = 'asia-northeast3';
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== 'true';
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

const LANG_BY_NATIONALITY: Array<[string, string]> = [
  ['베트남', 'vi'],
  ['라오스', 'lo'],
  ['캄보디아', 'km'],
  ['태국', 'th'],
  ['필리핀', 'tl'],
  ['몽골', 'mn'],
  ['중국', 'zh'],
  ['대만', 'zh'],
  ['우즈베키스탄', 'uz'],
  ['네팔', 'ne'],
  ['인도네시아', 'id'],
  ['러시아', 'ru'],
];

const LANG_LABEL: Record<string, string> = {
  ko: '한국어',
  vi: '베트남어',
  lo: '라오어',
  km: '크메르어',
  th: '태국어',
  tl: '타갈로그어',
  mn: '몽골어',
  zh: '중국어',
  uz: '우즈베크어',
  ne: '네팔어',
  id: '인도네시아어',
  ru: '러시아어',
  en: '영어',
};

export type CertificateResult =
  | { issued: true; certificateId: string; issuedAt: number }
  | { issued: false; missing: string[] };

function fmt(ts: Timestamp | undefined | null): string {
  const d = ts?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export const issueExchangeCertificate = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 60 },
  async (request): Promise<CertificateResult> => {
    const uid = request.auth?.uid;
    const agencyId = request.auth?.token?.agencyId as string | undefined;
    if (!uid || !agencyId) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { matchId } = request.data as { matchId?: string };
    if (!matchId || !SAFE_ID.test(matchId)) {
      throw new HttpsError('invalid-argument', '맞선 건 식별자가 올바르지 않습니다.');
    }

    const db = getFirestore();
    const matchSnap = await db.doc(`agencies/${agencyId}/matches/${matchId}`).get();
    if (!matchSnap.exists) throw new HttpsError('not-found', '맞선 건을 찾을 수 없습니다.');

    const clientId = String(matchSnap.get('clientId') ?? '');
    const partnerId = String(matchSnap.get('partnerId') ?? '');
    if (!clientId) throw new HttpsError('failed-precondition', '맞선 건에 고객이 없습니다.');
    const base = `agencies/${agencyId}/clients/${clientId}`;

    const [agencySnap, partnerSnap, clientSnap, infos] = await Promise.all([
      db.doc(`agencies/${agencyId}`).get(),
      partnerId ? db.doc(`agencies/${agencyId}/partners/${partnerId}`).get() : Promise.resolve(null),
      db.doc(base).get(),
      db.collection(`${base}/backgroundInfo`).get(),
    ]);

    const nationality = String(partnerSnap?.get('nationality') ?? '');
    const hit = LANG_BY_NATIONALITY.find(([name]) => nationality.includes(name));
    const partnerLang = hit ? hit[1] : '';

    // 근거를 모은다.
    const translations: TranslationRecord[] = [];
    const deliveries: DeliveryRecord[] = [];
    const infoSummary: Array<{ subject: string; infoId: string; updatedAt: string }> = [];

    await Promise.all(
      infos.docs.map(async (info) => {
        const subject = String(info.get('subject') ?? 'korean') as 'korean' | 'partner';
        infoSummary.push({
          subject,
          infoId: info.id,
          updatedAt: fmt(info.get('updatedAt') as Timestamp),
        });
        const [tSnap, dSnap] = await Promise.all([
          db.collection(`${base}/backgroundInfo/${info.id}/translations`).get(),
          db.collection(`${base}/backgroundInfo/${info.id}/deliveries`).get(),
        ]);
        for (const t of tSnap.docs) {
          translations.push({
            infoId: info.id,
            subject,
            lang: String(t.get('lang') ?? t.id),
            signed: Boolean(t.get('signedAt')),
          });
        }
        for (const d of dSnap.docs) {
          deliveries.push({
            infoId: info.id,
            to: String(d.get('to') ?? 'partner') as 'korean' | 'partner',
            receiptConfirmed: d.get('receiptConfirmed') === true,
            explained: d.get('explained') === true,
          });
        }
      }),
    );

    // ★ 모자란 것이 있으면 내주지 않는다.
    const missing: string[] = [];
    if (!infos.docs.some((d) => d.get('subject') === 'korean')) {
      missing.push('한국인 고객의 신상정보가 아직 작성되지 않았습니다.');
    }
    if (!infos.docs.some((d) => d.get('subject') === 'partner')) {
      missing.push('외국인 후보의 신상정보가 아직 작성되지 않았습니다.');
    }
    if (!partnerLang) {
      missing.push(
        `후보의 국적(${nationality || '미입력'})으로 모국어를 알 수 없습니다. 후보 명부에서 국적을 확인해 주세요.`,
      );
    } else if (!translationSatisfied(translations, partnerLang)) {
      missing.push(
        `양쪽 신상정보가 ${LANG_LABEL[partnerLang] ?? partnerLang}·한국어로 번역되고 각각 수령·이해 확인 서명까지 끝나야 합니다.`,
      );
    }
    if (!deliverySatisfied(deliveries)) {
      missing.push('양방향 전달과 수령확인·설명 기록이 모두 있어야 합니다.');
    }

    if (missing.length > 0) {
      return { issued: false, missing };
    }

    // 증명서는 서류함에 남긴다. 나중에 찾을 곳이 한 군데여야 한다.
    const certRef = db.collection(`${base}/documents`).doc();
    const issuedAt = Timestamp.now();

    await certRef.set({
      agencyId,
      type: 'background_info',
      // 양쪽이 주고받았음을 증명하는 문서다. 한쪽 것이 아니다.
      subject: 'both',
      storageUrl: '',
      storagePath: '',
      fileName: `신상정보 교환완료 증명서 (${String(matchSnap.get('clientName') ?? '')}·${String(matchSnap.get('partnerName') ?? '')}).pdf`,
      mimeType: 'application/json',
      issuedAt,
      validUntil: null,
      // 증명서의 내용은 파일이 아니라 이 자료다. 나중에 화면이 그대로 그려 낸다.
      certificate: {
        kind: 'background_exchange',
        matchId,
        agencyName: String(agencySnap.get('name') ?? ''),
        registrationNumber: String(
          agencySnap.get('internationalRegistrationNumber') ?? agencySnap.get('registrationNumber') ?? '',
        ),
        clientName: String(matchSnap.get('clientName') ?? clientSnap.get('koreanClient.name') ?? ''),
        partnerName: String(matchSnap.get('partnerName') ?? ''),
        partnerNationality: nationality,
        partnerLang,
        partnerLangLabel: LANG_LABEL[partnerLang] ?? partnerLang,
        infos: infoSummary,
        // 무엇을 근거로 발급했는지 숫자로 남긴다. 나중에 되짚을 수 있어야 한다.
        evidence: {
          translationsSigned: translations.filter((t) => t.signed).length,
          deliveriesConfirmed: deliveries.filter((d) => d.receiptConfirmed && d.explained).length,
        },
        legalBasis: '결혼중개업법 제10조의2, 같은 법 시행령 제3조의2',
        issuedAt: issuedAt.toMillis(),
        issuedBy: uid,
      },
      ocrExtracted: null,
      uploadedBy: uid,
      uploadedAt: FieldValue.serverTimestamp(),
      replaces: null,
    });

    // 해당 법정의무도 같이 닫는다. 증명서를 냈는데 타임라인이 안 닫히면 또 손이 간다.
    const timeline = await db
      .collection(`${base}/timeline`)
      .where('templateCode', '==', 'BG_CERTIFICATE')
      .limit(1)
      .get();
    const row = timeline.docs[0];
    if (row && row.get('status') !== 'done') {
      await row.ref.update({
        status: 'done',
        completedAt: FieldValue.serverTimestamp(),
        completedBy: uid,
        evidence: FieldValue.arrayUnion({ docId: certRef.id, addedAt: issuedAt }),
        notes: '교환완료 증명서 발급',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    logger.info('교환완료 증명서 발급', { agencyId, clientId, matchId, certificateId: certRef.id });
    return { issued: true, certificateId: certRef.id, issuedAt: issuedAt.toMillis() };
  },
);
