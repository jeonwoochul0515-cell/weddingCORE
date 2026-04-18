import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw, Globe } from 'lucide-react';
import { QUESTIONS, calculateMbti, type MbtiResult } from '@/features/matching/mbtiTest/questions';
import { MBTI_DESCRIPTIONS } from '@/features/matching/mbtiTest/descriptions';
import { mt, type MbtiLang } from '@/features/matching/mbtiTest/i18n';

const LANGS: { code: MbtiLang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', label: '中文' },
];

export default function MbtiTestPage() {
  const [lang, setLang] = useState<MbtiLang>('ko');
  const [answers, setAnswers] = useState<Record<number, 'a' | 'b'>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<MbtiResult | null>(null);

  const q = QUESTIONS[current]!;
  const progress = Object.keys(answers).length;

  function answer(choice: 'a' | 'b') {
    const next = { ...answers, [q.id]: choice };
    setAnswers(next);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
    } else if (Object.keys(next).length === QUESTIONS.length) {
      setResult(calculateMbti(next));
    }
  }

  function goBack() {
    if (current > 0) setCurrent(current - 1);
  }

  function reset() {
    setAnswers({});
    setCurrent(0);
    setResult(null);
  }

  // 결과 화면
  if (result) {
    const desc = MBTI_DESCRIPTIONS[result.type];
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <LangSelector lang={lang} onChange={setLang} />

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">{mt('result_title', lang)}</p>
          <h1 className="mt-2 text-5xl font-black tracking-wide text-slate-900">{result.type}</h1>
          {desc && (
            <>
              <p className="mt-2 text-lg font-semibold text-slate-700">{desc.title[lang]}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{desc.desc[lang]}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {desc.keywords[lang].split(', ').map((kw) => (
                  <span key={kw} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {kw}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* 축별 점수 바 */}
          <div className="mt-6 space-y-2">
            <ScoreBar left="E" right="I" leftVal={result.scores.E} rightVal={result.scores.I} />
            <ScoreBar left="S" right="N" leftVal={result.scores.S} rightVal={result.scores.N} />
            <ScoreBar left="T" right="F" leftVal={result.scores.T} rightVal={result.scores.F} />
            <ScoreBar left="J" right="P" leftVal={result.scores.J} rightVal={result.scores.P} />
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button onClick={reset} className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white hover:bg-slate-800">
              <RotateCcw size={14} />{mt('btn_retry', lang)}
            </button>
          </div>

          <p className="mt-4 text-[10px] text-slate-400">{mt('disclaimer', lang)}</p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/visa-simulator" className="text-xs text-slate-500 hover:text-slate-700">← weddingCORE</Link>
        </div>
      </div>
    );
  }

  // 질문 화면
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <LangSelector lang={lang} onChange={setLang} />

      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">{mt('title', lang)}</h1>
        <p className="mt-1 text-sm text-slate-500">{mt('subtitle', lang)}</p>
      </div>

      {/* 진행 바 */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{current + 1} {mt('q_of', lang)}</span>
          <span>{Math.round((progress / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${(progress / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 질문 카드 */}
      <div className="mt-6 space-y-3">
        <button
          onClick={() => answer('a')}
          className={`w-full rounded-xl border p-4 text-left text-sm transition-all hover:border-slate-400 hover:bg-slate-50 ${
            answers[q.id] === 'a' ? 'border-slate-900 bg-slate-50 font-medium' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="mb-1 block text-xs font-semibold text-slate-400">A</span>
          {q.a[lang]}
        </button>

        <button
          onClick={() => answer('b')}
          className={`w-full rounded-xl border p-4 text-left text-sm transition-all hover:border-slate-400 hover:bg-slate-50 ${
            answers[q.id] === 'b' ? 'border-slate-900 bg-slate-50 font-medium' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="mb-1 block text-xs font-semibold text-slate-400">B</span>
          {q.b[lang]}
        </button>
      </div>

      {/* 네비게이션 */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={current === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          <ArrowLeft size={14} />
        </button>

        {answers[q.id] && current < QUESTIONS.length - 1 && (
          <button
            onClick={() => setCurrent(current + 1)}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-400">{mt('disclaimer', lang)}</p>
    </div>
  );
}

function LangSelector({ lang, onChange }: { lang: MbtiLang; onChange: (l: MbtiLang) => void }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Globe size={14} className="text-slate-400" />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          className={`rounded-md px-2 py-1 text-xs transition-colors ${
            lang === l.code
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function ScoreBar({ left, right, leftVal, rightVal }: { left: string; right: string; leftVal: number; rightVal: number }) {
  const total = leftVal + rightVal || 1;
  const pct = Math.round((leftVal / total) * 100);
  const winner = leftVal >= rightVal ? left : right;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-4 text-right font-bold ${leftVal >= rightVal ? 'text-slate-900' : 'text-slate-400'}`}>{left}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-slate-900 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-4 font-bold ${rightVal > leftVal ? 'text-slate-900' : 'text-slate-400'}`}>{right}</span>
      <span className="w-8 text-right text-slate-500">{Math.round((Math.max(leftVal, rightVal) / total) * 100)}%</span>
    </div>
  );
}
