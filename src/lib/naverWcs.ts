// 네이버 광고 클릭 전환 — 공개 화면의 전화(tel:) 클릭은 custom001, 카카오톡 상담 클릭은 custom002로 보낸다
// 공통 스크립트(wcslog.js·공통키·페이지 조회)는 index.html 원문에 있고, 상담 접수 lead는 하람 챗봇이 성공 응답 뒤에 보낸다.
// 네이버로 가는 것은 전환 유형(type)뿐이다. 이름·연락처·번호·내용은 싣지 않는다.

const CONV_CALL = 'custom001'; // 전화(tel:) 클릭
const CONV_KAKAO = 'custom002'; // 카카오톡 상담 클릭
const KAKAO_HOSTS = ['pf.kakao.com', 'open.kakao.com', 'qr.kakao.com'];

// 업체·변호사·관리자·결제·통화·위젯 화면은 추적하지 않는다(public/_headers가 이 경로에서 네이버 스크립트를 막는 것과 같은 규칙).
// 이 화면의 tel: 링크는 업체 손님 번호라 사무소 광고 전환이 아니다.
const NO_TRACK_PREFIXES = ['/agency', '/admin', '/lawyer', '/payment', '/pending-approval', '/call', '/embed'];

let installed = false;

/** document에 클릭 리스너를 한 번만 단다. 여러 번 불려도 한 번만 등록된다. */
export function installNaverClickConversions(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'click',
    (e) => {
      try {
        if (NO_TRACK_PREFIXES.some((p) => location.pathname.startsWith(p))) return;
        const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        let type = '';
        if (href.toLowerCase().startsWith('tel:')) type = CONV_CALL;
        else if (KAKAO_HOSTS.some((h) => a.hostname === h)) type = CONV_KAKAO;
        if (!type) return;
        const wcs = (window as unknown as { wcs?: { trans: (c: { type: string }) => void } }).wcs;
        wcs?.trans({ type });
      } catch {
        /* 전환 전송 실패가 전화 걸기·카톡 열기를 막지 않게 삼킨다 */
      }
    },
    true,
  );
}
