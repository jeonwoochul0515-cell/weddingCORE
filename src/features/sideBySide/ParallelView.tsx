import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Languages, PenLine, Pencil, X } from 'lucide-react';
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
  signBackgroundTranslation,
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

  // B1: stale 감지
  const isStale = useMemo(() => {
    if (!targetTranslation?.translatedAt || !info.fieldsUpdatedAt) return false;
    return info.fieldsUpdatedAt.toMillis() > targetTranslation.translatedAt.toMillis();
  }, [info.fieldsUpdatedAt, targetTranslation?.translatedAt]);

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
              {translating ? 'AI 번역 중…' : isStale ? 'AI 번역 재생성' : 'AI 번역 생성'}
            </button>
          </div>
          <ParityIndicator pct={parityPct} missing={missingFields.length} />
        </div>
        {translateError && <p className="mt-2 text-sm text-red-600">{translateError}</p>}
        {targetTranslation?.translatedBy === 'ai' && !isStale && (
          <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
            ⚠ AI 번역은 초안입니다. 법률 용어 정확도를 반드시 검수 후 서명해 주세요.
          </p>
        )}
        {isStale && (
          <p className="mt-2 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">
            ⚠ 원본이 변경되었습니다. 번역을 다시 생성한 후 서명해 주세요.
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
          editable={false}
          translation={null}
          info={info}
        />
        <LangColumn
          lang={targetLang}
          title={LANG_LABEL[targetLang]}
          values={targetTranslation?.fields ?? {}}
          missing={missingFields}
          isSource={false}
          editable={!!targetTranslation && !targetTranslation.signedAt}
          translation={targetTranslation}
          info={info}
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
          missingCount={0}
          isStale={false}
        />
        <SignatureBox
          lang={targetLang}
          info={info}
          translation={targetTranslation}
          missingCount={missingFields.length}
          isStale={isStale}
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
  editable,
  translation,
  info,
}: {
  lang: SupportedLang;
  title: string;
  values: Record<string, unknown>;
  missing: FieldKey[];
  isSource: boolean;
  editable: boolean;
  translation: TranslationDoc | null;
  info: BackgroundInfoDoc;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  function startEdit() {
    const initial: Partial<Record<FieldKey, string>> = {};
    for (const f of BG_INFO_FIELDS) {
      initial[f.key] = String((values as Record<string, unknown>)[f.key] ?? '');
    }
    setDraft(initial);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const merged: Partial<Record<FieldKey, string>> = {
        ...(translation?.fields ?? {}),
        ...draft,
      };
      await saveTranslation({
        agencyId: info.agencyId,
        clientId: info.clientId,
        infoId: info.id,
        lang,
        fields: merged,
        translatedBy: 'human',
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const qualityBadge =
    !isSource && translation?.translationQuality === 'reviewed' ? (
      <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">
        인간 검수됨
      </span>
    ) : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
        <div className="flex items-center">
          {title} {isSource && <span className="text-xs text-slate-500">(원본)</span>}
          {qualityBadge}
        </div>
        {editable && !editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-50"
          >
            <Pencil size={12} />
            편집
          </button>
        )}
        {editing && (
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex items-center gap-0.5 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-50"
            >
              <X size={12} />
              취소
            </button>
          </div>
        )}
      </div>
      <div className="divide-y divide-slate-100">
        {BG_INFO_FIELDS.map((f) => {
          const value = values[f.key];
          const isMissing = missing.includes(f.key);
          return (
            <div key={f.key} className={`p-3 ${isMissing && !editing ? 'bg-red-50' : ''}`}>
              <div className="text-xs text-slate-500">{fieldLabel(f.key, lang)}</div>
              {editing ? (
                <textarea
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              ) : (
                <div className={`mt-1 text-sm ${isMissing ? 'text-red-600' : 'text-slate-900'}`}>
                  {isMissing
                    ? '— 번역 누락 (정보 비대칭) —'
                    : value
                    ? String(value)
                    : '—'}
                </div>
              )}
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
  missingCount,
  isStale,
}: {
  lang: SupportedLang;
  info: BackgroundInfoDoc;
  translation: TranslationDoc | null;
  missingCount: number;
  isStale: boolean;
}) {
  const [name, setName] = useState('');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signed = translation?.signedAt != null;

  const canSign = !!translation && missingCount === 0 && !isStale && !!name.trim();
  const reason = !translation
    ? 'AI 번역을 먼저 생성해 주세요.'
    : isStale
    ? '번역이 구버전입니다. 재생성 후 서명하세요.'
    : missingCount > 0
    ? `누락 필드 ${missingCount}개 해결 필요`
    : null;

  async function handleSign() {
    if (!canSign) return;
    setSigning(true);
    setError(null);
    try {
      await signBackgroundTranslation({
        agencyId: info.agencyId,
        clientId: info.clientId,
        infoId: info.id,
        lang,
        signerName: name.trim(),
      });
    } catch (err) {
      setError((err as Error).message ?? '서명 실패');
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
            disabled={signing || !canSign}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {signing ? '서명 중…' : '이해했으며 서명합니다'}
          </button>
          {reason && <p className="text-xs text-slate-500">{reason}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
