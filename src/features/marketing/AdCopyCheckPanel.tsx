// 광고 문구 점검 — 올리기 전에 여기 붙여 넣는다
//
// 블로그 글, 카페 글, 홈페이지 문장, 현수막 문구. 누가 썼든 처분받는 것은 업체다
// (법 제27조 양벌규정). 그래서 발행 전에 한 번 지나가는 자리를 만든다.
//
// 판정은 src/domain/adCopyCheck.ts가 한다. 글자를 칠 때마다 바로 보여 주려고
// 화면에서 부른다 — 서버를 거치면 한 문단 고칠 때마다 기다리게 된다.
// 이 점검은 무언가를 열어 주는 게이트가 아니라 사람이 읽고 고치는 도구다.

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Info } from 'lucide-react';
import { checkAdCopy } from '@/domain/adCopyCheck';
import { useAgency } from '@/features/agency/useAgency';

export default function AdCopyCheckPanel() {
  const { agency } = useAgency();
  const [text, setText] = useState('');
  const registrationNumber = agency?.registrationNumber ?? null;

  const verdict = useMemo(
    () => (text.trim() ? checkAdCopy(text, registrationNumber) : null),
    [text, registrationNumber],
  );

  const blocking = verdict?.findings.filter((f) => f.severity === 'block') ?? [];
  const warnings = verdict?.findings.filter((f) => f.severity === 'warn') ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-slate-500" />
        <h2 className="text-base font-bold text-slate-900">광고 문구 점검</h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        블로그·카페·홈페이지·현수막에 올리기 전에 붙여 넣어 보세요. 거짓·과장 광고는 3년 이하
        징역 또는 3천만원 이하 벌금이고(법 제26조 ②), 대행사가 쓴 문구로 처분받는 것도
        업체입니다(제27조 양벌규정).
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="올리려는 문구를 그대로 붙여 넣으세요."
        className="mt-3 min-h-36 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
      />

      {!registrationNumber && (
        <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-600">
          <Info size={12} className="mt-0.5 shrink-0" />
          사무소 정보에 결혼중개업 등록번호가 없어 번호가 정확한지까지는 보지 못합니다.
          「사무소」 화면에서 등록번호를 넣어 주세요.
        </p>
      )}

      {verdict && blocking.length === 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" />
          <p className="text-xs leading-5 text-emerald-900">
            걸리는 표현을 찾지 못했습니다. 다만 <strong>실제로 그렇게 운영하는지</strong>는 기계가
            모릅니다 — 수치와 약속은 계약서·기록과 같은지 한 번 더 보세요.
          </p>
        </div>
      )}

      {blocking.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-red-900">
            <AlertTriangle size={14} />
            이대로 올리면 처분 대상이 될 수 있는 표현이 {blocking.length}건 있습니다
          </p>
          <ul className="mt-2 space-y-1.5">
            {blocking.map((f, i) => (
              <li key={`${f.phrase}-${i}`} className="rounded-lg bg-white px-3 py-2">
                <p className="text-xs font-bold text-red-800">{f.phrase}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-700">{f.reason}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-emerald-800">{f.suggestion}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{f.legalBasis}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-bold text-amber-900">
            법 위반은 아니지만 우리는 쓰지 않는 표현 {warnings.length}건
          </p>
          <ul className="mt-1.5 space-y-1">
            {warnings.map((f, i) => (
              <li key={`${f.phrase}-${i}`} className="rounded-lg bg-white px-3 py-1.5">
                <p className="text-[11px] font-semibold text-slate-800">{f.phrase}</p>
                <p className="text-[11px] leading-4 text-slate-500">{f.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
