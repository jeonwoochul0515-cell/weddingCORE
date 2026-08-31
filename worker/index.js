// www 주소 통합과 없는 주소의 404 처리를 담당하는 워커
//
// 두 가지를 해결한다.
// 1) www.weddingcore.net과 weddingcore.net이 같은 내용을 200으로 응답하면 중복 문서가 된다.
// 2) SPA는 없는 주소에도 index.html을 200으로 돌려준다(소프트404). 그대로 두면 검색엔진이
//    존재하지 않는 URL을 홈과 같은 문서로 색인한다. 앱 라우트가 아닌 경로는 404로 응답하고
//    robots 메타를 noindex로 바꿔 색인에서 뺀다. 내용은 그대로 넘겨 앱이 안내 화면을 그린다.

import { handleChat } from './chat.js';

const CANONICAL_HOST = 'weddingcore.net';

/** 앱이 실제로 처리하는 경로. 여기 없으면 없는 주소로 본다. */
const ROUTE_PREFIXES = [
  '/login',
  '/signup',
  '/pending-approval',
  '/visa-simulator',
  '/mbti-test',
  '/privacy',
  // 결혼중개업법 해석 모음. 여기 없으면 프리렌더된 페이지가 있어도 404 + noindex로
  // 나가서 색인이 되지 않는다. 공개 라우트를 늘리면 반드시 여기도 늘린다.
  '/guides',
  '/law',
  '/agency',
  '/payment',
  '/lawyer',
  '/admin',
];

function isAppRoute(pathname) {
  if (pathname === '/') return true;
  return ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 대표 주소는 https://weddingcore.net 하나다. http와 www는 검색엔진에게 별개 사이트라
    // 그대로 두면 같은 내용이 최대 네 벌로 색인된다(http/https × www 유무).
    // 두 가지를 한 번에 바로잡아 리다이렉트가 두 번 일어나지 않게 한다.
    const wrongHost = url.hostname === `www.${CANONICAL_HOST}`;
    // Cloudflare 뒤에서는 url.protocol이 항상 https로 보일 수 있으므로 원래 프로토콜 헤더를 본다.
    const forwarded = request.headers.get('X-Forwarded-Proto');
    const wrongScheme = forwarded ? forwarded !== 'https' : url.protocol !== 'https:';
    if (wrongHost || wrongScheme) {
      url.hostname = CANONICAL_HOST;
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    // 상담 캐릭터 대화 엔진. 같은 도메인이라 CORS가 필요 없다.
    if (url.pathname === '/api/chat') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      const referer = request.headers.get('Referer') ?? '';
      if (referer && !referer.includes(CANONICAL_HOST) && !referer.includes('localhost')) {
        return new Response('Forbidden', { status: 403 });
      }
      return handleChat(request, env);
    }

    const response = await env.ASSETS.fetch(request);

    // 확장자가 있으면 정적 파일 요청이므로 그대로 둔다.
    const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
    if (isFile || isAppRoute(url.pathname) || response.status !== 200) {
      return response;
    }

    const html = (await response.text()).replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/i,
      '<meta name="robots" content="noindex, nofollow" />',
    );
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: 404, headers });
  },
};
