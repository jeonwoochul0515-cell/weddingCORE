// 국제결혼 요건 빠른 점검 공개 화면 (/check) — 7문항으로 "나도 되나"를 익명으로 먼저 확인한다
//
// 손님은 이름을 밝히기 전에 자격부터 확인하고 싶어 한다(우리결혼중개 손님 리서치, 2026-09-04).
// ?agency=<업체ID>&name=<업체명>이 붙으면 그 업체의 접수 칸이 열린다. 회원 업체는 같은 화면을
// /embed/check로 홈페이지에 심는다.

import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Timer } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import QuickCheck from '@/features/quickCheck/QuickCheck';
import { QUESTIONS } from '@/features/quickCheck/questions';
import { COUNTRY_SPONSOR_RULES, CURRENT_RULE_YEAR, INCOME_THRESHOLDS, RULE_SOURCE_URL } from '@/features/visaSimulator/rules';
import { usePageMeta } from '@/lib/usePageMeta';
import { breadcrumbSchema, webPageSchema } from '@/lib/schema';
import BusinessInfo from '@/components/layout/BusinessInfo';

const AGENCY_ID_RE = /^ag_[A-Za-z0-9_-]{6,40}$/;
const KH = COUNTRY_SPONSOR_RULES.KH!;
const TWO_PERSON = INCOME_THRESHOLDS[CURRENT_RULE_YEAR][2]!;

/**
 * 아래 화면의 질문(h2)과 답을 그대로 옮긴 것. FAQPage 스키마가 이 배열을 쓴다.
 * 화면 문구를 고치면 여기도 같이 고친다 — 어긋나면 스팸으로 처리된다.
 */
const CHECK_FAQ = [
  {
    q: '이 점검은 무엇을 보나',
    a: '국제결혼을 진행할 때 처음에 걸리는 조건 일곱 가지만 봅니다. 혼인 상태, 나이대, 증빙 가능한 연소득, 결혼 후 주거, 범죄경력, 이전 초청 이력, 진행을 생각하는 나라입니다. 답은 저장되지 않고, 결과는 걸리는 점이 있는지까지만 알려 줍니다.',
  },
  {
    q: '왜 소득과 나라를 함께 묻나',
    a: `결혼이민(F-6) 비자는 ${CURRENT_RULE_YEAR}년 기준 2인 가구 연 ${TWO_PERSON.toLocaleString()}원 이상의 소득이 필요합니다. 여기에 더해 캄보디아는 외국인 배우자가 월 소득 ${KH.minMonthlyIncomeUsd.toLocaleString()}달러 이상이어야 현지 혼인등록이 되므로, 나라에 따라 같은 조건이 다르게 판정됩니다. 캄보디아의 만 50세 나이 제한은 2021년에 폐지됐습니다.`,
  },
  {
    q: '이 점검을 통과하면 진행이 되나',
    a: '아닙니다. 답하신 범위에서 걸리는 점이 보이지 않는다는 뜻이고, 실제 판단은 업체가 서류를 보고 하며 비자는 공관과 법무부가 심사합니다. 소득 기준 금액, 재산 환산, 교제 증빙까지 보려면 23문항 정밀 점검을 쓰면 됩니다.',
  },
];

export default function QuickCheckPage() {
  usePageMeta({
    title: '나도 국제결혼을 진행할 수 있나 · 2분 7문항',
    description: '혼인 상태·나이·소득·주거·범죄경력·초청 이력·진행 나라 7문항으로 국제결혼(F-6 결혼이민) 진행에 걸리는 점이 있는지 이름 없이 먼저 확인합니다.',
    path: '/check',
  });
  const [params] = useSearchParams();
  const rawAgency = params.get('agency') ?? '';
  const agencyId = AGENCY_ID_RE.test(rawAgency) ? rawAgency : undefined;
  const agencyName = (params.get('name') ?? '').slice(0, 40) || undefined;

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: CHECK_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    breadcrumbSchema([
      { name: 'weddingCORE', path: '/' },
      { name: '국제결혼 요건 빠른 점검', path: '/check' },
    ]),
    webPageSchema({
      name: '국제결혼 요건 빠른 점검',
      description: '7문항으로 국제결혼 진행 요건에 걸리는 점이 있는지 이름 없이 먼저 확인하는 화면.',
      path: '/check',
    }),
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl sm:px-8">
        <Link to="/"><BrandMark /></Link>
        <Link to="/login" className="secondary-button !px-3.5 !py-2">업체 로그인</Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><Timer size={14} />2분 · 7문항 · 이름 없이</div>
          <h1 className="text-4xl font-bold tracking-[-0.045em] text-[#102621] sm:text-5xl">나도 국제결혼을 진행할 수 있나</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            상담 전에 실제로 진행할 수 있는 조건인지 먼저 확인해 보세요. 답은 이 화면에만 있고 저장되지 않습니다.
            {agencyName && <> 결과는 원하실 때만 {agencyName}에 전달됩니다.</>}
          </p>
        </div>

        <QuickCheck agencyId={agencyId} agencyName={agencyName} />
      </main>

      {/* 도구는 자바스크립트로 그려져 검색·AI가 읽을 글이 적다. 무엇을 보는지 글로도 둔다. */}
      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">{CHECK_FAQ[0]!.q}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{CHECK_FAQ[0]!.a}</p>
          <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {QUESTIONS.map((q, i) => (
              <li key={q.key} className="rounded-xl bg-slate-50 px-4 py-3">
                <strong className="font-semibold text-slate-900">{i + 1}. {q.title.replace(/\?$/, '')}</strong>
                <span className="mt-0.5 block text-slate-600">{q.why}</span>
              </li>
            ))}
          </ol>

          <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">{CHECK_FAQ[1]!.q}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{CHECK_FAQ[1]!.a}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            출처.{' '}
            <a href={RULE_SOURCE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              외교부 재외공관 {CURRENT_RULE_YEAR} 결혼이민비자 소득요건 안내
            </a>
            ,{' '}
            <a href={KH.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">{KH.source}</a>
            . 여성가족부 「2023년 결혼중개업 실태조사」에서 한국인 이용자의 50세 이상 비중은 30.8%였습니다. 기준은 해마다 바뀌므로 신청 전에 다시 확인해야 합니다.
          </p>

          <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">{CHECK_FAQ[2]!.q}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{CHECK_FAQ[2]!.a}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/visa-simulator" className="secondary-button !px-4 !py-2.5 text-sm">F-6 결혼이민 비자 준비도 점검 (23문항)</Link>
          </div>

          <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">중개업체가 이 점검을 홈페이지에 두려면</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            weddingCORE 회원 업체는 이 점검을 자기 홈페이지에 그대로 심을 수 있습니다. 손님이 결과를 보고 남긴 연락처는 업체 전화로 문자가 갑니다.
            삽입 코드는 로그인 뒤{' '}
            <Link to="/agency/marketing" className="font-semibold text-emerald-700 underline underline-offset-2">마케팅 센터</Link>에 있습니다.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" />본 결과는 준비도 점검이며 법률자문이나 심사 결과 예측이 아닙니다.</span>
      
        <p className="mt-2 text-[11px] leading-5 text-slate-400">weddingCORE는 국제결혼중개업체의 고객·서류·법정기한을 한곳에서 관리하는 업무 시스템입니다.</p>
        <BusinessInfo className="mt-2" />
      </footer>
    </div>
  );
}
