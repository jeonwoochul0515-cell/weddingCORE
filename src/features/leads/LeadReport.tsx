// 접수 보고서 — 원문 덩어리 대신 보고서 형식으로. 핵심 요약 → 요건 현황 → 상담 요지 → 판단 → 다음 행동 → 원문
//
// 대표가 전화기를 들기 전에 30초 안에 읽는 한 장이다. 확인된 것은 표로, 미확인은 개수와 이름만.
// 판단은 판단대로, 다음에 물을 것은 따로. 원문은 접어 두되 없애지 않는다.

import type { Timestamp } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, ChevronDown, XCircle } from 'lucide-react';
import { inferLevel, nextActions, parseLeadSummary, summarizeHeadline, type ReportItem } from './parseLeadSummary';
import { LEAD_LEVEL_LABEL, LEAD_SOURCE_LABEL } from './useAgencyLeads';

type Props = {
  summary: string;
  level: string;
  source: string;
  receivedAt?: Timestamp | null;
  page?: string;
  /** 고객 상세처럼 좁은 자리에 넣을 때 */
  compact?: boolean;
};

const LEVEL_ICON: Record<string, typeof CheckCircle2> = { ok: CheckCircle2, check: AlertCircle, stop: XCircle };

function StateDot({ state }: { state: ReportItem['state'] }) {
  const cls = state === 'flag' ? 'bg-amber-500' : state === 'known' ? 'bg-emerald-500' : 'bg-slate-300';
  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return <h4 className="mt-5 text-[13px] font-bold text-slate-900">{n}. {children}</h4>;
}

export default function LeadReport({ summary, level, source, receivedAt, page, compact = false }: Props) {
  const p = parseLeadSummary(summary);
  const shownLevel = inferLevel(p, level);
  const levelInfo = LEAD_LEVEL_LABEL[shownLevel] ?? { label: '판정 전', cls: 'bg-slate-100 text-slate-600' };
  const Icon = LEVEL_ICON[shownLevel] ?? AlertCircle;
  const known = p.requirements.filter((r) => r.state !== 'unknown');
  const unknown = p.requirements.filter((r) => r.state === 'unknown');
  const consultKnown = p.consult.filter((c) => c.state !== 'unknown');
  const consultUnknown = p.consult.filter((c) => c.state === 'unknown');
  const actions = nextActions(p);
  const when = receivedAt?.toDate ? receivedAt.toDate().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'}`}>
      {/* 1. 핵심 요약 — 판정과 한 문장. 읽는 사람이 여기서 멈춰도 되게 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${levelInfo.cls}`}><Icon size={13} />{levelInfo.label}</span>
        <span className="text-[11px] text-slate-400">{LEAD_SOURCE_LABEL[source] ?? source}{page ? ` · ${page}` : ''}{when ? ` · ${when}` : ''}</span>
      </div>
      <h4 className="mt-3 text-[13px] font-bold text-slate-900">1. 핵심 요약</h4>
      <p className="mt-1 text-sm leading-6 text-slate-700">{summarizeHeadline(p, level)}</p>
      {p.meta.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">{p.meta.map((m) => `${m.label} ${m.value}`).join(' · ')}</p>
      )}

      {/* 2. 요건 현황 — 확인된 것만 표로 */}
      <SectionTitle n={2}>요건 현황</SectionTitle>
      {known.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">아직 확인된 요건이 없습니다. 첫 통화에서 아래 항목부터 묻습니다.</p>
      ) : (
        <table className="mt-2 w-full border-collapse text-sm">
          <tbody>
            {known.map((r) => (
              <tr key={r.label} className="border-t border-slate-100">
                <th scope="row" className="w-32 py-1.5 pr-3 text-left align-top text-xs font-medium text-slate-500">{r.label}</th>
                <td className="py-1.5 align-top text-slate-800">
                  <span className="flex items-start gap-2"><StateDot state={r.state} />{r.value}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {unknown.length > 0 && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          아직 못 물은 항목 {unknown.length}개 · {unknown.map((u) => u.label).join(', ')}
        </p>
      )}

      {/* 3. 상담 요지 — 걱정·희망 시기·질문 */}
      {(consultKnown.length > 0 || consultUnknown.length > 0) && (
        <>
          <SectionTitle n={3}>상담 요지</SectionTitle>
          {consultKnown.length > 0 ? (
            <dl className="mt-2 space-y-1.5 text-sm">
              {consultKnown.map((c) => (
                <div key={c.label} className="flex gap-3">
                  <dt className="w-32 shrink-0 text-xs font-medium text-slate-500">{c.label}</dt>
                  <dd className="text-slate-800">{c.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-1 text-sm text-slate-500">아직 나눈 이야기가 없습니다.</p>
          )}
          {consultUnknown.length > 0 && consultKnown.length > 0 && (
            <p className="mt-1.5 text-xs text-slate-400">아직 못 들은 것 · {consultUnknown.map((u) => u.label).join(', ')}</p>
          )}
        </>
      )}

      {/* 4. 판단 — 챗봇이나 규칙이 남긴 판단 문장. 사람의 판단이 아니라는 것을 밝힌다 */}
      {p.judgments.length > 0 && (
        <>
          <SectionTitle n={4}>판단 (상담 캐릭터·점검 규칙)</SectionTitle>
          <ul className="mt-1.5 space-y-1 text-sm leading-6 text-slate-700">
            {p.judgments.map((j, i) => <li key={i} className="flex gap-2"><span className="text-slate-400">·</span>{j}</li>)}
          </ul>
        </>
      )}

      {/* 5. 다음 행동 — 첫 통화에서 할 일 */}
      <SectionTitle n={p.judgments.length > 0 ? 5 : 4}>다음 행동</SectionTitle>
      {actions.length === 0 ? (
        // 판정이 빨강·노랑인데 「걸리는 항목이 없습니다」라고 하면 바로 위 배지와 어긋난다.
        // 뽑아낸 할 일이 없을 때도 판정을 먼저 따른다(점검 07-1).
        <p className="mt-1 text-sm text-slate-600">
          {shownLevel === 'stop'
            ? '요약에서 걸리는 항목을 따로 뽑지 못했습니다. 위 판정과 원문을 보고 무엇이 걸리는지 확인한 뒤 전화해 주세요.'
            : shownLevel === 'check'
            ? '확인이 필요한 항목이 있습니다. 원문을 보고 무엇을 확인할지 정한 뒤 전화해 주세요.'
            : '걸리는 항목이 없습니다. 전화해서 진행 의사와 희망 시기를 묻습니다.'}
        </p>
      ) : (
        <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {actions.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      )}

      {/* 원문 — 참고와 한계 */}
      <details className="mt-4">
        <summary className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-400"><ChevronDown size={12} />원문 보기 · 위 내용은 손님이 직접 답한 것이라 서류로 확인하기 전까지는 참고입니다</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[11px] leading-5 text-slate-500">{summary}</pre>
      </details>
    </div>
  );
}
