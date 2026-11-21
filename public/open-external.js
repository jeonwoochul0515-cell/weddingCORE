// 카카오톡 안에서 열린 링크를 바깥 브라우저로 넘긴다
//
// 왜 필요한가. 카톡으로 주소를 보내면 카톡 안의 간이 브라우저에서 열린다.
// 그 안에서는 결제창이 뜨지 않거나 카드사 인증에서 막히고, 로그인 상태도 따로 논다.
// 그래서 카톡 브라우저로 들어온 사람만 골라 기본 브라우저로 다시 열어 준다.
//
// CSP가 인라인 스크립트를 막기 때문에 별도 파일로 두고 index.html 에서 부른다.
//
// 지킬 것(전역 기준 C:\Users\jeonw\.claude\snippets\open-outside.js 와 같은 동작, 2026-11-22 맞춤).
//   · 화면을 다 읽은 뒤에 넘긴다. <head>에서 바로 넘기면 넘기기 실패 때 빈 흰 화면만 남는다
//     (2026-11-07 퇴사히어로 사고, 이 사이트도 카톡에서 본문 0자가 재현됐다).
//   · 한 방문에 한 번만 시도하고, 그 기록을 못 남기면 넘기지 않는다. 안 그러면 창이 계속 튄다.

(function () {
  var ua = navigator.userAgent || '';
  var here = location.href;

  // 한 번 넘겼는데도 다시 들어오면(넘기기 실패) 무한 반복하지 않는다.
  var GUARD = 'wc_external_tried';
  try {
    if (sessionStorage.getItem(GUARD)) return;
  } catch (e) {}

  var isKakao = /KAKAOTALK/i.test(ua);
  if (!isKakao) return;

  // 기록을 못 남기면 넘기지 않는다.
  try {
    sessionStorage.setItem(GUARD, '1');
  } catch (e) {
    return;
  }

  function go() {
    // 카카오톡이 제공하는 "기본 브라우저로 열기" 스킴. 안드로이드·iOS 모두 동작한다.
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(here);

    // 스킴이 먹지 않는 기기가 있다. 1.2초 뒤에도 그대로면 직접 여는 방법을 안내한다.
    setTimeout(function () {
      if (document.hidden) return; // 바깥 브라우저로 넘어갔으면 이 탭은 가려진다
      var bar = document.createElement('div');
      bar.setAttribute(
        'style',
        'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;' +
          'background:#102621;color:#fff;padding:14px 16px;font-size:14px;line-height:1.5;' +
          'font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif',
      );
      bar.innerHTML =
        '<strong>카카오톡 안에서는 결제가 되지 않습니다.</strong><br>' +
        '오른쪽 아래 <b>⋮</b> 또는 <b>공유</b> 버튼을 누르고 ' +
        '<b>다른 브라우저로 열기</b>를 선택해 주세요.';
      document.body && document.body.appendChild(bar);
    }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
