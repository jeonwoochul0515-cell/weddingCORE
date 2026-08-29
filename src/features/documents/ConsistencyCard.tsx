// 서류 정합성 점검 결과 카드 — 고객 상세의 컴플라이언스 탭 맨 위에 놓는다
//
// 서류 목록 옆이 아니라 위에 두는 이유는, 업체가 화면을 열자마자 "지금 이 고객에게
// 위험한 게 있는가"를 먼저 보게 하려는 것이다. 목록은 그다음이다.

import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Info } from 'lucide-react';
import { checkConsistency } from './consistency';
import type { DocumentListItem } from './useClientDocuments';

export default function ConsistencyCard({
  documents,
  meetingAt,
}: {
  documents: DocumentListItem[];
  meetingAt: Date | null;
}) {
  const issues = checkConsistency({ documents, meetingAt });
  const critical = issues.filter((i) => i.level === 'critical').length;

  if (issues.length === 0) {
    return (
      <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
        <p className="text-sm font-semibold text-emerald-900">
          점검한 항목에서 어긋나는 곳이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#102621]">
          <AlertTriangle size={17} className={critical > 0 ? 'text-red-500' : 'text-amber-500'} />
          서류 점검
        </h2>
        <span className="text-xs text-slate-500">
          {critical > 0 && <span className="font-bold text-red-600">먼저 볼 것 {critical}건</span>}
          {critical > 0 && issues.length > critical && ' · '}
          {issues.length > critical && `살펴볼 것 ${issues.length - critical}건`}
        </span>
      </div>

      <ul className="space-y-2.5">
        {issues.map((issue) => (
          <li
            key={issue.title}
            className={`rounded-xl border p-3.5 ${
              issue.level === 'critical'
                ? 'border-red-200 bg-red-50/50'
                : 'border-amber-200 bg-amber-50/40'
            }`}
          >
            <p className="mb-1 text-sm font-bold text-[#102621]">{issue.title}</p>
            <p className="mb-2 text-[13px] leading-relaxed text-slate-600">{issue.detail}</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded bg-white px-1.5 py-0.5">{issue.basis}</span>
              {issue.guideSlug && (
                <Link
                  to={`/guides/${issue.guideSlug}`}
                  className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 hover:underline"
                >
                  사례 보기 <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
        <Info size={12} className="mt-0.5 shrink-0" />
        등록된 서류를 기준으로 한 점검입니다. 실제 제공 시점과 내용은 시스템이 알 수 없으니
        증빙과 함께 확인해 주세요. 개별 사안의 판단은 변호사 검토를 거쳐야 합니다.
      </p>
    </div>
  );
}
