// 고객별 F-6 비자 사건의 단계·기한을 관리하고 신청 대행 수임료를 안내하는 화면
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CalendarClock, CheckCircle2, ClipboardCheck, FileWarning, Landmark, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import { TRACKS, TRACK_LIST, stageSpec, type TrackId } from '@/domain/visaTracks';

type VisaStage = string;
type VisaCase = {
  id: string;
  agencyId: string;
  clientId: string;
  clientName: string;
  trackId: TrackId;
  visaType: string;
  nationality: string;
  stage: VisaStage;
  dueDate: string;
  note: string;
};



// 아래 수임료는 결혼중개(F-6) 기준이다. 트랙별 수임료 분리는 후속 작업.
const VISA_FEE = {
  memberPrice: 1_000_000,
  nonMemberPrice: 1_300_000,
  // 제휴 변호사의 출입국민원 대행기관 등록 교육 이수일. 이 날짜 전에는 접수를 받지 않는다.
  serviceOpenDate: '2026-09-17',
  included: [
    '신청 전 요건 진단과 불허 위험 점검',
    '필수서류 목록 작성과 수집 가이드',
    '혼인 진정성 소명자료 구성과 작성',
    '제출서류 최종 검토와 접수 지원',
    '보완요청 1회 대응 문서 작성',
  ],
  excluded: [
    '인지대 등 관공서 납부 실비',
    '번역·공증·아포스티유 비용',
    '현지 통역과 출장 비용',
  ],
};

const fee = (value: number) => `${(value / 10_000).toLocaleString()}만원`;

export default function VisaWorkCenterPage() {
  const agencyId = useAuthStore((state) => state.user?.agencyId);
  const { items: clients } = useAgencyClients();
  const [cases, setCases] = useState<VisaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [trackId, setTrackId] = useState<TrackId>('marriage');
  const [visaType, setVisaType] = useState('F-6-1');
  const track = TRACKS[trackId];
  const [nationality, setNationality] = useState('베트남');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) return;
    return onSnapshot(
      query(collection(db, `agencies/${agencyId}/visaCases`), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setCases(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as VisaCase)));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [agencyId]);

  const stats = useMemo(() => ({
    active: cases.filter((item) => item.stage !== 'approved').length,
    supplement: cases.filter((item) => item.stage === 'supplement').length,
    approved: cases.filter((item) => item.stage === 'approved').length,
  }), [cases]);

  // 단계는 목록에서 바로 바꾼다. 사건 하나 옮기려고 다른 화면을 열게 하지 않는다.
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function changeStage(item: VisaCase, stage: string) {
    if (!agencyId || stage === item.stage) return;
    setRowBusy(item.id);
    setNotice(null);
    try {
      await updateDoc(doc(db, `agencies/${agencyId}/visaCases/${item.id}`), { stage, updatedAt: serverTimestamp() });
    } catch (error) {
      setNotice(`단계를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${(error as Error).message})`);
    } finally {
      setRowBusy(null);
    }
  }

  async function removeCase(item: VisaCase) {
    if (!agencyId) return;
    setRowBusy(item.id);
    setNotice(null);
    try {
      await deleteDoc(doc(db, `agencies/${agencyId}/visaCases/${item.id}`));
      setRemoving(null);
    } catch (error) {
      setNotice(`지우지 못했습니다. 대표 계정만 지울 수 있습니다. (${(error as Error).message})`);
    } finally {
      setRowBusy(null);
    }
  }

  async function createCase(event: React.FormEvent) {
    event.preventDefault();
    if (!agencyId || !clientId || !dueDate) return;
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await addDoc(collection(db, `agencies/${agencyId}/visaCases`), {
        agencyId,
        clientId,
        clientName: client.koreanClient.name,
        trackId,
        visaType,
        nationality: nationality.trim(),
        stage: track.stages[0]?.id ?? 'intake',
        dueDate,
        note: note.trim(),
        checklist: {
          invitation: false,
          relationshipEvidence: false,
          incomeEvidence: false,
          housingEvidence: false,
          languageEvidence: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setClientId('');
      setDueDate('');
      setNote('');
      setShowForm(false);
      setNotice('새 비자 사건이 등록되었습니다.');
    } catch (error) {
      setNotice(`등록하지 못했습니다: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#102621_0%,#173f35_100%)] px-6 py-8 text-white shadow-[0_20px_50px_rgba(16,38,33,.16)] sm:px-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300"><Landmark size={14} /> Visa operation center</div><h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">비자업무 센터</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">고객별 F-6 사건의 서류 준비, 전문가 검토, 접수, 보완과 발급 일정을 한곳에서 관리합니다.</p></div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-[#102621] shadow-lg hover:bg-emerald-200"><Plus size={17} />새 비자 사건</button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: '진행 중', value: stats.active, icon: CalendarClock },
          { label: '보완 대응', value: stats.supplement, icon: FileWarning },
          { label: '허가 완료', value: stats.approved, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="app-surface rounded-2xl p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon className="text-emerald-700" size={18} /></div><div className="mt-2 text-3xl font-bold text-slate-950">{value}</div></div>)}
      </div>

      {showForm && <section className="app-surface rounded-[24px] p-5 sm:p-6"><div className="eyebrow">새 사건</div><h2 className="mt-1 text-lg font-bold text-slate-950">비자 사건 등록</h2><form onSubmit={createCase} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">고객<select className="field-control mt-1.5" value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">고객 선택</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.koreanClient.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">사업 종류<select className="field-control mt-1.5" value={trackId} onChange={(event) => { const next = event.target.value as TrackId; setTrackId(next); setVisaType(TRACKS[next].visaTypes[0] ?? ''); }}>{TRACK_LIST.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">비자 유형<select className="field-control mt-1.5" value={visaType} onChange={(event) => setVisaType(event.target.value)}>{track.visaTypes.map((v) => <option key={v} value={v}>{v}</option>)}<option value="기타">기타</option></select></label>
        <label className="text-xs font-semibold text-slate-700">국적<input className="field-control mt-1.5" value={nationality} onChange={(event) => setNationality(event.target.value)} required /></label>
        <label className="text-xs font-semibold text-slate-700">목표 접수일<input type="date" className="field-control mt-1.5" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
        <label className="text-xs font-semibold text-slate-700 md:col-span-2">담당자 메모<textarea className="field-control mt-1.5 min-h-24 resize-y" value={note} onChange={(event) => setNote(event.target.value)} placeholder="현재 준비된 서류와 특이사항을 적어주세요." /></label>
        <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="secondary-button">취소</button><button disabled={submitting || !clientId || !dueDate} className="primary-button">{submitting ? '등록 중' : '사건 등록'}</button></div>
      </form></section>}

      {/* 실패 문구("…못했습니다")를 초록 상자에 담으면 성공처럼 읽힌다. 문구로 색을 가른다 */}
      {notice && <div className={`rounded-xl border px-4 py-3 text-sm ${/못했습니다/.test(notice) ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice}</div>}

      <section className="app-surface rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><div className="eyebrow">진행 순서</div><h2 className="mt-1 text-lg font-bold text-slate-950">표준 진행 단계</h2></div><ClipboardCheck className="text-emerald-700" size={21} /></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{track.stages.map((stage, index) => <div key={stage.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="text-[10px] font-bold text-emerald-700">{index + 1}단계</div><div className="mt-2 text-sm font-bold text-slate-900">{stage.label}</div><p className="mt-1 text-[11px] leading-5 text-slate-500">{stage.description}</p></div>)}</div>
      </section>

      {trackId === 'marriage' && <section className="app-surface rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><div className="eyebrow">수임료</div><h2 className="mt-1 text-lg font-bold text-slate-950">F-6 신청 대행 수임료</h2></div><Wallet className="text-emerald-700" size={21} /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="relative rounded-[22px] border-2 border-emerald-500 bg-emerald-50/50 p-5">
            <span className="absolute -top-3 left-5 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white">회원 업체</span>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{fee(VISA_FEE.memberPrice)}</div>
            <p className="mt-1 text-xs text-slate-500">건당 · 부가세 포함</p>
            <p className="mt-3 text-xs font-semibold text-emerald-700">비회원 대비 {fee(VISA_FEE.nonMemberPrice - VISA_FEE.memberPrice)} 절약</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600">비회원</span>
            <div className="mt-3 text-3xl font-bold tracking-tight text-slate-500">{fee(VISA_FEE.nonMemberPrice)}</div>
            <p className="mt-1 text-xs text-slate-400">건당 · 부가세 포함</p>
            <p className="mt-3 text-xs text-slate-400">플랫폼에 업체 등록 후 신청하면 회원가가 적용됩니다.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold text-slate-700">포함 범위</div>
            <ul className="mt-2.5 space-y-2">{VISA_FEE.included.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />{item}</li>)}</ul>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">별도 비용</div>
            <ul className="mt-2.5 space-y-2">{VISA_FEE.excluded.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-500"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />{item}</li>)}</ul>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <p className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-[11px] leading-5 text-blue-900">
            <strong>대행 접수 시작일 {VISA_FEE.serviceOpenDate}.</strong> 제휴 변호사의 출입국민원 대행기관
            등록 교육 이수 후 접수를 시작합니다. 그전까지는 사건 등록과 서류 준비 단계만 이용할 수 있습니다.
          </p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] leading-5 text-amber-900">
            출입국 민원 대행은 등록된 대행기관과 변호사만 수행할 수 있습니다. 신청 대행은 제휴 법률사무소가 수임하며
            중개업체는 서류 준비를 보조합니다. 수임료는 사건 난이도에 따라 상담 후 조정될 수 있고, 발급을 보장하지 않습니다.
          </p>
        </div>
      </section>}

      <section className="app-surface overflow-hidden rounded-[24px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><div className="eyebrow">사건 목록</div><h2 className="mt-1 text-lg font-bold text-slate-950">비자 사건 목록</h2></div><ShieldCheck className="text-emerald-700" size={21} /></div>
        {loading && <p className="p-6 text-sm text-slate-500">불러오는 중입니다.</p>}
        {!loading && cases.length === 0 && <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-700">등록된 비자 사건이 없습니다.</p><p className="mt-1 text-xs text-slate-500">첫 사건을 등록하면 진행 단계와 기한을 관리할 수 있습니다.</p></div>}
        <div className="divide-y divide-slate-100">{cases.map((item) => {
          const itemTrack = TRACKS[item.trackId];
          const current = stageSpec(item.trackId, item.stage);
          const overdue = item.dueDate && item.stage !== 'approved' && item.dueDate < new Date().toISOString().slice(0, 10);
          return (
            <div key={item.id} className="px-5 py-4 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{item.clientName}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{itemTrack?.label ?? '기타'}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.visaType}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">국적 {item.nationality} · {item.note || '메모 없음'}</p>
                </div>
                <div className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>목표일 {item.dueDate}{overdue ? ' · 지남' : ''}</div>
                <div className="flex items-center gap-1.5">
                  <label className="sr-only" htmlFor={`stage-${item.id}`}>진행 단계</label>
                  <select
                    id={`stage-${item.id}`}
                    value={item.stage}
                    disabled={rowBusy === item.id}
                    onChange={(event) => changeStage(item, event.target.value)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${current?.tone ?? 'bg-slate-100 text-slate-700'}`}
                  >
                    {(itemTrack?.stages ?? []).map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                    {!current && <option value={item.stage}>{item.stage}</option>}
                  </select>
                  {removing !== item.id && (
                    <button type="button" onClick={() => setRemoving(item.id)} aria-label="이 사건 지우기" title="이 사건 지우기" className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              {removing === item.id && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                  <span>{item.clientName} 님의 비자 사건 기록을 지울까요? 되돌릴 수 없습니다.</span>
                  <span className="flex gap-1.5">
                    <button type="button" disabled={rowBusy === item.id} onClick={() => removeCase(item)} className="rounded-md bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50">지우기</button>
                    <button type="button" onClick={() => setRemoving(null)} className="rounded-md border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-700 hover:bg-red-100">취소</button>
                  </span>
                </div>
              )}
            </div>
          );
        })}</div>
      </section>

      <p className="text-center text-[11px] leading-5 text-slate-400">자동화 결과는 신청 가능성을 보장하지 않습니다. 제출 전 사실관계와 최신 출입국 기준을 담당 전문가가 확인해야 합니다.</p>
    </div>
  );
}
