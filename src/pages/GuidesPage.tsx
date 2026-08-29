// 결혼중개업법 해석 모음 — 목록 화면
//
// 업체가 검색으로 들어오는 입구다. 행정심판 재결례와 법제처 법령해석을 실무 질문 형태로 보여준다.
// 질문형 제목과 두괄식 답변은 검색·답변엔진이 그대로 인용하기 쉬운 형태이기도 하다.

import { Link } from 'react-router-dom';
import { ArrowRight, ScrollText, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { GUIDES, COURT_COUNT, RULING_COUNT, INTERPRETATION_COUNT } from '@/content/guides';

export default function GuidesPage() {
  usePageMeta({
    title: '결혼중개업법 해석과 처분 사례 — 영업정지·등록취소 기준',
    description:
      '신상정보를 늦게 제공한 업체는 어떤 처분을 받았는지, 영업정지가 취소된 사례는 어떤 경우인지, 자본금은 사무소마다 필요한지. 행정심판 재결례와 법제처 법령해석을 실무 질문으로 정리했습니다.',
    path: '/guides',
  });

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl sm:px-8">
        <Link to="/"><BrandMark /></Link>
        <Link to="/login" className="secondary-button !px-3.5 !py-2">업체 로그인</Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <ScrollText size={14} />판례 {COURT_COUNT}편 · 재결례 {RULING_COUNT}편 · 법령해석 {INTERPRETATION_COUNT}건
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#102621] sm:text-4xl">
            결혼중개업법, 실제로는 이렇게 해석됩니다
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            신상정보를 늦게 준 업체는 어떻게 됐는지, 영업정지가 뒤집힌 경우는 어떤 때였는지,
            사무소를 두 곳 두면 자본금도 두 배여야 하는지. 중개업체가 실제로 부딪히는 질문에
            법제처와 행정심판이 어떻게 답했는지 모았습니다. 조문만 읽어서는 알 수 없고,
            틀리면 등록과 영업이 걸리는 것들입니다.
          </p>
        </div>

        <div className="space-y-3">
          {GUIDES.map((item) => (
            <Link
              key={item.slug}
              to={`/guides/${item.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md sm:p-6"
            >
              <h2 className="mb-2 flex items-start justify-between gap-3 text-lg font-bold text-[#102621]">
                {item.title}
                <ArrowRight size={18} className="mt-1 shrink-0 text-slate-300" />
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-slate-600">{item.summary}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span
                  className={`rounded-md px-1.5 py-0.5 font-bold ${
                    item.kind === 'court'
                      ? 'bg-rose-100 text-rose-700'
                      : item.kind === 'ruling'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {item.kind === 'court' ? '법원 판례' : item.kind === 'ruling' ? '다툰 사례' : '법령해석'}
                </span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold">
                  {item.agency}
                </span>
                <span>{item.answeredOn}</span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          법령해석은 질의한 사안을 전제로 한 답변이고, 재결례는 그 사건의 사실관계에 대한 판단입니다.
          사실관계가 다르면 결론도 달라질 수 있고, 이후 법이 개정된 부분이 있을 수 있으니
          날짜를 함께 확인해 주세요. 개별 사건의 판단은 변호사 검토를 거쳐야 합니다.
        </p>
      </section>

      <footer className="mt-10 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          출처. 법제처 국가법령정보센터 법령해석례·행정심판 재결례
        </span>
      </footer>
    </div>
  );
}
