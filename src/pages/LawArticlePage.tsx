// 조문 하나를 원문과 함께 풀어 쓴 화면
//
// 원문을 먼저 보여주고 그 아래에 해설을 둔다. 순서를 바꾸지 않는 이유는,
// 해설이 원문을 대신한다는 인상을 주면 안 되기 때문이다. 해설은 읽기를 돕는 것이지
// 조문을 바꾸지 않는다.

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { findLawArticle, LAW_ARTICLE_DETAILS } from '@/content/lawArticles';
import { findGuide } from '@/content/guides';
import { LAW_ENFORCED_ON, LAW_NAME, LAW_SOURCE_URL } from '@/content/lawMap';
import { breadcrumbSchema, articleSchema } from '@/lib/schema';
import NotFoundPage from './NotFoundPage';

export default function LawArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const a = findLawArticle(slug ?? '');

  usePageMeta({
    title: a ? `${a.label} ${a.title} — 결혼중개업법` : '결혼중개업법 조문',
    description: a?.plain ?? '결혼중개업법 조문을 원문과 함께 풀어 썼습니다.',
    path: `/law/${slug ?? ''}`,
  });

  if (!a) return <NotFoundPage />;

  const others = LAW_ARTICLE_DETAILS.filter((x) => x.slug !== a.slug).slice(0, 3);

  // 이동경로와 글 정보. 조문 원문·해설이 화면에 그대로 있는 내용만 담는다.
  const schemas = [
    breadcrumbSchema([
      { name: 'weddingCORE', path: '/' },
      { name: '결혼중개업법 조문 지도', path: '/law' },
      { name: `${a.label} ${a.title}`, path: `/law/${a.slug}` },
    ]),
    articleSchema({
      headline: `${a.label} ${a.title}`,
      description: a.plain,
      path: `/law/${a.slug}`,
    }),
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl sm:px-8">
        <Link to="/"><BrandMark /></Link>
        <Link to="/login" className="secondary-button !px-3.5 !py-2">업체 로그인</Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          to="/law"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={15} />조문 지도
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-700">
            {a.label}
          </span>
          <span className="text-xs text-slate-500">
            {LAW_NAME} · {LAW_ENFORCED_ON} 시행
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#102621] sm:text-4xl">
          {a.title}
        </h1>

        {/* 원문을 먼저 */}
        <section className="mt-7 rounded-2xl border border-slate-300 bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-xs font-bold text-slate-500">조문 원문</h2>
          {a.lead && (
            <p className="mb-3 text-[15px] leading-relaxed text-slate-800">{a.lead}</p>
          )}
          <div className="space-y-3">
            {a.paragraphs.map((p) => (
              <div key={p.text || p.items[0]}>
                {p.text && (
                  <p className="text-[15px] leading-relaxed text-slate-800">{p.text}</p>
                )}
                {p.items.length > 0 && (
                  <ul className="mt-1.5 space-y-1.5 pl-3">
                    {p.items.map((i) => (
                      <li key={i} className="text-[14px] leading-relaxed text-slate-700">
                        {i}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
          <h2 className="mb-2 text-sm font-bold text-emerald-800">쉽게 말하면</h2>
          <p className="text-[15px] font-semibold leading-relaxed text-[#102621]">{a.plain}</p>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-[#102621]">현장에서 챙길 것</h2>
          <ul className="space-y-3">
            {a.practice.map((t) => (
              <li key={t} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {a.consequence && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <h2 className="mb-2 text-sm font-bold text-amber-900">어기면</h2>
            <p className="text-[15px] leading-relaxed text-amber-900">{a.consequence}</p>
          </section>
        )}

        {(a.feature || a.guides) && (
          <section className="mt-6 flex flex-wrap items-center gap-2">
            {a.feature && (
              <Link
                to={a.feature.to}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {a.feature.label}
              </Link>
            )}
            {/* 전에는 전부 "관련 사례 보기"라고만 적혀 있어서, 여러 개가 붙으면
                무엇이 있는지 알 수 없었다. 실제 제목을 보여준다. */}
            {a.guides?.map((g) => {
              const guide = findGuide(g);
              return (
                <Link
                  key={g}
                  to={`/guides/${g}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
                >
                  {guide ? guide.title : '관련 사례 보기'}
                </Link>
              );
            })}
          </section>
        )}

        <p className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          원문은 법제처 국가법령정보센터에서 받은 것이며 해설은 읽기를 돕기 위한 것입니다.
          해설이 조문을 대신하지 않습니다. 개정 여부는 법제처에서 확인해 주시고, 개별 사안의
          판단은 변호사 검토를 거쳐야 합니다.
        </p>

        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-bold text-slate-500">다른 조문</h2>
            <div className="space-y-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to={`/law/${o.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-300"
                >
                  <span className="text-xs font-bold text-slate-500">{o.label}</span>{' '}
                  <span className="text-sm font-semibold text-[#102621]">{o.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <footer className="mt-10 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          출처. 법제처 국가법령정보센터
          <a
            href={LAW_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 hover:underline"
          >
            원문 보기 <ExternalLink size={11} />
          </a>
        </span>
      </footer>
    </div>
  );
}
