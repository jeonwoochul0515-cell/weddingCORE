// 배포된 사이트를 실제로 내려받아 SEO·AEO·GEO를 채점하는 스크립트
//
// 전역 가이드(NAVER_SEO_최적화_가이드 / SEO_GEO_AEO_최적화_가이드)의 체크리스트를
// 항목으로 옮겨 세 영역을 각각 100점으로 채점한다. 로컬 dist가 아니라 실제 URL을
// 검사하므로 "빌드는 됐지만 배포가 안 된" 상태를 점수로 잡아낸다.
//
// 사용법: node scripts/seoScore.mjs [https://호스트]

const ORIGIN = (process.argv[2] ?? 'https://weddingcore.net').replace(/\/$/, '');

// ★ 채점 대상은 sitemap.xml에서 읽는다. 목록을 코드에 박아 두면 페이지를 늘려도
//   목록을 안 고쳐 새 페이지가 한 번도 채점되지 않는다. 실제로 2026-08-31에
//   3개만 채점하면서 나머지 35개가 통째로 빠진 채 "100점"이 나왔다.
//   사이트맵은 어차피 관리해야 하는 파일이니 그것을 유일한 목록으로 삼는다.

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

async function get(path) {
  const url = path.startsWith('http') ? path : `${ORIGIN}${path}`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    // 404도 본문을 읽어야 noindex 여부를 볼 수 있다. 리다이렉트만 건너뛴다.
    const body = res.status >= 300 && res.status < 400 ? '' : await res.text();
    return { status: res.status, headers: res.headers, body, location: res.headers.get('location') };
  } catch (error) {
    return { status: 0, headers: new Headers(), body: '', error: error.message };
  }
}

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const meta = (html, attr, key) => {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const alt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, 'i');
  return (html.match(re) ?? html.match(alt))?.[1] ?? null;
};
const tag = (html, name) => html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1]?.trim() ?? null;
const canonical = (html) => html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null;
/**
 * 한 script 안에 스키마를 배열로 여러 개 넣는 것도 표준이다.
 * 펴서 담지 않으면 배열째 하나로 세어져 안에 든 FAQPage를 못 찾는다.
 */
const jsonLd = (html) =>
  [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((m) => {
      try {
        const parsed = JSON.parse(m[1]);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [null];
      }
    });

/** 한국어는 공백 기준 어절이 영어 단어보다 짧아 40~60단어를 60~110어절로 환산한다. */
const words = (text) => text.split(/\s+/).filter(Boolean).length;

function scoreBlock(title, checks) {
  const max = checks.reduce((s, c) => s + c.max, 0);
  const got = checks.reduce((s, c) => s + c.got, 0);
  const pct = Math.round((got / max) * 100);
  console.log(`\n${bold(title)}  ${pct}점 ${dim(`(${got}/${max})`)}`);
  for (const c of checks) {
    const mark = c.got === c.max ? '+' : c.got === 0 ? 'X' : '~';
    const note = c.note ? dim(` — ${c.note}`) : '';
    console.log(`  ${mark} [${String(c.got).padStart(2)}/${c.max}] ${c.label}${note}`);
  }
  return pct;
}

async function main() {
  console.log(bold(`SEO · AEO · GEO 채점 — ${ORIGIN}`));

  // 1) 사이트맵을 읽어 채점 대상을 정한다
  const sitemap = await get('/sitemap.xml');
  const sitemapUrls = [...sitemap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (sitemapUrls.length === 0) {
    console.error('사이트맵에서 URL을 하나도 읽지 못했습니다. 채점을 중단합니다.');
    process.exit(2);
  }
  const PAGES = sitemapUrls.map((u) => u.replace(ORIGIN, '') || '/');

  // 2) 각 페이지를 한 번씩만 받아 둔다
  const pages = {};
  for (const p of PAGES) pages[p] = await get(p);
  const home = pages['/'] ?? (await get('/'));

  const robots = await get('/robots.txt');
  const llms = await get('/llms.txt');
  const notFound = await get('/__definitely-missing-page__');
  const wwwRes = await get(`${ORIGIN.replace('https://', 'https://www.')}/`);

  console.log(dim(`대상 ${PAGES.length}개 페이지 (sitemap.xml 기준)`));

  // 3) 페이지별로 한 번만 뜯어 둔다
  const info = {};
  for (const p of PAGES) {
    const body = pages[p].body;
    const ld = jsonLd(body);
    const text = strip(body);
    info[p] = {
      status: pages[p].status,
      body,
      text,
      ld,
      faq: ld.find((d) => d?.['@type'] === 'FAQPage'),
      title: tag(body, 'title'),
      desc: meta(body, 'name', 'description'),
      canonical: canonical(body),
      h1: (body.match(/<h1[\s>]/gi) ?? []).length,
      heads: [...body.matchAll(/<(h1|h2|h3|dt)[^>]*>([\s\S]*?)<\/>/gi)].map((m) => strip(m[2])),
    };
  }
  const org = info['/']?.ld.find((d) => d?.['@type'] === 'Organization');

  /** 대상 페이지 중 몇 개가 통과했는지로 점수를 준다. 대상이 없으면 만점(해당 없음). */
  const ratio = (label, max, applicable, pass) => {
    const targets = PAGES.filter(applicable);
    if (targets.length === 0) return { label, max, got: max, note: '해당 페이지 없음' };
    const ok = targets.filter(pass);
    const fail = targets.filter((p) => !ok.includes(p));
    return {
      label,
      max,
      got: Math.round((ok.length / targets.length) * max),
      note: `${ok.length}/${targets.length}${fail.length ? ` · 미달 ${fail.slice(0, 3).join(', ')}${fail.length > 3 ? ` 외 ${fail.length - 3}` : ''}` : ''}`,
    };
  };
  const all = () => true;

  // ---------------- SEO ----------------
  const titles = PAGES.map((p) => info[p].title);
  const descs = PAGES.map((p) => info[p].desc);
  const uniq = (arr) => new Set(arr.filter(Boolean)).size;
  const isQuestionHead = (t) => /[?？]|나요|인가요|한가요|무엇|어떻게|얼마|있나요|되나요|있나$|하나$|가나$|나$/.test(t);

  const seo = scoreBlock('SEO', [
    { label: 'robots.txt 200 + Yeti 허용 + Sitemap 명시', max: 10,
      got: robots.status === 200 && /Yeti/i.test(robots.body) && /Sitemap:/i.test(robots.body) ? 10 : 0 },
    { label: 'sitemap.xml 200 + 모든 URL 200', max: 10,
      got: sitemap.status === 200 && PAGES.every((p) => info[p].status === 200) ? 10 : 0,
      note: `${PAGES.filter((p) => info[p].status === 200).length}/${PAGES.length}개 200` },
    ratio('페이지별 자기참조 canonical', 10, all, (p) => info[p].canonical === `${ORIGIN}${p === '/' ? '/' : p}`),
    { label: '페이지별 고유 title', max: 10,
      got: Math.round((uniq(titles) / PAGES.length) * 10), note: `고유 ${uniq(titles)}/${PAGES.length}` },
    { label: '페이지별 고유 description', max: 8,
      got: Math.round((uniq(descs) / PAGES.length) * 8), note: `고유 ${uniq(descs)}/${PAGES.length}` },
    ratio('h1 페이지당 정확히 1개', 8, all, (p) => info[p].h1 === 1),
    ratio('OG 4종 + 이미지 지정', 10, all,
      (p) => ['og:title', 'og:description', 'og:url', 'og:image'].every((k) => meta(info[p].body, 'property', k))),
    ratio('구조화 데이터 유효 JSON', 8, all, (p) => info[p].ld.length > 0 && info[p].ld.every(Boolean)),
    { label: '없는 주소가 noindex (소프트404 회피)', max: 6,
      got: notFound.status === 404 || /noindex/.test(notFound.body) ? 6 : 0, note: `HTTP ${notFound.status}` },
    { label: 'www → 대표주소 301', max: 6,
      got: wwwRes.status === 301 ? 6 : wwwRes.status === 302 || wwwRes.status === 307 ? 3 : 0,
      note: `HTTP ${wwwRes.status}` },
    ratio('모바일 viewport', 4, all, (p) => Boolean(meta(info[p].body, 'name', 'viewport'))),
    ratio('프리렌더된 본문 노출 (600자 이상)', 10, all, (p) => info[p].text.length >= 600),
  ]);

  // ---------------- AEO ----------------
  // 질문에 답하는 화면이 아닌 것은 "질문형 제목" 항목에서 뺀다.
  //   /law/*  조문 원문을 그대로 보여주는 참조 화면
  //   /guides, /law  목록 화면 — 하는 일이 안내지 답변이 아니다
  //   /privacy  법으로 형식이 정해진 고지 문서
  // 감점하면 억지 질문을 붙이게 되고, 그건 검색엔진이 싫어하는 바로 그 짓이다.
  const isReference = (p) => p.startsWith('/law/') || ['/guides', '/law', '/privacy'].includes(p);
  const hasFaq = (p) => Boolean(info[p].faq);
  const faqAnswers = (p) => (info[p].faq?.mainEntity ?? []).map((q) => q.acceptedAnswer?.text ?? '');

  const aeo = scoreBlock('AEO', [
    ratio('질문형 제목 또는 FAQ (조문 참조 화면 제외)', 20, (p) => !isReference(p),
      (p) => hasFaq(p) || info[p].heads.some(isQuestionHead)),
    // 화면 성격에 맞는 스키마를 하나는 달고 있어야 한다. 글이면 Article, 문답이면
    // FAQPage, 목록이면 CollectionPage, 그 밖이면 WebPage. 종류가 맞는지가 중요하지
    // FAQPage여야 하는 것이 아니다 — 아니면서 FAQ를 붙이면 그게 스팸이다.
    ratio('화면 성격에 맞는 스키마', 20, all,
      (p) => info[p].ld.some((d) => ['FAQPage', 'Article', 'CollectionPage', 'WebPage'].includes(d?.['@type']))),
    ratio('스키마 ↔ 화면 문구 1:1 일치', 20, hasFaq,
      (p) => info[p].faq.mainEntity.every(
        (q) => info[p].text.includes(q.name.slice(0, 20)) && info[p].text.includes(q.acceptedAnswer.text.slice(0, 25)))),
    ratio('FAQ 답변 길이 적정 (두괄식 40~60단어 상당)', 15, hasFaq,
      (p) => faqAnswers(p).every((a) => { const w = words(a); return w >= 25 && w <= 110; })),
    ratio('FAQ 답변 자기완결 (문맥 없이 읽힘)', 15, hasFaq,
      (p) => faqAnswers(p).every((a) => a.length > 40 && !/^(그|이|저)(것|건|는)/.test(a.trim()))),
    ratio('목록·표로 구조화', 10, all, (p) => /<(ul|ol|table|dl)[\s>]/i.test(info[p].body)),
  ]);

  // ---------------- GEO ----------------
  const aiBots = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot'];
  const allowed = aiBots.filter((b) => {
    const i = robots.body.indexOf(b);
    return i >= 0 && /Allow:\s*\//i.test(robots.body.slice(i, i + 120));
  });
  const oneLineDef = org?.description && org.description.length > 30;

  const geo = scoreBlock('GEO', [
    { label: 'AI 검색 크롤러 허용', max: 25, got: Math.round((allowed.length / aiBots.length) * 25),
      note: `${allowed.length}/${aiBots.length} (${allowed.join(', ') || '없음'})` },
    ratio('본문에 통계·수치 포함', 15, all,
      (p) => (info[p].text.match(/\d[\d,]*(만원|원|개|명|%|년|건|캐럿|조|호)/g) ?? []).length >= 3),
    ratio('주장에 근거·출처 명시', 15, all,
      (p) => /출처|근거|외교부|법무부|여성가족부|법제처|공정위|기준으로|안내|고시|제\d+조/.test(info[p].text)),
    { label: 'Organization 스키마 + 한 문장 정의', max: 15,
      got: (org ? 8 : 0) + (oneLineDef ? 7 : 0), note: org ? '있음' : '없음' },
    { label: 'llms.txt 제공', max: 10, got: llms.status === 200 ? 10 : 0, note: `HTTP ${llms.status}` },
    ratio('신선도 신호 (갱신일·연도)', 10, all,
      (p) => /dateModified|datePublished/.test(info[p].body) || /\d{4}[-.년]\s?\d{1,2}/.test(info[p].text)),
    ratio('인용 가능한 본문 분량 (1000자 이상)', 10, all, (p) => info[p].text.length >= 1000),
  ]);

  const avg = Math.round((seo + aeo + geo) / 3);
  console.log(`\n${bold('평균')} ${bold(String(avg) + '점')}  ${dim(`(SEO ${seo} · AEO ${aeo} · GEO ${geo})`)}`);
  console.log(avg >= 96 ? bold('목표 96점 달성') : dim(`목표까지 ${96 - avg}점`));
  process.exitCode = avg >= 96 ? 0 : 1;
}

main().catch((e) => { console.error('채점 실패:', e.message); process.exit(2); });
