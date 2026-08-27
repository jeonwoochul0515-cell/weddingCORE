// www 주소를 대표 주소로 넘기고 나머지는 정적 자산으로 넘기는 워커
//
// www.weddingcore.net과 weddingcore.net이 같은 내용을 200으로 응답하면
// 검색엔진이 중복 문서로 본다. canonical만으로는 신호가 약하므로 301로 합친다.

const CANONICAL_HOST = 'weddingcore.net';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
