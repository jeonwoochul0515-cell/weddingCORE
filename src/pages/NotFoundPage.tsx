// 없는 주소로 들어왔을 때 보여주는 화면 (검색 색인에서 제외)
//
// 홈으로 즉시 리다이렉트하면 검색엔진이 모든 잘못된 URL을 홈과 같은 문서로 보고
// 중복·소프트404로 처리한다. 안내를 보여주고 noindex를 걸어 색인에서 빼는 편이 낫다.

import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import BrandMark from '@/components/brand/BrandMark';

export default function NotFoundPage() {
  usePageMeta({
    title: '페이지를 찾을 수 없습니다',
    description: '요청하신 주소에 해당하는 페이지가 없습니다.',
    path: '/404',
    noindex: true,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5 text-center">
      <Link to="/" className="mb-10"><BrandMark /></Link>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200">
        <Compass size={24} />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-slate-950">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
        주소가 바뀌었거나 삭제된 페이지일 수 있습니다. 아래에서 필요한 곳으로 이동해 주세요.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link to="/" className="primary-button"><ArrowLeft size={16} />홈으로</Link>
        <Link to="/visa-simulator" className="secondary-button">F-6 준비도 점검</Link>
        <Link to="/login" className="secondary-button">업체 로그인</Link>
      </div>
    </div>
  );
}
