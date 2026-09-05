// 고객 관리 — 「접수」 탭(마케팅으로 들어온 손님)과 「고객」 탭(계약해 절차를 시작한 사람)
//
// 접수와 고객은 다른 서랍이다. 접수는 연락처만 남긴 손님이고, 고객은 42개 법정의무 타임라인이 열린 사람이다.
// 접수 탭에서 「고객으로 등록」을 누르면 같은 등록 창이 이름·연락처가 채워진 채 열리고, 등록되면 접수는 닫힌다.
// 고객 탭은 진행 중이 기본이고, 완료·취소한 고객은 「종료된 고객」으로 따로 본다.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, Inbox, Plus, Search, UserRound, Users } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAgencyClientPhones, useAgencyClients, type ClientScope } from '@/features/agency/useAgencyClients';
import CreateClientDialog, { type CreateClientFormValues } from '@/features/agency/CreateClientDialog';
import type { CreateClientIntake } from '@/features/agency/useAgencyClients';
import LeadsPanel from '@/features/leads/LeadsPanel';
import { markConverted, useAgencyLeads, type LeadListItem } from '@/features/leads/useAgencyLeads';
import { parseLeadSummary } from '@/features/leads/parseLeadSummary';
import { useOverdueClients } from '@/features/timeline/useOverdueClients';
import { useAuthStore } from '@/store/authStore';
import ImportClientsDialog from '@/features/agency/ImportClientsDialog';

const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

const CLOSED_LABEL: Record<string, string> = { completed: '완료', cancelled: '취소' };

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
  const [params, setParams] = useSearchParams();
  const tab: 'leads' | 'clients' = params.get('tab') === 'leads' ? 'leads' : 'clients';
  const scope: ClientScope = params.get('scope') === 'closed' ? 'closed' : 'active';
  // 대시보드의 「기한 지남」 카드에서 오면 기한을 넘긴 항목이 있는 고객만 보여 준다.
  const overdueOnly = params.get('filter') === 'overdue';
  const { items, loading } = useAgencyClients(scope);
  const { byClient: overdue } = useOverdueClients();
  const existingPhones = useAgencyClientPhones();
  const { items: leads } = useAgencyLeads();
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importedNotice, setImportedNotice] = useState<number | null>(null);
  const [convertLead, setConvertLead] = useState<LeadListItem | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const activeLeads = leads.filter((l) => l.status === 'new' || l.status === 'contacted' || l.status === 'consulting').length;

  function selectTab(next: 'leads' | 'clients') {
    const nextParams = new URLSearchParams(params);
    if (next === 'leads') nextParams.set('tab', 'leads'); else nextParams.delete('tab');
    setParams(nextParams, { replace: true });
  }

  function selectScope(next: ClientScope) {
    const nextParams = new URLSearchParams(params);
    if (next === 'closed') nextParams.set('scope', 'closed'); else nextParams.delete('scope');
    setParams(nextParams, { replace: true });
  }

  function clearOverdueFilter() {
    const nextParams = new URLSearchParams(params);
    nextParams.delete('filter');
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

  const keyword = search.trim().toLowerCase();
  const digits = keyword.replace(/\D/g, '');
  const visible = items.filter((c) => {
    if (overdueOnly && !overdue.has(c.id)) return false;
    if (!keyword) return true;
    const text = `${c.koreanClient.name} ${c.koreanClient.occupation}`.toLowerCase();
    if (text.includes(keyword)) return true;
    // 전화번호 뒷자리로도 찾는다. 사장은 이름보다 번호를 먼저 기억하는 때가 많다.
    return digits.length >= 3 && c.koreanClient.phone.replace(/\D/g, '').includes(digits);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="eyebrow">고객 관리</div><h1 className="page-title mt-2">고객 관리</h1><p className="mt-1 text-sm text-slate-500">접수된 손님을 고객으로 만들고, 등록부터 혼인·비자·사후관리까지 여정을 관리합니다.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowImport(true)} className="secondary-button">
            <FileSpreadsheet size={16} />엑셀 명단 가져오기
          </button>
          <button onClick={() => setShowCreate(true)} className="primary-button">
            <Plus size={16} />신규 고객
          </button>
        </div>
      </div>

      {importedNotice != null && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          고객 {importedNotice}명을 등록했습니다. 각 고객의 법정의무 일정은 차례로 자동 생성됩니다.
        </div>
      )}

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
          <Users size={16} />고객 {tab === 'clients' && <span className="text-emerald-300">{items.length}</span>}
        </button>
      </div>

      {tab === 'leads' && <LeadsPanel onConvert={(lead) => setConvertLead(lead)} />}

      {tab === 'clients' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => selectScope('active')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${scope === 'active' ? 'bg-[#102621] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>진행 중</button>
            <button type="button" onClick={() => selectScope('closed')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${scope === 'closed' ? 'bg-[#102621] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>종료된 고객</button>
            {overdueOnly && (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                기한 지난 항목이 있는 고객만 보는 중 ({visible.length}명)
                <button type="button" onClick={clearOverdueFilter} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">전체 보기</button>
              </span>
            )}
          </div>

          <div className="app-surface flex items-center gap-3 rounded-2xl p-2.5">
            <Search size={18} className="ml-2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-slate-400" placeholder="이름·직업·전화번호 뒷자리로 검색" /><span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 sm:block">{scope === 'active' ? '진행 중' : '종료'} {items.length}명</span>
          </div>

          {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
          {!loading && items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound /></span>
              <p className="text-sm text-slate-500">{scope === 'active' ? '진행 중인 고객이 없습니다.' : '종료 처리한 고객이 없습니다.'}</p>
              {scope === 'active' && activeLeads > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  진행 중인 접수가 {activeLeads}건 있습니다. <button type="button" onClick={() => selectTab('leads')} className="text-emerald-700 underline">접수 탭</button>에서 고객으로 등록할 수 있습니다.
                </p>
              )}
              {scope === 'active' && activeLeads === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  오른쪽 위 「신규 고객」을 눌러 첫 고객을 등록하세요.
                </p>
              )}
            </div>
          )}
          {!loading && items.length > 0 && visible.length === 0 && (
            overdueOnly && !keyword ? (
              <p className="text-sm text-slate-500">
                기한 지난 항목이 있는 고객이 없습니다. <button type="button" onClick={clearOverdueFilter} className="text-emerald-700 underline">전체 고객 보기</button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">「{search}」에 맞는 고객이 없습니다.</p>
            )
          )}

          <div className="app-surface overflow-hidden rounded-[24px]">
            {visible.map((c) => (
              <Link
                key={c.id}
                to={`/agency/clients/${c.id}`}
                className="group flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-[#fafcfb] sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">{c.koreanClient.name.slice(0, 1)}</span><div className="min-w-0">
                  <div className="font-semibold text-slate-900 group-hover:text-emerald-700">{c.koreanClient.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.koreanClient.gender === 'M' ? '남' : '여'} · {c.koreanClient.occupation} · {c.koreanClient.phone}
                    {c.source?.type === 'lead' && <span className="ml-2 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">접수에서</span>}
                    {(() => {
                      const od = overdue.get(c.id);
                      if (!od) return null;
                      const n = od.warning + od.violated;
                      return <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${od.violated > 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>기한 지남 {n}건</span>;
                    })()}
                  </div>
                </div></div>
                <div className="flex items-center gap-4"><div className="text-right">
                  {scope === 'closed' ? (
                    <div className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {CLOSED_LABEL[c.status] ?? c.status}
                    </div>
                  ) : (
                    <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {STAGE_LABEL[c.currentStage]}
                    </div>
                  )}
                  {scope === 'closed' && c.closedAt?.toDate && <div className="mt-1 text-xs text-slate-400">{c.closedAt.toDate().toLocaleDateString('ko-KR')}</div>}
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

      {showImport && (
        <ImportClientsDialog
          existingPhones={existingPhones}
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            setImportedNotice(count);
            setTimeout(() => setImportedNotice(null), 5000);
          }}
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
