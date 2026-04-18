import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import CreateClientDialog from '@/features/agency/CreateClientDialog';

const STAGE_LABEL: Record<number, string> = {
  1: '계약 전', 2: '계약 체결', 3: '맞선 준비',
  4: '맞선·혼인', 5: '비자 신청', 6: '사후관리',
};

export default function ClientListPage() {
  const { items, loading } = useAgencyClients();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">고객 목록</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          <Plus size={16} />신규 고객
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">등록된 고객이 없습니다.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {items.map((c) => (
          <Link
            key={c.id}
            to={`/agency/clients/${c.id}`}
            className="flex items-center justify-between border-b border-slate-100 px-5 py-3 last:border-0 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium text-slate-900">{c.koreanClient.name}</div>
              <div className="text-xs text-slate-500">
                {c.koreanClient.gender === 'M' ? '남' : '여'} · {c.koreanClient.occupation}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-600">
                {STAGE_LABEL[c.currentStage]}
              </div>
              <div className="text-xs text-slate-400">진행률 {c.overallProgress}%</div>
            </div>
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
