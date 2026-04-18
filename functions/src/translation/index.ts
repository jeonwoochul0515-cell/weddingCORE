/**
 * Claude API를 사용한 신상정보 구조화 필드 번역.
 *
 * 사전 준비:
 *   functions/.env 에 ANTHROPIC_API_KEY 설정
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import Anthropic from '@anthropic-ai/sdk';

const REGION = 'asia-northeast3';

const LANG_NAMES: Record<string, string> = {
  ko: 'Korean',
  vi: 'Vietnamese',
  km: 'Khmer (Cambodian)',
  zh: 'Simplified Chinese',
  uz: 'Uzbek',
  en: 'English',
};

const FIELD_META: Record<string, { ko: string; desc: string }> = {
  maritalHistory: { ko: '혼인경력', desc: '미혼/이혼/사별 및 횟수' },
  hasChildren: { ko: '자녀 정보', desc: '자녀 수, 나이, 양육' },
  health: { ko: '건강 상태', desc: '중대 질병·장애·정신질환' },
  criminalRecord: { ko: '범죄 경력', desc: '성범죄·가정폭력·아동학대 포함' },
  occupation: { ko: '직업', desc: '직장명, 직책, 근무기간' },
  income: { ko: '연소득', desc: '원 단위 연소득' },
  property: { ko: '재산 상태', desc: '부동산·예금·채무' },
  residence: { ko: '거주지', desc: '주거 형태, 동거 가족' },
  familySituation: { ko: '가족관계', desc: '부모·형제자매, 부양' },
};

export const translateBackgroundInfo = onCall(
  { region: REGION, timeoutSeconds: 120, memory: '512MiB', secrets: ['ANTHROPIC_API_KEY'] },
  async (request) => {
    const role = request.auth?.token?.role;
    if (!['owner', 'manager', 'staff', 'admin'].includes(role as string)) {
      throw new HttpsError('permission-denied', '권한 없음');
    }
    const callerAgencyId = request.auth?.token?.agencyId as string | undefined;

    const { agencyId, clientId, infoId, targetLang } = request.data as {
      agencyId?: string; clientId?: string; infoId?: string; targetLang?: string;
    };
    if (!agencyId || !clientId || !infoId || !targetLang) {
      throw new HttpsError('invalid-argument', '필수 파라미터 누락');
    }
    if (role !== 'admin' && callerAgencyId !== agencyId) {
      throw new HttpsError('permission-denied', '다른 업체의 자료 접근 불가');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'ANTHROPIC_API_KEY 미설정');

    const db = getFirestore();
    const infoSnap = await db
      .doc(`agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}`)
      .get();
    if (!infoSnap.exists) throw new HttpsError('not-found', '신상정보 없음');

    const info = infoSnap.data()!;
    const sourceLang = info.sourceLang as string;
    const fields = info.fields as Record<string, string | number>;

    if (sourceLang === targetLang) {
      throw new HttpsError('invalid-argument', '원본과 동일한 언어로 번역 불가');
    }

    const targetLangName = LANG_NAMES[targetLang] ?? targetLang;
    const sourceLangName = LANG_NAMES[sourceLang] ?? sourceLang;

    const fieldList = Object.entries(fields)
      .filter(([, v]) => v !== undefined && String(v).trim() !== '')
      .map(([k, v]) => `- ${k} (${FIELD_META[k]?.ko ?? k}: ${FIELD_META[k]?.desc ?? ''}): ${String(v)}`)
      .join('\n');

    const systemPrompt =
      `You are a certified legal translator specializing in Korean international marriage law ` +
      `(결혼중개업법). Translate the following personal information for cross-border marriage ` +
      `brokerage from ${sourceLangName} to ${targetLangName}. ` +
      `Preserve all factual details exactly. Use formal legal-register language. ` +
      `For legal terms, use standard established translations (e.g., 혼인무효=hôn nhân vô hiệu in Vietnamese). ` +
      `Return ONLY a valid JSON object with field keys as English identifiers and translated values.`;

    const userPrompt =
      `Translate the following fields to ${targetLangName}.\n\n` +
      `Fields:\n${fieldList}\n\n` +
      `Return a JSON object like: { "maritalHistory": "...", "health": "...", ... }\n` +
      `Only include fields that were provided. No explanation, only JSON.`;

    logger.info(`Translating ${Object.keys(fields).length} fields to ${targetLang}`);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new HttpsError('internal', 'AI 응답에 텍스트 없음');
    }

    let translated: Record<string, string>;
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON 미검출');
      translated = JSON.parse(jsonMatch[0]);
    } catch (err) {
      logger.error('AI 응답 파싱 실패', { text: textBlock.text, err });
      throw new HttpsError('internal', 'AI 응답 파싱 실패');
    }

    // Firestore에 저장
    await db
      .doc(`agencies/${agencyId}/clients/${clientId}/backgroundInfo/${infoId}/translations/${targetLang}`)
      .set({
        lang: targetLang,
        fields: translated,
        translatedBy: 'ai',
        translationQuality: 'draft',
        signedAt: null,
        signedByName: null,
        translatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

    return { ok: true, fields: translated };
  },
);
