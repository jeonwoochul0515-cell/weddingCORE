import { useState } from 'react';
import { Link } from 'react-router-dom';
import InputForm from '@/features/visaSimulator/InputForm';
import ResultView from '@/features/visaSimulator/ResultView';
import { runSimulation, type Inputs, type Result } from '@/features/visaSimulator/engine';
import { t, type UiLang } from '@/features/visaSimulator/i18n';
import BrandMark from '@/components/brand/BrandMark';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { breadcrumbSchema } from '@/lib/schema';
import AboutF6, { F6_FAQ } from '@/features/visaSimulator/AboutF6';

export default function VisaSimulatorPage() {
  usePageMeta({
    title: 'F-6 결혼이민 비자 준비도 점검',
    description: '2026년 공식 소득기준으로 F-6 결혼이민 비자의 필수요건 충족 여부와 서류 준비도를 신청 전에 점검합니다.',
    path: '/visa-simulator',
  });

  const [lang, setLang] = useState<UiLang>('ko');
  const [result, setResult] = useState<Result | null>(null);

  function handleSubmit(inputs: Inputs) {
    const res = runSimulation(inputs);
    setResult(res);
    // 결과로 스크롤
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  function handleReset() {
    setResult(null);
    window.scrollTo({ top: 0 });
  }

  // 아래 설명 영역의 질문·답과 1:1로 맞춘다. 화면에 없는 것을 스키마에 넣지 않는다.
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: F6_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    breadcrumbSchema([
      { name: 'weddingCORE', path: '/' },
      { name: 'F-6 결혼이민 비자 준비도 점검', path: '/visa-simulator' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      {lang === 'ko' && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      )}
      <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl print:hidden sm:px-8">
        <Link to="/"><BrandMark /></Link>
        <div className="flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as UiLang)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
          <Link to="/login" className="secondary-button !px-3.5 !py-2">
            업체 로그인
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><Sparkles size={14} />2026년 공식 소득기준 반영</div>
          <h1 className="text-4xl font-bold tracking-[-0.045em] text-[#102621] sm:text-5xl">
            {t('title', '', lang)}
          </h1>
          <p className="mt-4 text-base text-slate-600">
            {t('subtitle', '', lang)}
          </p>
        </div>

        {!result && <InputForm lang={lang} onSubmit={handleSubmit} />}
        {result && <ResultView result={result} lang={lang} onReset={handleReset} />}
      </section>

      {/* 요건 설명. 도구는 자바스크립트로 그려져 검색·AI가 읽을 내용이 없으므로 글로도 둔다.
          한국어로만 쓰여 있어 다른 언어를 고른 사람에게는 보여주지 않는다. */}
      {lang === 'ko' && <AboutF6 />}

      <footer className="mt-16 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500 print:hidden">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" />본 결과는 준비도 점검이며 법률자문이나 승인 예측이 아닙니다.</span>
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
