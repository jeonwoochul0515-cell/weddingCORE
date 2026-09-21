// 올려 둔 서류로 법정의무를 채운다 — 버튼 한 번
//
// 통화 준비 화면이 「범죄경력 서면제공가 끝나지 않았습니다」를 열두 줄 늘어놓고
// 「고객 상세 화면의 타임라인에서 완료해 주세요」라고만 했다. 서류는 이미 서류함에
// 올라와 있는데도 그랬다. 같은 일을 두 번 시키면서 나열만 한 셈이다.
//
// 여기서 한 번에 맞춘다. 무엇을 채웠고 무엇이 남았는지 돌려주므로
// 화면은 「무엇이 바뀌었나」를 그대로 보여 줄 수 있다.

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  deliverySatisfied,
  planObligationSync,
  translationSatisfied,
  type DeliveryRecord,
  type EvidenceDoc,
  type TimelineRow,
  type TranslationRecord,
} from '../domain/obligationEvidence.js';
import { CONTRACT_CODES, PRE_MEETING_CODES } from '../domain/videoCallGate.js';

const REGION = 'asia-northeast3';
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== 'true';
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export type ObligationSyncResult = {
  /** 이번에 채운 것 */
  completed: Array<{ templateCode: string; title: string }>;
  /** 이미 끝나 있던 것 */
  alreadyDone: string[];
  /** 아직 서류가 없어 남은 것 */
  missing: Array<{ templateCode: string; title: string; hint: string }>;
};

/** 서류로는 채울 수 없는 의무에 무엇을 해야 하는지 적어 둔다 */
const MANUAL_HINT: Record<string, string> = {
  BG_TRANSLATION:
    '신상정보를 후보의 모국어로 번역해야 합니다. 고객 상세의 번역 기능으로 만들고 서명을 받아 주세요.',
  BG_CERTIFICATE:
    '양쪽이 신상정보를 주고받았다는 증명서입니다. 상호 제공이 끝난 뒤 발급해 주세요.',
  BG_MUTUAL_DELIVERY:
    '양쪽에 신상정보를 전달하고 받았다는 확인을 서면으로 남겨 서류함에 「양쪽」으로 올려 주세요.',
};

const TITLE: Record<string, string> = {
  BG_KOR_CRIMINAL: '한국인 측 범죄경력 서면제공',
  BG_KOR_INCOME: '한국인 측 직업·소득·재산 서면제공',
  BG_KOR_HEALTH: '한국인 측 건강상태 확인',
  BG_KOR_MARITAL_HISTORY: '한국인 측 혼인경력 확인',
  BG_PARTNER_MARITAL_HISTORY: '외국인 측 혼인경력 확인',
  BG_PARTNER_HEALTH: '외국인 측 건강상태 확인',
  BG_PARTNER_CRIMINAL: '외국인 측 범죄경력 확인',
  BG_TRANSLATION: '신상정보 모국어 번역',
  BG_MUTUAL_DELIVERY: '상호 서면제공 및 수령확인',
  BG_CERTIFICATE: '신상정보 교환완료 증명서',
};

/** 서류함에서 올릴 수 있는 서류 이름. 남은 의무에 「무엇을 올리면 되는지」를 적어 준다 */
const DOC_HINT: Record<string, string> = {
  BG_KOR_CRIMINAL: '한국인 고객의 범죄경력 회보서를 「범죄경력」으로 올리면 자동으로 채워집니다.',
  BG_KOR_INCOME: '재직증명서·소득금액증명 등을 「소득 증빙」으로 올리면 자동으로 채워집니다.',
  BG_KOR_HEALTH: '건강진단서를 「건강진단서」로 올리면 자동으로 채워집니다.',
  BG_KOR_MARITAL_HISTORY: '혼인관계증명서를 「혼인관계증명」으로 올리면 자동으로 채워집니다.',
  BG_PARTNER_MARITAL_HISTORY:
    '후보의 혼인관계증명서를 「혼인관계증명 · 외국인」으로 올리면 자동으로 채워집니다.',
  BG_PARTNER_HEALTH: '후보의 건강진단서를 「건강진단서 · 외국인」으로 올리면 자동으로 채워집니다.',
  BG_PARTNER_CRIMINAL: '후보의 범죄경력 증명서를 「범죄경력 · 외국인」으로 올리면 자동으로 채워집니다.',
};

/**
 * 후보의 모국어를 명부에서 찾는다.
 *
 * 맞선 문서에 적혀 있으면 그걸 쓰고, 없으면 국적으로 갈음한다.
 * 모르면 빈 문자열이다 — 그러면 번역 의무를 「채워졌다」고 판단하지 않는다.
 */
const LANG_BY_NATIONALITY: Array<[string, string]> = [
  ['베트남', 'vi'],
  ['라오스', 'lo'],
  ['컬보디아', 'km'],
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

async function partnerLanguage(
  db: FirebaseFirestore.Firestore,
  agencyId: string,
  partnerId: string,
): Promise<string> {
  if (!partnerId) return '';
  const snap = await db.doc(`agencies/${agencyId}/partners/${partnerId}`).get();
  if (!snap.exists) return '';
  const nationality = String(snap.get('nationality') ?? '');
  const hit = LANG_BY_NATIONALITY.find(([name]) => nationality.includes(name));
  return hit ? hit[1] : '';
}

/** 신상정보 아래의 번역본과 전달 기록을 모은다 */
async function readBackgroundEvidence(
  db: FirebaseFirestore.Firestore,
  base: string,
): Promise<{ translations: TranslationRecord[]; deliveries: DeliveryRecord[] }> {
  const infos = await db.collection(`${base}/backgroundInfo`).get();
  const translations: TranslationRecord[] = [];
  const deliveries: DeliveryRecord[] = [];

  await Promise.all(
    infos.docs.map(async (info) => {
      const subject = String(info.get('subject') ?? 'korean') as 'korean' | 'partner';
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

  return { translations, deliveries };
}

export const syncObligationsFromDocuments = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 60 },
  async (request): Promise<ObligationSyncResult> => {
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
    if (!clientId) throw new HttpsError('failed-precondition', '맞선 건에 고객이 없습니다.');

    const base = `agencies/${agencyId}/clients/${clientId}`;
    const [docsSnap, timelineSnap] = await Promise.all([
      db.collection(`${base}/documents`).get(),
      db.collection(`${base}/timeline`).get(),
    ]);

    const documents: EvidenceDoc[] = docsSnap.docs.map((d) => ({
      docId: d.id,
      type: String(d.get('type') ?? 'other') as EvidenceDoc['type'],
      subject: String(d.get('subject') ?? 'korean') as EvidenceDoc['subject'],
    }));
    const timeline: TimelineRow[] = timelineSnap.docs.map((d) => ({
      id: d.id,
      templateCode: String(d.get('templateCode') ?? ''),
      status: String(d.get('status') ?? ''),
      evidenceDocIds: (
        (d.get('evidence') ?? []) as Array<{ docId?: string }>
      ).map((e) => String(e?.docId ?? '')),
    }));

    // 계약서도 서류함에 있으면 그것으로 채운다. 게이트가 요구하는 것과 채울 수 있는 것이
    // 어긋나면 사장은 「올렸는데 왜 안 되느냐」가 된다.
    const plan = planObligationSync(documents, timeline, [
      ...CONTRACT_CODES,
      ...PRE_MEETING_CODES,
    ]);

    // ── 서류함 밖의 근거 ──────────────────────
    //
    // 번역과 전달 기록은 backgroundInfo 아래에 이미 쌓이고 있다. 그런데 타임라인과
    // 이어져 있지 않아, 번역을 다 해 놓고도 「번역이 끝나지 않았습니다」가 떴다.
    // 한 일이 반영되지 않는 것이 가장 나쁜 종류의 빈칸이다.
    const partnerLang = String(matchSnap.get('partnerLang') ?? '') || (await partnerLanguage(db, agencyId, String(matchSnap.get('partnerId') ?? '')));
    const { translations, deliveries } = await readBackgroundEvidence(db, base);

    const extraDone: Array<{ itemId: string; templateCode: string }> = [];
    const rowOf = (code: string) => timeline.find((r) => r.templateCode === code);

    if (translationSatisfied(translations, partnerLang)) {
      const row = rowOf('BG_TRANSLATION');
      if (row && row.status !== 'done') {
        extraDone.push({ itemId: row.id, templateCode: 'BG_TRANSLATION' });
      }
    }
    if (deliverySatisfied(deliveries)) {
      const row = rowOf('BG_MUTUAL_DELIVERY');
      if (row && row.status !== 'done') {
        extraDone.push({ itemId: row.id, templateCode: 'BG_MUTUAL_DELIVERY' });
      }
    }

    if (extraDone.length > 0) {
      const batch = db.batch();
      for (const item of extraDone) {
        batch.update(db.doc(`${base}/timeline/${item.itemId}`), {
          status: 'done',
          completedAt: FieldValue.serverTimestamp(),
          completedBy: uid,
          notes:
            item.templateCode === 'BG_TRANSLATION'
              ? '모국어 번역본에 수령·이해 확인 서명이 완료되어 자동 확인'
              : '양방향 전달과 수령확인·설명 기록이 있어 자동 확인',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      // 방금 채운 것은 「남은 것」에서 뺀다.
      // ★ plan.complete 에는 넣지 않는다 — 아래 batch가 다시 쓰면서
      //   evidence 에 빈 docId 가 들어간다. 결과에만 합친다.
      for (const item of extraDone) {
        const i = plan.missing.indexOf(item.templateCode);
        if (i >= 0) plan.missing.splice(i, 1);
      }
    }

    if (plan.complete.length > 0) {
      const batch = db.batch();
      const now = Timestamp.now();
      for (const item of plan.complete) {
        batch.update(db.doc(`${base}/timeline/${item.itemId}`), {
          status: 'done',
          completedAt: FieldValue.serverTimestamp(),
          completedBy: uid,
          // ★ 어느 서류로 채웠는지 남긴다. 근거 없이 완료된 항목은 나중에 되짚을 수 없다.
          evidence: FieldValue.arrayUnion({ docId: item.docId, addedAt: now }),
          notes: '서류함에 올린 증빙으로 자동 확인',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      logger.info('법정의무 자동 확인', {
        agencyId,
        clientId,
        matchId,
        completed: plan.complete.map((c) => c.templateCode),
      });
    }

    return {
      completed: [...plan.complete, ...extraDone].map((c) => ({
        templateCode: c.templateCode,
        title: TITLE[c.templateCode] ?? c.templateCode,
      })),
      alreadyDone: plan.alreadyDone,
      missing: plan.missing.map((code) => ({
        templateCode: code,
        title: TITLE[code] ?? code,
        hint: DOC_HINT[code] ?? MANUAL_HINT[code] ?? '',
      })),
    };
  },
);
