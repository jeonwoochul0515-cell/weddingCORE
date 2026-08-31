// 결혼중개업법 조문 지도 — 이 법이 뭘 요구하는지 한 화면에서 훑는다
//
// 조문 원문을 옮기지 않는다. 법제처가 정본이고 개정도 그쪽이 빠르다. 여기서는
// "이 조항이 무엇을 요구하고, 어기면 어떻게 되고, 우리 시스템 어디서 관리하는가"를 잇는다.
//
// 자주 문제되는 조항은 따로 표시한다. 40개를 다 외울 필요는 없고 그 몇 개가 처분의 대부분이다.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Flame, ScrollText, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { breadcrumbSchema } from '@/lib/schema';
import { LAW_ARTICLE_DETAILS } from '@/content/lawArticles';
import {
  HOT_COUNT,
  LAW_ARTICLES,
  LAW_ENFORCED_ON,
  LAW_MINISTRY,
  LAW_NAME,
  LAW_SOURCE_URL,
} from '@/content/lawMap';

export default function LawMapPage() {
  const [onlyHot, setOnlyHot] = useState(false);
  const items = onlyHot ? LAW_ARTICLES.filter((a) => a.hot) : LAW_ARTICLES;

  usePageMeta({
    title: '결혼중개업법 조문 지도 — 무엇을 요구하고 어기면 어떻게 되나',
    description:
      '결혼중개업의 관리에 관한 법률 40개 조문을 실무 기준으로 정리했습니다. 신상정보 제공, 거짓·과장 광고, 미성년자 소개 금지, 자본금, 양벌규정 등 처분이 자주 나오는 조항을 표시했습니다.',
    path: '/law',
  });

  const crumbs = breadcrumbSchema([
    { name: 'weddingCORE', path: '/' },
    { name: '결혼중개업법 조문 지도', path: '/law' },
  ]);

  return (
    <div className="min-h-screen bg-[#f6f7f3]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl sm:px-8">
        <Link to="/"><BrandMark /></Link>
        <Link to="/login" className="secondary-button !px-3.5 !py-2">업체 로그인</Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            <ScrollText size={14} />{LAW_NAME} · {LAW_ENFORCED_ON} 시행
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#102621] sm:text-4xl">
            결혼중개업법, 조문마다 무엇을 요구하나
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            조문이 40개지만 처분은 몇 개 조항에 몰립니다. 신상정보를 제때 안 준 것, 거짓·과장
            광고, 미성년자 소개. 어느 조항이 무엇을 요구하고 어기면 어떻게 되는지 한 줄씩
            적고, 실제 사례와 우리 화면으로 이어 두었습니다.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyHot(false)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              !onlyHot ? 'bg-[#102621] text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            전체 {LAW_ARTICLES.length}개
          </button>
          <button
            type="button"
            onClick={() => setOnlyHot(true)}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              onlyHot ? 'bg-rose-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            <Flame size={12} />자주 문제되는 {HOT_COUNT}개
          </button>
        </div>

        <div className="space-y-2.5">
          {items.map((a) => (
            <article
              key={a.no}
              className={`rounded-2xl border bg-white p-4 sm:p-5 ${
                a.hot ? 'border-rose-200' : 'border-slate-200'
              }`}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700">
                  {a.no}
                </span>
                <h2 className="text-base font-bold text-[#102621]">{a.title}</h2>
                {a.hot && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                    <Flame size={10} />자주 문제됨
                  </span>
                )}
              </div>

              {a.gist && (
                <p className="mb-2 text-sm leading-relaxed text-slate-700">{a.gist}</p>
              )}

              {a.consequence && (
                <p className="mb-2 rounded-lg bg-amber-50/70 px-2.5 py-1.5 text-[13px] leading-relaxed text-amber-900">
                  {a.consequence}
                </p>
              )}

              {(() => {
                const detail = LAW_ARTICLE_DETAILS.find((d) => d.label === a.no);
                return detail ? (
                  <Link
                    to={`/law/${detail.slug}`}
                    className="mb-2 inline-block text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    원문과 해설 보기 →
                  </Link>
                ) : null;
              })()}

              {(a.feature || a.guides) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {a.feature && (
                    <Link
                      to={a.feature.to}
                      className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 hover:underline"
                    >
                      {a.feature.label}
                    </Link>
                  )}
                  {a.guides?.map((g) => (
                    <Link
                      key={g}
                      to={`/guides/${g}`}
                      className="rounded-md border border-slate-200 px-2 py-0.5 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                    >
                      사례 보기
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* 하위법령 — 실무 기준의 대부분이 여기 있다 */}
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold text-[#102621]">시행령·시행규칙</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            법은 뼈대만 정하고 구체적인 기준은 아래에 있습니다. 신상정보로 무엇을 받아야
            하는지, 어떤 광고 문구가 걸리는지, 처분이 어떻게 가중·감경되는지가 여기 적혀 있습니다.
          </p>
          <div className="space-y-2.5">
            {LAW_ARTICLE_DETAILS.filter((d) => d.label.startsWith('시행')).map((d) => (
              <Link
                key={d.slug}
                to={`/law/${d.slug}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 sm:p-5"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-bold text-indigo-700">
                    {d.label}
                  </span>
                  <h3 className="text-base font-bold text-[#102621]">{d.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{d.plain}</p>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          조문의 요지를 실무 기준으로 옮긴 것이며 원문이 아닙니다. 정확한 문언과 개정 여부는
          국가법령정보센터에서 확인해 주세요. 개별 사안의 판단은 변호사 검토를 거쳐야 합니다.
        </p>
      </section>

      <footer className="mt-10 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600" />
          출처. 법제처 국가법령정보센터 · {LAW_MINISTRY} 소관
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
