// 빌드된 SPA의 공개 라우트를 정적 HTML로 미리 렌더링하는 스크립트
//
// 검색·AI 크롤러는 첫 방문에 JS를 실행하지 않고 정적 HTML만 읽는다. 그대로 두면
// 본문이 빈 문서로 색인되므로, 빌드 후 각 라우트를 실제로 그려서 dist에 저장한다.
//
// puppeteer는 전역 도구(C:\Users\jeonw\tools\headless-tools)의 것을 빌려 쓴다.
// 프로젝트에 puppeteer를 의존성으로 추가하지 않는다.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HEADLESS_TOOLS = 'C:/Users/jeonw/tools/headless-tools/package.json';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
// 포트를 고정하지 않는다. 고정하면 같은 머신에서 다른 프로젝트가 그 포트를 쓰고 있을 때
// 그쪽 사이트를 렌더해 우리 dist에 덮어쓴다. 2026-08-29에 실제로 그렇게 KoAdmit 페이지가
// weddingcore.net에 배포됐다. 0을 주면 OS가 빈 포트를 골라 준다.

/** 색인 대상 공개 라우트. 로그인·업체 화면은 noindex라 제외한다. */
// 공개 라우트. 결혼중개업법 해석은 검색 유입 경로라 본문이 정적 HTML에 들어가야 한다.
// src/content/interpretations.ts의 slug와 같아야 하니 항목을 늘리면 여기도 늘린다.
const ROUTES = [
  '/', '/visa-simulator', '/check', '/mbti-test', '/privacy', '/law',
  '/law/article-6',
  '/law/article-10-2',
  '/law/article-12',
  '/law/article-12-2',
  '/law/article-14-2',
  '/law/article-18',
  '/law/article-21',
  '/law/article-24-3',
  '/law/article-26',
  '/law/article-27',
  '/law/decree-article-2',
  '/law/decree-article-3-2',
  '/law/decree-article-4',
  '/law/rule-table-1',
  '/law/rule-table-2',
  '/guides',
  '/guides/capital-per-office',
  '/guides/branch-office-suspension',
  '/guides/foreign-partner-banned-country',
  '/guides/disqualification-suspension',
  '/guides/administrative-guidance-remedy',
  '/guides/multiple-branches-same-district',
  '/guides/notarization-abroad',
  '/guides/registration-transfer',
  '/guides/penalty-count-carryover',
  '/guides/personal-info-disclosure-cases',
  '/guides/suspension-overturned-cases',
  '/guides/criminal-fine-registration-cancel',
  '/guides/prohibited-brokerage-acts',
  '/guides/third-party-complaint-limit',
  '/guides/advertising-liability',
  '/guides/personal-info-criminal',
  '/guides/local-partner-contract-name',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let filePath = path.join(DIST, urlPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, 'index.html'); // SPA fallback
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    // 포트 0 = 빈 포트를 OS가 고르게 한다. 충돌 자체가 생기지 않는다.
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('dist/index.html이 없습니다. npm run build를 먼저 실행하세요.');
    process.exit(1);
  }

  const require = createRequire(HEADLESS_TOOLS);
  const puppeteer = require('puppeteer');

  const server = await startServer();
  const port = server.address().port;
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const rendered = [];
  const failed = [];

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1280, height: 900 });
        // 상담 위젯 같은 "방문자 전용" UI는 정적 HTML에 남으면 안 된다.
        // 검색로봇이 보는 본문에 허수가 섞이고, JS 로드 전 잘못된 상태가 보인다.
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(window, '__PRERENDER__', { value: true });
        });
        await page.goto(`http://127.0.0.1:${port}${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45_000,
        });
        // React가 실제로 그려낼 때까지 기다린다. 빈 #root를 저장하면 의미가 없다.
        await page.waitForFunction(
          () => (document.querySelector('#root')?.textContent?.trim().length ?? 0) > 80,
          { timeout: 45_000 },
        );
        const html = await page.content();
        const title = await page.title();
        // 우리 사이트가 맞는지 확인한다. 아니면 저장하지 않는다.
        if (!html.includes('weddingCORE') && !html.includes('weddingcore.net')) {
          throw new Error(`우리 사이트가 아닙니다 — 렌더된 제목: ${title}`);
        }
        rendered.push({ route, html, title });
        console.log(`  렌더 완료 ${route} — ${title}`);
      } catch (error) {
        // 한 라우트가 실패해도 나머지는 살린다. 대신 눈에 띄게 남긴다.
        failed.push({ route, reason: error.message });
        console.warn(`  ! 렌더 실패 ${route} — ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  // 렌더링이 모두 끝난 뒤 저장한다. 중간에 index.html을 덮어쓰면 이후 라우트가 오염된다.
  for (const { route, html } of rendered) {
    const outPath =
      route === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, route.replace(/^\//, ''), 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf-8');
    console.log(`  저장 ${path.relative(ROOT, outPath)} (${(html.length / 1024).toFixed(1)}KB)`);
  }

  writeFeeds(rendered);

  console.log(`\n프리렌더 ${rendered.length}개 라우트 완료`);
}

/**
 * RSS와 llms.txt를 렌더 결과에서 만든다.
 *
 * 손으로 관리하면 글을 늘릴 때마다 빠뜨린다. 실제로 렌더된 페이지의 제목·설명을 그대로
 * 쓰므로 화면과 어긋날 일이 없다. 네이버는 RSS 제출을 받고, AI 크롤러는 llms.txt를 본다.
 */
function writeFeeds(rendered) {
  const ORIGIN = 'https://weddingcore.net';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const metaDesc = (html) =>
    (html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1] || '';
  const bodyText = (html) =>
    (html.split(/<main[^>]*>/i)[1] || '')
      .split(/<\/main>/i)[0]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // 글다운 페이지만 싣는다. 목록·도구 화면은 갱신되는 글이 아니다.
  const posts = rendered.filter((r) => /^\/(guides|law)\/.+/.test(r.route));
  const now = new Date().toUTCString();

  const items = posts
    .map((r) => {
      const title = r.title.split(/[|—]/)[0].trim();
      return [
        '    <item>',
        `      <title>${esc(title)}</title>`,
        `      <link>${ORIGIN}${r.route}</link>`,
        `      <guid isPermaLink="true">${ORIGIN}${r.route}</guid>`,
        `      <description>${esc(metaDesc(r.html))}</description>`,
        // 본문 전체를 담는다. 네이버 가이드가 요구하는 형태다.
        `      <content:encoded><![CDATA[${bodyText(r.html)}]]></content:encoded>`,
        `      <pubDate>${now}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>weddingCORE 결혼중개업법 해설</title>
    <link>${ORIGIN}/guides</link>
    <description>국제결혼중개업체가 실제로 부딪히는 법령 질문을 조문과 해석으로 정리합니다.</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  fs.writeFileSync(path.join(DIST, 'rss.xml'), rss, 'utf-8');
  console.log(`  저장 dist/rss.xml (${posts.length}건)`);

  // llms.txt — 정적 머리말은 public/llms.txt에 두고, 글 목록만 여기서 붙인다.
  const llmsPath = path.join(DIST, 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    const base = fs.readFileSync(llmsPath, 'utf-8').split('## 주의')[0].trimEnd();
    const tail = fs.readFileSync(llmsPath, 'utf-8').includes('## 주의')
      ? '\n\n## 주의' + fs.readFileSync(llmsPath, 'utf-8').split('## 주의')[1]
      : '\n';
    const list = posts
      .map((r) => `- [${r.title.split(/[|—]/)[0].trim()}](${ORIGIN}${r.route})`)
      .join('\n');
    fs.writeFileSync(llmsPath, `${base}\n\n## 결혼중개업법 해설 전체\n\n${list}\n${tail}`, 'utf-8');
    console.log(`  갱신 dist/llms.txt (해설 ${posts.length}건 목록)`);
  }
}

main().catch((error) => {
  console.error('프리렌더 실패:', error.message);
  process.exit(1);
});
