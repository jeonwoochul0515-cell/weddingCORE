import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Search, UserRound } from 'lucide-react';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import CreateClientDialog from '@/features/agency/CreateClientDialog';

const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

export default function ClientListPage() {
  const { items, loading } = useAgencyClients();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="eyebrow">Client relationship</div><h1 className="page-title mt-2">고객 관리</h1><p className="mt-1 text-sm text-slate-500">등록부터 혼인·비자·사후관리까지 고객 여정을 관리합니다.</p></div>
        <button
          onClick={() => setShowCreate(true)}
          className="primary-button"
        >
          <Plus size={16} />신규 고객
        </button>
      </div>

      <div className="app-surface flex items-center gap-3 rounded-2xl p-2.5">
        <Search size={18} className="ml-2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-slate-400" placeholder="고객 이름 또는 직업으로 검색" /><span className="hidden rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 sm:block">진행 중 {items.length}명</span>
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UserRound /></span>
          <p className="text-sm text-slate-500">등록된 고객이 없습니다.</p>
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

      {showCreate && (
        <CreateClientDialog
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); navigate(`/agency/clients/${id}`); }}
        />
      )}
    </div>
  );
}
