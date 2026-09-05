// 고객 관리 — 「접수」 탭(마케팅으로 들어온 손님)과 「고객」 탭(계약해 절차를 시작한 사람)
//
// 접수와 고객은 다른 서랍이다. 접수는 연락처만 남긴 손님이고, 고객은 42개 법정의무 타임라인이 열린 사람이다.
// 접수 탭에서 「고객으로 등록」을 누르면 같은 등록 창이 이름·연락처가 채워진 채 열리고, 등록되면 접수는 닫힌다.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Inbox, Plus, Search, UserRound, Users } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import CreateClientDialog, { type CreateClientFormValues } from '@/features/agency/CreateClientDialog';
import type { CreateClientIntake } from '@/features/agency/useAgencyClients';
import LeadsPanel from '@/features/leads/LeadsPanel';
import { markConverted, useAgencyLeads, type LeadListItem } from '@/features/leads/useAgencyLeads';
import { parseLeadSummary } from '@/features/leads/parseLeadSummary';
import { useAuthStore } from '@/store/authStore';

const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

/** 접수 요약에서 혼인이력을 읽어 등록 폼 값으로 바꾼다. 못 읽으면 미혼으로 두지 않고 비워 대표가 고르게 한다. */
function maritalFromSummary(summary: string): string | undefined {
  const p = parseLeadSummary(summary);
  const item = p.requirements.find((r) => r.label.includes('혼인'));
  const v = item?.value ?? '';
  if (/사별/.test(v)) return 'widowed';
  if (/이혼/.test(v)) return 'divorced';
  if (/미혼/.test(v)) return 'none';
  return undefined;
}

export default function ClientListPage() {
  const { items, loading } = useAgencyClients();
  const { items: leads } = useAgencyLeads();
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [params, setParams] = useSearchParams();
  const tab: 'leads' | 'clients' = params.get('tab') === 'leads' ? 'leads' : 'clients';
  const [showCreate, setShowCreate] = useState(false);
  const [convertLead, setConvertLead] = useState<LeadListItem | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const activeLeads = leads.filter((l) => l.status === 'new' || l.status === 'contacted' || l.status === 'consulting').length;

  function selectTab(next: 'leads' | 'clients') {
    const nextParams = new URLSearchParams(params);
    if (next === 'leads') nextParams.set('tab', 'leads'); else nextParams.delete('tab');
    setParams(nextParams, { replace: true });
  }

  const convertInitial: Partial<CreateClientFormValues> | undefined = convertLead
    ? { name: convertLead.name, phone: convertLead.phone, maritalHistory: maritalFromSummary(convertLead.summary) }
    : undefined;
  const convertIntake: CreateClientIntake | undefined = convertLead
    ? {
        leadId: convertLead.id,
        source: convertLead.source,
        level: convertLead.level,
        summary: convertLead.summary,
        receivedAt: convertLead.createdAt ?? Timestamp.now(),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="eyebrow">Client relationship</div><h1 className="page-title mt-2">고객 관리</h1><p className="mt-1 text-sm text-slate-500">접수된 손님을 고객으로 만들고, 등록부터 혼인·비자·사후관리까지 여정을 관리합니다.</p></div>
        <button onClick={() => setShowCreate(true)} className="primary-button">
          <Plus size={16} />신규 고객
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => selectTab('leads')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === 'leads' ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
        >
          <Inbox size={16} />접수 <span className={tab === 'leads' ? 'text-emerald-300' : 'text-slate-400'}>{activeLeads}</span>
        </button>
        <button
          type="button"
          onClick={() => selectTab('clients')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === 'clients' ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
        >
          <Users size={16} />고객 <span className={tab === 'clients' ? 'text-emerald-300' : 'text-slate-400'}>{items.length}</span>
        </button>
      </div>

      {tab === 'leads' && <LeadsPanel onConvert={(lead) => setConvertLead(lead)} />}

      {tab === 'clients' && (
        <>
          <div className="app-surface flex items-center gap-3 rounded-2xl p-2.5">
            <Search size={18} className="ml-2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-slate-400" placeholder="고객 이름 또는 직업으로 검색" /><span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 sm:block">진행 중 {items.length}명</span>
          </div>

          {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
          {!loading && items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound /></span>
              <p className="text-sm text-slate-500">등록된 고객이 없습니다.</p>
              {activeLeads > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  진행 중인 접수가 {activeLeads}건 있습니다. <button type="button" onClick={() => selectTab('leads')} className="text-emerald-700 underline">접수 탭</button>에서 고객으로 등록할 수 있습니다.
                </p>
              )}
            </div>
          )}

          <div className="app-surface overflow-hidden rounded-[24px]">
            {items.filter((c) => `${c.koreanClient.name} ${c.koreanClient.occupation}`.toLowerCase().includes(search.trim().toLowerCase())).map((c) => (
              <Link
                key={c.id}
                to={`/agency/clients/${c.id}`}
                className="group flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-[#fafcfb] sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">{c.koreanClient.name.slice(0, 1)}</span><div className="min-w-0">
                  <div className="font-semibold text-slate-900 group-hover:text-emerald-700">{c.koreanClient.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.koreanClient.gender === 'M' ? '남' : '여'} · {c.koreanClient.occupation}
                    {c.source?.type === 'lead' && <span className="ml-2 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">접수에서</span>}
                  </div>
                </div></div>
                <div className="flex items-center gap-4"><div className="text-right">
                  <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {STAGE_LABEL[c.currentStage]}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">진행률 {c.overallProgress}%</div>
                </div><ArrowRight size={16} className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-emerald-600" /></div>
              </Link>
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <CreateClientDialog
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); navigate(`/agency/clients/${id}`); }}
        />
      )}

      {convertLead && (
        <CreateClientDialog
          initial={convertInitial}
          intake={convertIntake}
          onClose={() => setConvertLead(null)}
          onCreated={async (id) => {
            const lead = convertLead;
            setConvertLead(null);
            if (agencyId && lead) {
              try {
                await markConverted(agencyId, lead.id, id);
              } catch {
                /* 고객은 이미 만들어졌다. 접수 상태 갱신 실패는 목록에서 다시 누르면 된다. */
              }
            }
            navigate(`/agency/clients/${id}`);
          }}
        />
      )}
    </div>
  );
}
