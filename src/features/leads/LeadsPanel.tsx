// 접수 탭 — 들어온 손님을 접수 → 전화했음 → 상담 중 → 고객 등록 / 종료 순서로 옮기는 화면
//
// 한 줄에 이름·전화·판정·경과 시간·상태가 보이고, 펼치면 접수 보고서와 메모, 다음 칸으로 가는 버튼이 있다.
// 24시간 넘게 연락하지 않은 접수와 다음 연락일이 지난 손님은 붉게 표시한다.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Inbox, Phone, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { LeadCloseReason, LeadStatus } from '@/types/schema';
import LeadReport from './LeadReport';
import { inferLevel, parseLeadSummary } from './parseLeadSummary';
import {
  closeLead,
  elapsedLabel,
  isFollowUpDue,
  isUnanswered,
  LEAD_CLOSE_REASON_LABEL,
  LEAD_LEVEL_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  markConsulting,
  markContacted,
  reopenLead,
  saveLeadMemo,
  useAgencyLeads,
  type LeadListItem,
} from './useAgencyLeads';

type Filter = 'active' | 'new' | 'converted' | 'closed' | 'all';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'active', label: '진행 중' },
  { key: 'new', label: '연락 전' },
  { key: 'converted', label: '고객 등록됨' },
  { key: 'closed', label: '종료' },
  { key: 'all', label: '전체' },
];

const STATUS_CLS: Record<LeadStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  contacted: 'bg-indigo-100 text-indigo-800',
  consulting: 'bg-violet-100 text-violet-800',
  converted: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-600',
};

type Props = {
  /** 「고객으로 등록」을 누르면 부모가 등록 창을 연다 */
  onConvert: (lead: LeadListItem) => void;
};

export default function LeadsPanel({ onConvert }: Props) {
  const { items, loading } = useAgencyLeads();
  // 문자 속 링크(?lead=문서id)로 들어오면 그 건을 펼쳐 둔다. 이미 끝난 건일 수 있어 「전체」에서 찾는다.
  const [params] = useSearchParams();
  const linkedId = params.get('lead');
  const [filter, setFilter] = useState<Filter>(linkedId ? 'all' : 'active');
  const [openId, setOpenId] = useState<string | null>(linkedId);

  useEffect(() => {
    if (!linkedId || loading) return;
    document.getElementById(`lead-${linkedId}`)?.scrollIntoView({ block: 'center' });
  }, [linkedId, loading]);

  const counts = useMemo(() => ({
    active: items.filter((l) => l.status === 'new' || l.status === 'contacted' || l.status === 'consulting').length,
    new: items.filter((l) => l.status === 'new').length,
    converted: items.filter((l) => l.status === 'converted').length,
    closed: items.filter((l) => l.status === 'closed').length,
    all: items.length,
  }), [items]);

  const visible = items.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'active') return l.status === 'new' || l.status === 'contacted' || l.status === 'consulting';
    return l.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f.key ? 'bg-[#102621] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {f.label} <span className={filter === f.key ? 'text-emerald-300' : 'text-slate-400'}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && linkedId && !items.some((l) => l.id === linkedId) && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          문자로 받은 접수를 최근 목록에서 찾지 못했습니다. 다른 업체 계정으로 로그인했는지 확인하시거나, 아래 목록에서 성함으로 찾아 주세요.
        </p>
      )}
      {!loading && visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Inbox /></span>
          <p className="text-sm text-slate-500">
            {filter === 'active' ? '진행 중인 접수가 없습니다.' : '해당하는 접수가 없습니다.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            홈페이지 점검 위젯을 아직 안 심었다면 <Link to="/agency/marketing" className="text-emerald-700 underline">마케팅 센터</Link>에서 삽입 코드를 복사할 수 있습니다.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visible.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            open={openId === lead.id}
            onToggle={() => setOpenId(openId === lead.id ? null : lead.id)}
            onConvert={() => onConvert(lead)}
          />
        ))}
      </div>
    </div>
  );
}

function LeadRow({ lead, open, onToggle, onConvert }: { lead: LeadListItem; open: boolean; onToggle: () => void; onConvert: () => void }) {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [memo, setMemo] = useState(lead.memo ?? '');
  // 저장된 다음 연락일을 칸에 보여 준다. 비어 있는 채로 저장하면 날짜가 지워지므로, 있는 값은 미리 채운다.
  const [nextDate, setNextDate] = useState(() => {
    const d = lead.nextActionAt?.toDate?.();
    if (!d) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState<LeadCloseReason>('no_response');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unanswered = isUnanswered(lead);
  const due = isFollowUpDue(lead);
  const level = LEAD_LEVEL_LABEL[inferLevel(parseLeadSummary(lead.summary), lead.level)] ?? { label: '판정 전', cls: 'bg-slate-100 text-slate-600' };
  const telHref = `tel:${lead.phone.replace(/\D/g, '')}`;

  async function run(action: () => Promise<void>) {
    if (!agencyId) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const nextActionLabel = lead.nextActionAt?.toDate ? lead.nextActionAt.toDate().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';

  return (
    <div id={`lead-${lead.id}`} className={`app-surface rounded-2xl ${unanswered || due ? 'ring-1 ring-red-200' : ''}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-bold ${unanswered ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{lead.name.slice(0, 1)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{lead.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${level.cls}`}>{level.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[lead.status] ?? STATUS_CLS.new}`}>{LEAD_STATUS_LABEL[lead.status] ?? lead.status}</span>
              {unanswered && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">24시간 넘게 연락 전</span>}
              {due && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">다시 연락할 날 지남</span>}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {lead.phone} · {LEAD_SOURCE_LABEL[lead.source] ?? lead.source} · 접수 {elapsedLabel(lead.createdAt)}
              {nextActionLabel && ` · 다음 연락 ${nextActionLabel}`}
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <LeadReport summary={lead.summary} level={lead.level} source={lead.source} receivedAt={lead.createdAt} page={lead.page} />

            <div className="space-y-3">
              <a href={telHref} className="primary-button w-full justify-center"><Phone size={15} />{lead.phone}로 전화</a>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">통화 메모</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  onBlur={() => { if (agencyId && memo !== (lead.memo ?? '')) void run(() => saveLeadMemo(agencyId, lead.id, memo)); }}
                  className="field-control min-h-24 resize-y"
                  placeholder="통화한 내용, 손님이 걱정한 것, 약속한 것"
                />
                <p className="mt-1 text-[11px] text-slate-400">칸을 벗어나면 저장됩니다.</p>
              </div>

              {/* 다음 칸으로 가는 버튼. 지금 상태에서 갈 수 있는 것만 보인다 */}
              <div className="flex flex-wrap gap-2">
                {lead.status === 'new' && (
                  <button type="button" disabled={busy} onClick={() => run(() => markContacted(agencyId!, lead.id, memo))} className="primary-button !py-2">전화했음</button>
                )}
                {(lead.status === 'contacted' || lead.status === 'consulting') && (
                  <div className="flex items-center gap-1.5">
                    <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="field-control !w-auto !py-1.5 text-xs" aria-label="다음 연락일" />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => markConsulting(agencyId!, lead.id, nextDate ? new Date(nextDate + 'T09:00:00') : null, memo))}
                      className="secondary-button !py-2"
                    >
                      {lead.status === 'consulting' ? '다음 연락일 저장' : '상담 중으로'}
                    </button>
                  </div>
                )}
                {/* 손님이 사무실로 바로 찾아와 계약하는 일이 흔하다. 「전화했음」을 거치지 않아도 등록할 수 있어야 한다 */}
                {(lead.status === 'new' || lead.status === 'contacted' || lead.status === 'consulting') && (
                  <button type="button" disabled={busy} onClick={onConvert} className="primary-button !py-2"><UserPlus size={15} />고객으로 등록</button>
                )}
                {lead.status !== 'closed' && lead.status !== 'converted' && !closing && (
                  <button type="button" disabled={busy} onClick={() => setClosing(true)} className="secondary-button !py-2 text-slate-500">종료</button>
                )}
                {lead.status === 'closed' && (
                  <button type="button" disabled={busy} onClick={() => run(() => reopenLead(agencyId!, lead.id))} className="secondary-button !py-2">다시 열기</button>
                )}
                {lead.status === 'converted' && lead.clientId && (
                  <Link to={`/agency/clients/${lead.clientId}`} className="primary-button !py-2">고객 화면으로</Link>
                )}
              </div>

              {closing && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">종료 사유</div>
                  <select value={closeReason} onChange={(e) => setCloseReason(e.target.value as LeadCloseReason)} className="field-control mt-1.5">
                    {(Object.keys(LEAD_CLOSE_REASON_LABEL) as LeadCloseReason[]).map((r) => <option key={r} value={r}>{LEAD_CLOSE_REASON_LABEL[r]}</option>)}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => run(async () => { await closeLead(agencyId!, lead.id, closeReason, memo); setClosing(false); })} className="primary-button !py-2">종료하기</button>
                    <button type="button" onClick={() => setClosing(false)} className="secondary-button !py-2">취소</button>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-slate-400">보류로 닫은 손님은 명절 앞에 다시 볼 명단이 됩니다. 언제든 다시 열 수 있습니다.</p>
                </div>
              )}

              {lead.status === 'closed' && lead.closeReason && (
                <p className="text-xs text-slate-500">종료 사유 · {LEAD_CLOSE_REASON_LABEL[lead.closeReason] ?? lead.closeReason}</p>
              )}
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
