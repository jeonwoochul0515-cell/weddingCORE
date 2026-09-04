// 회원 업체 홈페이지에 iframe으로 심는 빠른 점검 (/embed/check?agency=…&name=…)
//
// 업체 사이트는 저장소도 기술도 제각각이라 스크립트 삽입보다 iframe이 안전하다. 우리 도메인 안에서
// 돌아가므로 접수 함수 호출에 CORS가 필요 없고 업체 사이트의 CSP·스타일과도 충돌하지 않는다.
// 프레임 허용 헤더는 public/_headers의 /embed/* 규칙에서 연다. 이 화면은 색인하지 않는다.

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import QuickCheck from '@/features/quickCheck/QuickCheck';
import { usePageMeta } from '@/lib/usePageMeta';

const AGENCY_ID_RE = /^ag_[A-Za-z0-9_-]{6,40}$/;

export default function EmbedCheckPage() {
  usePageMeta({
    title: '국제결혼 요건 빠른 점검',
    description: '회원 업체 홈페이지에 삽입되는 요건 점검 화면.',
    path: '/embed/check',
    noindex: true,
  });
  const [params] = useSearchParams();
  const rawAgency = params.get('agency') ?? '';
  const agencyId = AGENCY_ID_RE.test(rawAgency) ? rawAgency : undefined;
  const agencyName = (params.get('name') ?? '').slice(0, 40) || undefined;

  // 바깥 페이지가 iframe 높이를 맞출 수 있게 문서 높이를 알린다. 업체 사이트마다 주소가 다르므로
  // 대상 출처를 특정하지 않는다. 높이 숫자 하나뿐이라 새어 나가도 해가 없다.
  useEffect(() => {
    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent?.postMessage({ type: 'weddingcore-check:height', height }, '*');
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f7f3] px-3 py-4 sm:px-5">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">국제결혼 요건 빠른 점검 · 2분</span>
          <span>이름 없이 · 저장 안 함</span>
        </div>
        {!agencyId && (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            업체 식별자가 없어 접수 칸이 열리지 않습니다. 삽입 주소에 <code>agency=</code> 값이 있는지 확인해 주세요.
          </p>
        )}
        <QuickCheck compact agencyId={agencyId} agencyName={agencyName} />
        <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
          본 결과는 준비도 점검이며 법률자문이나 심사 결과 예측이 아닙니다. 점검 도구 제공 weddingCORE.
        </p>
      </div>
    </div>
  );
}
