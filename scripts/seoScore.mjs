// 배포된 사이트를 실제로 내려받아 SEO·AEO·GEO를 채점하는 스크립트
//
// 전역 가이드(NAVER_SEO_최적화_가이드 / SEO_GEO_AEO_최적화_가이드)의 체크리스트를
// 항목으로 옮겨 세 영역을 각각 100점으로 채점한다. 로컬 dist가 아니라 실제 URL을
// 검사하므로 "빌드는 됐지만 배포가 안 된" 상태를 점수로 잡아낸다.
//
// 사용법: node scripts/seoScore.mjs [https://호스트]

const ORIGIN = (process.argv[2] ?? 'https://weddingcore.net').replace(/\/$/, '');
// 채점 대상. 공개 라우트를 늘리면 여기도 늘린다 — 안 늘리면 새 페이지는
// 한 번도 채점되지 않은 채 "100점"이 나온다(2026-08-31에 35개가 그 상태였다).
const PAGES = ['/', '/visa-simulator', '/mbti-test', '/guides', '/law'];

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

  const home = await get('/');
  const pages = {};
  for (const p of PAGES) pages[p] = await get(p);
  const robots = await get('/robots.txt');
  const sitemap = await get('/sitemap.xml');
  const llms = await get('/llms.txt');
  const notFound = await get('/__definitely-missing-page__');
  const wwwRes = await get(`${ORIGIN.replace('https://', 'https://www.')}/`);

  const sitemapUrls = [...sitemap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const sitemapStatuses = [];
  for (const u of sitemapUrls) sitemapStatuses.push({ u, s: (await get(u)).status });

  const ld = jsonLd(home.body);
  const faq = ld.find((d) => d?.['@type'] === 'FAQPage');
  const org = ld.find((d) => d?.['@type'] === 'Organization');
  const homeText = strip(home.body);

  // ---------------- SEO ----------------
  const titles = PAGES.map((p) => tag(pages[p].body, 'title'));
  const descs = PAGES.map((p) => meta(pages[p].body, 'name', 'description'));
  const uniq = (arr) => new Set(arr.filter(Boolean)).size;
  const h1Counts = PAGES.map((p) => (pages[p].body.match(/<h1[\s>]/gi) ?? []).length);
  const canonOk = PAGES.filter((p) => canonical(pages[p].body) === `${ORIGIN}${p === '/' ? '/' : p}`).length;
  const ogKeys = ['og:title', 'og:description', 'og:url', 'og:image'];
  const ogHave = ogKeys.filter((k) => meta(home.body, 'property', k));
  const ogImg = meta(home.body, 'property', 'og:image');
  const ogImgRes = ogImg ? await get(ogImg) : { status: 0 };
  const prerendered = PAGES.filter((p) => strip(pages[p].body).length > 150).length;

  const seo = scoreBlock('SEO', [
    { label: 'robots.txt 200 + Yeti 허용 + Sitemap 명시', max: 10,
      got: robots.status === 200 && /Yeti/i.test(robots.body) && /Sitemap:/i.test(robots.body) ? 10 : robots.status === 200 ? 5 : 0,
      note: robots.status === 200 ? null : `HTTP ${robots.status}` },
    { label: 'sitemap.xml 200 + 모든 URL 200', max: 10,
      got: sitemap.status === 200 && sitemapStatuses.length > 0 && sitemapStatuses.every((x) => x.s === 200) ? 10 : sitemap.status === 200 ? 5 : 0,
      note: sitemapStatuses.filter((x) => x.s !== 200).map((x) => `${x.u}:${x.s}`).join(', ') || `${sitemapUrls.length}개 전부 200` },
    { label: '페이지별 자기참조 canonical', max: 10, got: Math.round((canonOk / PAGES.length) * 10),
      note: `${canonOk}/${PAGES.length}` },
    { label: '페이지별 고유 title', max: 10, got: Math.round((uniq(titles) / PAGES.length) * 10),
      note: `고유 ${uniq(titles)}/${PAGES.length}` },
    { label: '페이지별 고유 description', max: 8, got: Math.round((uniq(descs) / PAGES.length) * 8),
      note: `고유 ${uniq(descs)}/${PAGES.length}` },
    { label: 'h1 페이지당 정확히 1개', max: 8,
      got: Math.round((h1Counts.filter((n) => n === 1).length / PAGES.length) * 8),
      note: `개수 ${h1Counts.join(',')}` },
    { label: 'OG 4종 + 이미지 실제 접근', max: 10,
      got: (ogHave.length / 4) * 6 + (ogImgRes.status === 200 ? 4 : 0),
      note: `${ogHave.length}/4, 이미지 ${ogImgRes.status}` },
    { label: '구조화 데이터 유효 JSON', max: 8,
      got: ld.length > 0 && ld.every(Boolean) ? 8 : 0, note: `${ld.filter(Boolean).length}개` },
    { label: '없는 주소가 noindex (소프트404 회피)', max: 6,
      got: /noindex/i.test(meta(notFound.body, 'name', 'robots') ?? '') ? 6 : 0 },
    { label: 'www → 대표주소 301', max: 6,
      got: wwwRes.status === 301 ? 6 : wwwRes.status === 307 || wwwRes.status === 302 ? 3 : 0,
      note: `HTTP ${wwwRes.status}` },
    { label: '모바일 viewport', max: 4, got: meta(home.body, 'name', 'viewport') ? 4 : 0 },
    { label: '프리렌더된 본문 노출', max: 10, got: Math.round((prerendered / PAGES.length) * 10),
      note: PAGES.map((p) => strip(pages[p].body).length).join('/') + '자' },
  ]);

  // ---------------- AEO ----------------
  const qHeads = [...home.body.matchAll(/<(h2|h3|dt)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => strip(m[2]))
    .filter((t) => /[?？]|나요|인가요|한가요|무엇|어떻게|얼마|있나요|되나요/.test(t));
  const answers = faq?.mainEntity?.map((q) => q.acceptedAnswer?.text ?? '') ?? [];
  const goodLen = answers.filter((a) => { const w = words(a); return w >= 25 && w <= 110; });
  const selfContained = answers.filter((a) => a.length > 40 && !/^(그|이|저)(것|건|는)/.test(a.trim()));
  const syncOk = faq ? faq.mainEntity.every((q) => homeText.includes(q.name.slice(0, 20)) && homeText.includes(q.acceptedAnswer.text.slice(0, 25))) : false;
  const hasList = /<(ul|ol|table|dl)[\s>]/i.test(home.body);

  const aeo = scoreBlock('AEO', [
    { label: '질문형 헤딩 존재 (4개 이상)', max: 20, got: Math.min(20, qHeads.length * 5),
      note: `${qHeads.length}개` },
    { label: 'FAQPage 스키마', max: 15, got: faq ? 15 : 0, note: faq ? `${faq.mainEntity.length}문항` : '없음' },
    { label: '스키마 ↔ 화면 문구 1:1 일치', max: 20, got: syncOk ? 20 : 0 },
    { label: '답변 길이 적정 (두괄식 40~60단어 상당)', max: 20,
      got: answers.length ? Math.round((goodLen.length / answers.length) * 20) : 0,
      note: answers.length ? `${goodLen.length}/${answers.length}, 평균 ${Math.round(answers.reduce((s, a) => s + words(a), 0) / answers.length)}어절` : '답변 없음' },
    { label: '답변 자기완결 (문맥 없이 읽힘)', max: 15,
      got: answers.length ? Math.round((selfContained.length / answers.length) * 15) : 0,
      note: answers.length ? `${selfContained.length}/${answers.length}` : '-' },
    { label: '목록·표로 구조화', max: 10, got: hasList ? 10 : 0 },
  ]);

  // ---------------- GEO ----------------
  const aiBots = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot'];
  const allowed = aiBots.filter((b) => {
    const i = robots.body.indexOf(b);
    return i >= 0 && /Allow:\s*\//i.test(robots.body.slice(i, i + 120));
  });
  const numbers = (homeText.match(/\d[\d,]*(만원|원|개|명|%|년|건|캐럿)/g) ?? []);
  const sources = /출처|근거|외교부|법무부|공정위|기준으로|안내|고시/.test(homeText);
  const oneLineDef = org?.description && org.description.length > 30;
  const dateInfo = /dateModified|datePublished/.test(home.body) || /\d{4}[-.년]\s?\d{1,2}/.test(homeText);

  const geo = scoreBlock('GEO', [
    { label: 'AI 검색 크롤러 허용', max: 25, got: Math.round((allowed.length / aiBots.length) * 25),
      note: `${allowed.length}/${aiBots.length} (${allowed.join(', ') || '없음'})` },
    { label: '본문에 통계·수치 포함', max: 15, got: Math.min(15, numbers.length * 3),
      note: `${numbers.length}개 ${numbers.slice(0, 4).join(', ')}` },
    { label: '주장에 근거·출처 명시', max: 15, got: sources ? 15 : 0 },
    { label: 'Organization 스키마 + 한 문장 정의', max: 15,
      got: (org ? 8 : 0) + (oneLineDef ? 7 : 0), note: org ? '있음' : '없음' },
    { label: 'llms.txt 제공', max: 10, got: llms.status === 200 ? 10 : 0, note: `HTTP ${llms.status}` },
    { label: '신선도 신호 (연도·갱신일)', max: 10, got: dateInfo ? 10 : 0 },
    { label: '인용 가능한 본문 분량 (1000자 이상)', max: 10,
      got: Math.min(10, Math.round(homeText.length / 100)), note: `${homeText.length}자` },
  ]);

  const avg = Math.round((seo + aeo + geo) / 3);
  console.log(`\n${bold('평균')} ${bold(String(avg) + '점')}  ${dim(`(SEO ${seo} · AEO ${aeo} · GEO ${geo})`)}`);
  console.log(avg >= 96 ? bold('목표 96점 달성') : dim(`목표까지 ${96 - avg}점`));
  process.exitCode = avg >= 96 ? 0 : 1;
}

main().catch((e) => { console.error('채점 실패:', e.message); process.exit(2); });
