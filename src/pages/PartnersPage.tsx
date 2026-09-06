// 후보 명부 — 소개할 수 있는 외국인 후보를 모아 두고 조건으로 걸러 찾는다
//
// 이 화면이 없어서 매칭에 이름을 손으로 쳤고, 궁합 카드가 늘 비어 있었다.
import { useMemo, useState } from 'react';
import { Plus, Printer, Search, UserRound, UsersRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import PartnerDialog from '@/features/partners/PartnerDialog';
import PartnerProfilePrint from '@/features/partners/PartnerProfilePrint';
import {
  ageOf,
  PARTNER_STATUS_CLASS,
  PARTNER_STATUS_LABEL,
  removePartner,
  usePartners,
  type PartnerItem,
  type PartnerStatus,
} from '@/features/partners/usePartners';

const STATUSES = Object.keys(PARTNER_STATUS_LABEL) as PartnerStatus[];

export default function PartnersPage() {
  const agencyId = useAuthStore((s) => s.user?.agencyId);
  const { items, loading } = usePartners();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PartnerStatus | ''>('');
  const [nationality, setNationality] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [editing, setEditing] = useState<PartnerItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [printing, setPrinting] = useState<PartnerItem | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nationalities = useMemo(
    () => [...new Set(items.map((p) => p.nationality).filter(Boolean))].sort(),
    [items],
  );

  const visible = items.filter((p) => {
    if (status && p.status !== status) return false;
    if (nationality && p.nationality !== nationality) return false;
    const age = ageOf(p.birthDate);
    if (ageMin && (age == null || age < Number(ageMin))) return false;
    if (ageMax && (age == null || age > Number(ageMax))) return false;
    const k = search.trim().toLowerCase();
    if (!k) return true;
    return `${p.name} ${p.nationality} ${p.region} ${p.occupation} ${p.memo}`.toLowerCase().includes(k);
  });

  async function remove(id: string) {
    if (!agencyId) return;
    setError(null);
    try {
      await removePartner(agencyId, id);
      setConfirmId(null);
    } catch (e) {
      setError(`지우지 못했습니다. 잠시 뒤 다시 해 보세요. (${(e as Error).message})`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">후보 명부</div>
          <h1 className="page-title mt-2">후보 명부</h1>
          <p className="mt-1 text-sm text-slate-500">
            소개할 수 있는 분들을 모아 두고 조건으로 찾습니다. 여기 등록해 두면 매칭에서 골라 넣을 수 있습니다.
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="primary-button"><Plus size={16} />후보 등록</button>
      </div>

      <div className="app-surface space-y-3 rounded-2xl p-3.5">
        <div className="flex items-center gap-3">
          <Search size={18} className="ml-1 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·국적·지역·직업·메모로 찾기"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-slate-400"
          />
          <span className="hidden shrink-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 sm:block">
            {visible.length}명
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <label className="text-xs font-semibold text-slate-600">상태
            <select value={status} onChange={(e) => setStatus(e.target.value as PartnerStatus | '')} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
              <option value="">전체</option>
              {STATUSES.map((s) => <option key={s} value={s}>{PARTNER_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">국적
            <select value={nationality} onChange={(e) => setNationality(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
              <option value="">전체</option>
              {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">나이
            <span className="mt-1 flex items-center gap-1">
              <input type="number" inputMode="numeric" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="최소" className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
              <span className="text-slate-400">~</span>
              <input type="number" inputMode="numeric" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="최대" className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
            </span>
          </label>
          {(status || nationality || ageMin || ageMax) && (
            <button
              type="button"
              onClick={() => { setStatus(''); setNationality(''); setAgeMin(''); setAgeMax(''); }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
            >
              조건 지우기
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><UsersRound /></span>
          <p className="text-sm text-slate-500">등록된 후보가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">오른쪽 위 「후보 등록」으로 첫 분을 넣어 보세요.</p>
        </div>
      )}
      {!loading && items.length > 0 && visible.length === 0 && (
        <p className="text-sm text-slate-500">조건에 맞는 후보가 없습니다.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((p) => {
          const age = ageOf(p.birthDate);
          return (
            <div key={p.id} className="app-surface flex gap-3 rounded-2xl p-4">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {p.photoUrl
                  ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="grid h-full w-full place-items-center text-slate-300"><UserRound size={26} /></span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PARTNER_STATUS_CLASS[p.status] ?? ''}`}>
                    {PARTNER_STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[p.nationality, age != null ? `${age}세` : null, p.region].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[p.occupation, p.education, p.maritalHistory].filter(Boolean).join(' · ')}
                </p>
                {p.memo && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">{p.memo}</p>}

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => setEditing(p)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">고치기</button>
                  <button type="button" onClick={() => setPrinting(p)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                    <Printer size={13} />인쇄
                  </button>
                  {confirmId === p.id ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <button type="button" onClick={() => void remove(p.id)} className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white">지우기</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-500 ring-1 ring-slate-200">취소</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(p.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600">지우기</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(adding || editing) && (
        <PartnerDialog
          editing={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); }}
        />
      )}
      {printing && <PartnerProfilePrint partner={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
