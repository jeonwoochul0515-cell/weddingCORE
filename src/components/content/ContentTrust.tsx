// 해설 글 아래에 붙는 신뢰 블록 — 누가 썼고 누가 봤고 언제 손봤고 어디까지가 이 글의 몫인지
//
// 읽는 사람에게도 필요하고(이 글을 믿어도 되나), 검색·AI 답변엔진에도 필요하다.
// 출처와 감수자가 없는 글은 인용에서 밀린다.
import { CONTENT_REVIEWED } from '@/lib/schema';

export const SITE_DEFINITION =
  'weddingCORE는 국제결혼중개업체의 고객·서류·법정기한을 한곳에서 관리하는 업무 시스템입니다.';

export default function ContentTrust({ className = '' }: { className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 sm:p-6 ${className}`}>
      <p className="font-semibold text-[#102621]">{SITE_DEFINITION}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="shrink-0 text-slate-400">쓴 곳</dt>
          <dd>weddingCORE 편집팀</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-slate-400">법률 감수</dt>
          <dd>법률사무소 청송law 담당변호사 김창희</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-slate-400">마지막 검토</dt>
          <dd>{CONTENT_REVIEWED}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-slate-400">문의</dt>
          <dd><a href="tel:1660-4452" className="font-semibold text-emerald-700 underline underline-offset-2">1660-4452</a></dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        이 글은 법령과 공개된 해석·재결례를 정리한 참고 자료이며 구체적 사건의 자문이 아닙니다.
        같은 조문이라도 사실관계에 따라 결론이 달라질 수 있으니, 처분이 걸린 일이라면 변호사에게 확인하세요.
      </p>
    </section>
  );
}
