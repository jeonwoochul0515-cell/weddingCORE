import { useState } from 'react';
import { AlertCircle, CheckCircle2, Languages, PenLine } from 'lucide-react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';
import {
  BG_INFO_FIELDS,
  LANG_LABEL,
  fieldLabel,
  type FieldKey,
  type SupportedLang,
} from './fields';
import {
  saveTranslation,
  signTranslation,
  type BackgroundInfoDoc,
  type TranslationDoc,
} from './useBackgroundInfo';

const functions = getFunctions(app, 'asia-northeast3');

type Props = {
  info: BackgroundInfoDoc;
  translations: TranslationDoc[];
  targetLang: SupportedLang;
  onTargetLangChange: (lang: SupportedLang) => void;
};

export default function ParallelView({
  info,
  translations,
  targetLang,
  onTargetLangChange,
}: Props) {
  const sourceLang = info.sourceLang;
  const targetTranslation = translations.find((t) => t.lang === targetLang) ?? null;
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  async function handleTranslate() {
    setTranslating(true);
    setTranslateError(null);
    try {
      const fn = httpsCallable<
        { agencyId: string; clientId: string; infoId: string; targetLang: SupportedLang },
        { ok: boolean; fields: Record<string, string> }
      >(functions, 'translateBackgroundInfo');
      const res = await fn({
        agencyId: info.agencyId,
        clientId: info.clientId,
        infoId: info.id,
        targetLang,
      });
      if (!res.data.ok) throw new Error('번역 실패');
    } catch (err) {
      setTranslateError((err as Error).message);
    } finally {
      setTranslating(false);
    }
  }

  // 번역에서 누락된 필드
  const missingFields: FieldKey[] = BG_INFO_FIELDS.filter((f) => {
    if (!info.fields[f.key]) return false; // 원본도 없으면 제외
    const translated = targetTranslation?.fields[f.key];
    return !translated || String(translated).trim() === '';
  }).map((f) => f.key);

  const parityPct = BG_INFO_FIELDS.length
    ? Math.round(((BG_INFO_FIELDS.length - missingFields.length) / BG_INFO_FIELDS.length) * 100)
    : 0;

  return (
    <div>
      {/* 헤더: 언어 선택 + 번역 버튼 + 공정성 지표 */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="font-medium text-slate-900">{LANG_LABEL[sourceLang]}</span>
              <span className="mx-2 text-slate-400">↔</span>
              <select
                value={targetLang}
                onChange={(e) => onTargetLangChange(e.target.value as SupportedLang)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm font-medium"
              >
                {(Object.keys(LANG_LABEL) as SupportedLang[])
                  .filter((l) => l !== sourceLang)
                  .map((l) => (
                    <option key={l} value={l}>{LANG_LABEL[l]}</option>
                  ))}
              </select>
            </div>
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Languages size={14} />
              {translating ? 'AI 번역 중…' : 'AI 번역 생성'}
            </button>
          </div>
          <ParityIndicator pct={parityPct} missing={missingFields.length} />
        </div>
        {translateError && <p className="mt-2 text-sm text-red-600">{translateError}</p>}
        {targetTranslation?.translatedBy === 'ai' && (
          <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
            ⚠ AI 번역은 초안입니다. 법률 용어 정확도를 반드시 검수 후 서명해 주세요.
          </p>
        )}
      </div>

      {/* 좌우 병렬 렌더 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LangColumn
          lang={sourceLang}
          title={LANG_LABEL[sourceLang]}
          values={info.fields}
          missing={[]}
          isSource
        />
        <LangColumn
          lang={targetLang}
          title={LANG_LABEL[targetLang]}
          values={targetTranslation?.fields ?? {}}
          missing={missingFields}
          isSource={false}
        />
      </div>

      {/* 서명 섹션 */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SignatureBox
          lang={sourceLang}
          info={info}
          translation={{
            lang: sourceLang,
            fields: info.fields as Record<string, string>,
            translatedBy: 'human',
            translationQuality: 'certified',
            signedAt: null,
            signedByName: null,
          }}
        />
        <SignatureBox
          lang={targetLang}
          info={info}
          translation={targetTranslation}
        />
      </div>
    </div>
  );
}

function ParityIndicator({ pct, missing }: { pct: number; missing: number }) {
  const color = pct === 100 ? 'text-emerald-600 bg-emerald-50' : missing > 0 ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-100';
  const Icon = pct === 100 ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${color}`}>
      <Icon size={14} />
      {pct === 100 ? '정보 완전 일치' : `누락 ${missing}항목`}
    </div>
  );
}

function LangColumn({
  lang,
  title,
  values,
  missing,
  isSource,
}: {
  lang: SupportedLang;
  title: string;
  values: Record<string, unknown>;
  missing: FieldKey[];
  isSource: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
        {title} {isSource && <span className="text-xs text-slate-500">(원본)</span>}
      </div>
      <div className="divide-y divide-slate-100">
        {BG_INFO_FIELDS.map((f) => {
          const value = values[f.key];
          const isMissing = missing.includes(f.key);
          return (
            <div key={f.key} className={`p-3 ${isMissing ? 'bg-red-50' : ''}`}>
              <div className="text-xs text-slate-500">{fieldLabel(f.key, lang)}</div>
              <div className={`mt-1 text-sm ${isMissing ? 'text-red-600' : 'text-slate-900'}`}>
                {isMissing
                  ? '— 번역 누락 (정보 비대칭) —'
                  : value
                  ? String(value)
                  : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignatureBox({
  lang,
  info,
  translation,
}: {
  lang: SupportedLang;
  info: BackgroundInfoDoc;
  translation: TranslationDoc | null;
}) {
  const [name, setName] = useState('');
  const [signing, setSigning] = useState(false);
  const signed = translation?.signedAt != null;

  async function handleSign() {
    if (!name.trim()) return;
    setSigning(true);
    try {
      if (lang === info.sourceLang) {
        // 원본은 별도 doc이 아니므로 원본 자체를 서명 완료로 기록
        await saveTranslation({
          agencyId: info.agencyId,
          clientId: info.clientId,
          infoId: info.id,
          lang: info.sourceLang,
          fields: info.fields as Record<string, string>,
          translatedBy: 'human',
        });
      }
      await signTranslation({
        agencyId: info.agencyId,
        clientId: info.clientId,
        infoId: info.id,
        lang,
        signerName: name.trim(),
      });
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
        <PenLine size={16} />
        {LANG_LABEL[lang]} 수령 및 이해 확인
      </div>
      {signed && translation?.signedAt ? (
        <div className="rounded-md bg-emerald-50 p-3 text-sm">
          <div className="font-medium text-emerald-900">✓ 서명 완료</div>
          <div className="text-xs text-emerald-700">
            {translation.signedByName} · {translation.signedAt.toDate().toLocaleString('ko-KR')}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="서명자 이름"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleSign}
            disabled={signing || !name.trim() || !translation}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {signing ? '서명 중…' : '이해했으며 서명합니다'}
          </button>
          {!translation && (
            <p className="text-xs text-slate-500">AI 번역을 먼저 생성해 주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
