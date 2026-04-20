#!/usr/bin/env node
/**
 * 성평등가족부 국제결혼중개업 Open API 응답 구조 탐색.
 * 실행: DATA_GO_KR_KEY=<decoded_key> node scripts/probeRegistryApi.mjs
 */
const DECODED = process.env.DATA_GO_KR_KEY;
if (!DECODED) { console.error('DATA_GO_KR_KEY 누락'); process.exit(1); }

const HTTPS = 'https://apis.data.go.kr/1383000/gmis/instMrgBrkpgServiceV2/getInstMrgBrkpgListV2';
const HTTP = 'http://apis.data.go.kr/1383000/gmis/instMrgBrkpgServiceV2/getInstMrgBrkpgListV2';
const ENCODED_KEY = encodeURIComponent(DECODED); // `+`→`%2B`, `=`→`%3D`

async function call(extra = {}, label = 'default', opts = {}) {
  const useHttp = opts.http ?? false;
  const useRawKey = opts.rawKey ?? false;

  const base = useHttp ? HTTP : HTTPS;
  const params = new URLSearchParams({
    pageNo: '1', numOfRows: '3', type: 'json', ...extra,
  });
  // serviceKey 는 별도로 앞에 붙여 수동 encoding 시나리오 테스트
  const keyPart = useRawKey
    ? `serviceKey=${ENCODED_KEY}`   // 수동 인코딩 고정
    : `serviceKey=${encodeURIComponent(DECODED)}`;
  const url = `${base}?${keyPart}&${params.toString()}`;
  console.log(`\n===== [${label}] =====`);
  console.log('URL len =', url.length, '(키 가림)');
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    console.log('status:', res.status, res.headers.get('content-type'));
    // JSON 시도, 실패 시 그대로 출력
    try {
      const j = JSON.parse(text);
      console.log(JSON.stringify(j, null, 2).slice(0, 4000));
    } catch {
      console.log(text.slice(0, 2000));
    }
  } catch (err) {
    console.error('fetch error:', err.message);
  }
}

// HTTPS / HTTP 각각 시도
await call({}, 'https-json');
await call({}, 'http-json', { http: true });
await call({ type: 'xml' }, 'https-xml');
await call({ type: 'xml' }, 'http-xml', { http: true });
