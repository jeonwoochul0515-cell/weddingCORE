import { AlertTriangle, CheckCircle2, Info, Printer, Scale, XCircle } from 'lucide-react';
import type { Recommendation, Result } from './engine';
import { t, type UiLang } from './i18n';

const SEVERITY_STYLE: Record<Recommendation['severity'], { icon: typeof Info; cls: string }> = {
  blocker:  { icon: XCircle,       cls: 'text-red-700 bg-red-50 border-red-200' },
  critical: { icon: AlertTriangle, cls: 'text-red-700 bg-red-50 border-red-200' },
  warning:  { icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  info:     { icon: Info,          cls: 'text-slate-700 bg-slate-50 border-slate-200' },
};

export default function ResultView({
  result,
  lang,
  onReset,
}: {
  result: Result;
  lang: UiLang;
  onReset: () => void;
}) {
  const probColor =
    result.overallProbability >= 70 ? 'text-emerald-600'
    : result.overallProbability >= 40 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className="space-y-6 print:space-y-4">
      {/* 최종 결과 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {t('result', 'visaType', lang)}
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {result.visaType === 'INELIGIBLE' ? '신청 불가' : result.visaType}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">
              {t('result', 'probability', lang)}
            </div>
            <div className={`text-5xl font-bold ${probColor}`}>
              {result.overallProbability}%
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-700">{result.summary}</p>
      </div>

      {/* 점수 바 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ScoreBar label={t('result', 'incomeScore', lang)} score={result.scores.income} />
        <ScoreBar label={t('result', 'sincerityScore', lang)} score={result.scores.sincerity} />
        <ScoreBar label={t('result', 'housingScore', lang)} score={result.scores.housing} />
        <ScoreBar label="기타 요건" score={result.scores.other} />
      </div>

      {/* 하드 블로커 */}
      {result.hardBlockers.length > 0 && (
        <Section title={t('result', 'blockers', lang)} icon={XCircle}>
          {result.hardBlockers.map((r, i) => (
            <RecCard key={i} rec={r} lang={lang} />
          ))}
        </Section>
      )}

      {/* 소득 상세 */}
      <Section title={t('result', 'incomeDetail', lang)} icon={Scale}>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <dl className="grid grid-cols-2 gap-y-2">
            <dt className="text-slate-500">가구원수 기준 최소소득</dt>
            <dd>{result.incomeDetail.threshold.toLocaleString()}원</dd>
            <dt className="text-slate-500">유효 소득 (환산 합계)</dt>
            <dd className={result.incomeDetail.meetsMinimum ? 'text-emerald-700' : 'text-red-600'}>
              {result.incomeDetail.effectiveIncome.toLocaleString()}원
              {result.incomeDetail.meetsMinimum ? ' ✓' : ' ✗'}
            </dd>
            <dt className="text-slate-500">재산 환산 (연 5%)</dt>
            <dd>{result.incomeDetail.propertyConverted.toLocaleString()}원</dd>
            <dt className="text-slate-500">가족 소득 합산</dt>
            <dd>{result.incomeDetail.familyIncluded.toLocaleString()}원</dd>
          </dl>
        </div>
      </Section>

      {/* 보완 사항 */}
      {result.recommendations.length > 0 && (
        <Section title={t('result', 'recommend', lang)} icon={AlertTriangle}>
          {result.recommendations.map((r, i) => (
            <RecCard key={i} rec={r} lang={lang} />
          ))}
        </Section>
      )}

      {/* 면책 */}
      <div className="rounded-md bg-slate-50 p-4 text-xs text-slate-600">
        ⚠ {t('disclaimer', 'ko', lang)}
      </div>

      {/* 액션 */}
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          <Printer size={14} />{t('button', 'print', lang)}
        </button>
        <button
          onClick={onReset}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          {t('button', 'reset', lang)}
        </button>
        <a
          href="/login"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t('button', 'consult', lang)}
        </a>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-2xl font-semibold text-slate-900">{score}</span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Icon size={16} />{title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RecCard({ rec, lang }: { rec: Recommendation; lang: UiLang }) {
  const { icon: Icon, cls } = SEVERITY_STYLE[rec.severity];
  return (
    <div className={`flex gap-3 rounded-md border p-3 ${cls}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium">{rec.title}</div>
          <span className="text-[10px] rounded px-1.5 py-0.5 bg-white/60">
            {t('severity', rec.severity, lang)}
          </span>
        </div>
        <div className="mt-1 text-xs opacity-90">{rec.detail}</div>
        {rec.legalBasis && (
          <div className="mt-1 text-[11px] opacity-70">📖 {rec.legalBasis}</div>
        )}
      </div>
    </div>
  );
}
