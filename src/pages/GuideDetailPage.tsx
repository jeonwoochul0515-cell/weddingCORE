// 결혼중개업법 해석 하나를 풀어 쓴 화면
//
// 질문 → 두괄식 답 → 근거 → 실무 포인트 순서다. 검색·답변엔진이 답을 그대로 뽑아
// 가기 쉬운 구조이자, 사람이 급할 때 첫 줄만 읽고도 판단할 수 있는 구조다.
// FAQPage 구조화 데이터를 화면 문구와 1:1로 맞춰 넣는다.

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { findGuide, sourceUrl, GUIDES } from '@/content/guides';
import NotFoundPage from './NotFoundPage';

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const item = findGuide(slug ?? '');

  usePageMeta({
    title: item ? `${item.title} — 결혼중개업법` : '결혼중개업법 해석',
    description: item?.summary ?? '결혼중개업법 법령해석을 실무 질문으로 정리했습니다.',
    path: `/guides/${slug ?? ''}`,
  });

  if (!item) return <NotFoundPage />;

  const others = GUIDES.filter((i) => i.slug !== item.slug).slice(0, 3);

  // 화면에 보이는 질문·답과 같은 내용만 담는다. 화면에 없는 것을 스키마에 넣지 않는다.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl sm:px-8">
        <Link to="/"><BrandMark /></Link>
        <Link to="/login" className="secondary-button !px-3.5 !py-2">업체 로그인</Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          to="/guides"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={15} />결혼중개업법 해석 모음
        </Link>

        <h1 className="text-3xl font-bold leading-tight tracking-[-0.04em] text-[#102621] sm:text-4xl">
          {item.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">{item.agency}</span>
          <span>{item.answeredOn}</span>
          <span className="text-slate-300">·</span>
          <span>{item.kind === 'ruling' ? '행정심판 재결례' : '법제처 법령해석'}</span>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-2 text-sm font-bold text-slate-500">이런 상황입니다</h2>
          <p className="text-[15px] leading-relaxed text-slate-700">{item.question}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
          <h2 className="mb-2 text-sm font-bold text-emerald-800">
            {item.kind === 'ruling' ? '이렇게 판단됐습니다' : '법제처는 이렇게 답했습니다'}
          </h2>
          <p className="text-lg font-semibold leading-relaxed text-[#102621]">{item.answer}</p>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-[#102621]">왜 그렇게 보았나</h2>
          <ul className="space-y-3">
            {item.reasoning.map((r) => (
              <li key={r} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-[#102621]">현장에서 무엇이 달라지나</h2>
          <ul className="space-y-3">
            {item.practice.map((p) => (
              <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                {p}
              </li>
            ))}
          </ul>
        </section>

        {item.cases && item.cases.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-[#102621]">근거가 된 사건</h2>
            <div className="space-y-2.5">
              {item.cases.map((c) => (
                <div key={c.name + c.decidedOn} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {/* 인용은 업체가 이긴 것, 기각은 처분이 유지된 것이다. 한눈에 갈리게 색을 나눈다. */}
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-bold ${
                        c.result === '인용'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.result === '각하'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {c.result === '인용' ? '인용 · 처분 취소' : c.result === '각하' ? '각하' : '기각 · 처분 유지'}
                    </span>
                    <span className="text-slate-500">{c.decidedOn}</span>
                  </div>
                  <p className="mb-1 text-sm font-semibold text-[#102621]">{c.name}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{c.gist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 rounded-2xl bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold text-slate-500">관련 조문</h2>
          <ul className="space-y-1.5">
            {item.articles.map((a) => (
              <li key={a} className="text-sm text-slate-700">{a}</li>
            ))}
          </ul>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="mb-2 text-xs text-slate-500">
              {item.kind === 'ruling' ? '자료 출처. ' : '원문 안건명. '}
              {item.sourceTitle}
            </p>
            {item.kind === 'ruling' ? (
              <a
                href="https://www.law.go.kr"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                국가법령정보센터에서 재결례 검색 <ExternalLink size={12} />
              </a>
            ) : (
              <a
                href={sourceUrl(item.sourceId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                법제처에서 원문 확인 <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>

        <p className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          {item.kind === 'ruling'
            ? '이 글은 행정심판 재결례를 쟁점별로 묶어 옮긴 것입니다. 그 사건의 사실관계에 대한 판단이므로 사실관계가 다르면 결론도 달라질 수 있고, 이후 법이 개정된 부분이 있을 수 있습니다.'
            : '이 글은 법제처 법령해석을 쉽게 옮긴 것입니다. 해석은 질의한 사안을 전제로 하므로 사실관계가 다르면 결론도 달라질 수 있고, 회신 이후 법이 개정된 부분이 있을 수 있습니다.'}{' '}
          개별 사건의 판단은 변호사 검토를 거쳐야 합니다.
        </p>

        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-bold text-slate-500">함께 보면 좋은 해석</h2>
            <div className="space-y-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to={`/guides/${o.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-[#102621] transition hover:border-emerald-300"
                >
                  {o.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <footer className="mt-10 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          {item.kind === 'ruling'
            ? '출처. 국가법령정보센터 행정심판 재결례'
            : `출처. 법제처 국가법령정보센터 법령해석례 (일련번호 ${item.sourceId})`}
        </span>
      </footer>
    </div>
  );
}
