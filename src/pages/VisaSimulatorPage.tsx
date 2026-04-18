import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InputForm from '@/features/visaSimulator/InputForm';
import ResultView from '@/features/visaSimulator/ResultView';
import { runSimulation, type Inputs, type Result } from '@/features/visaSimulator/engine';
import { saveSimulationSession } from '@/features/visaSimulator/saveSession';
import { t, type UiLang } from '@/features/visaSimulator/i18n';

export default function VisaSimulatorPage() {
  const [lang, setLang] = useState<UiLang>('ko');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    document.title = `${t('title', '', lang)} - weddingCORE`;
  }, [lang]);

  function handleSubmit(inputs: Inputs) {
    const res = runSimulation(inputs);
    setResult(res);
    // 익명 저장 (비동기, 실패 무시)
    void saveSimulationSession(inputs, res);
    // 결과로 스크롤
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  function handleReset() {
    setResult(null);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          weddingCORE
        </Link>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as UiLang)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
          <Link to="/login" className="text-sm text-slate-700 hover:text-slate-900">
            업체 로그인
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {t('title', '', lang)}
          </h1>
          <p className="mt-2 text-base text-slate-600">
            {t('subtitle', '', lang)}
          </p>
        </div>

        {!result && <InputForm lang={lang} onSubmit={handleSubmit} />}
        {result && <ResultView result={result} lang={lang} onReset={handleReset} />}
      </section>

      <footer className="mt-16 border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-500 print:hidden">
        © weddingCORE · 국제결혼 법률 컴플라이언스 플랫폼
      </footer>

      {/* 인쇄 최적화 */}
      <style>{`
        @media print {
          body { background: white; }
          header, footer { display: none !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
