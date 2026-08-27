// 고객별 F-6 비자 사건의 단계·기한을 관리하고 신청 대행 수임료를 안내하는 화면
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { CalendarClock, CheckCircle2, ClipboardCheck, FileWarning, Landmark, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useAgencyClients } from '@/features/agency/useAgencyClients';

type VisaStage = 'intake' | 'documents' | 'legal_review' | 'submitted' | 'supplement' | 'approved';
type VisaCase = {
  id: string;
  agencyId: string;
  clientId: string;
  clientName: string;
  visaType: string;
  nationality: string;
  stage: VisaStage;
  dueDate: string;
  note: string;
};

const STAGES: Array<{ id: VisaStage; label: string; description: string }> = [
  { id: 'intake', label: '상담 접수', description: '신청인·초청인 기본정보 확인' },
  { id: 'documents', label: '서류 준비', description: '필수서류 수집과 누락 점검' },
  { id: 'legal_review', label: '전문가 검토', description: '진술·계약·위험요소 검토' },
  { id: 'submitted', label: '접수 완료', description: '공관·출입국 접수번호 관리' },
  { id: 'supplement', label: '보완 대응', description: '보완요청 기한과 답변 관리' },
  { id: 'approved', label: '허가 완료', description: '발급·입국 후속 절차 안내' },
];

/**
 * F-6 신청 대행 수임료. 단순 서류대행(행정사 기준 30만원대)이 아니라 요건 진단부터
 * 혼인 진정성 소명, 보완 대응까지 포함한 종합 수임 기준이다. 실제 수임 주체는
 * 제휴 법률사무소이며 금액은 부가세 포함이다.
 */
const VISA_FEE = {
  memberPrice: 1_000_000,
  nonMemberPrice: 1_300_000,
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

const STAGE_STYLE: Record<VisaStage, string> = {
  intake: 'bg-slate-100 text-slate-700',
  documents: 'bg-blue-50 text-blue-700',
  legal_review: 'bg-violet-50 text-violet-700',
  submitted: 'bg-amber-50 text-amber-800',
  supplement: 'bg-rose-50 text-rose-700',
  approved: 'bg-emerald-50 text-emerald-700',
};

export default function VisaWorkCenterPage() {
  const agencyId = useAuthStore((state) => state.user?.agencyId);
  const { items: clients } = useAgencyClients();
  const [cases, setCases] = useState<VisaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [visaType, setVisaType] = useState('F-6-1');
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
        visaType,
        nationality: nationality.trim(),
        stage: 'intake',
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

      {showForm && <section className="app-surface rounded-[24px] p-5 sm:p-6"><div className="eyebrow">New case</div><h2 className="mt-1 text-lg font-bold text-slate-950">비자 사건 등록</h2><form onSubmit={createCase} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">고객<select className="field-control mt-1.5" value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">고객 선택</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.koreanClient.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">비자 유형<select className="field-control mt-1.5" value={visaType} onChange={(event) => setVisaType(event.target.value)}><option>F-6-1</option><option>F-6-2</option><option>기타</option></select></label>
        <label className="text-xs font-semibold text-slate-700">배우자 국적<input className="field-control mt-1.5" value={nationality} onChange={(event) => setNationality(event.target.value)} required /></label>
        <label className="text-xs font-semibold text-slate-700">목표 접수일<input type="date" className="field-control mt-1.5" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
        <label className="text-xs font-semibold text-slate-700 md:col-span-2">담당자 메모<textarea className="field-control mt-1.5 min-h-24 resize-y" value={note} onChange={(event) => setNote(event.target.value)} placeholder="현재 준비된 서류와 특이사항을 적어주세요." /></label>
        <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowForm(false)} className="secondary-button">취소</button><button disabled={submitting || !clientId || !dueDate} className="primary-button">{submitting ? '등록 중' : '사건 등록'}</button></div>
      </form></section>}

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <section className="app-surface rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><div className="eyebrow">Workflow</div><h2 className="mt-1 text-lg font-bold text-slate-950">표준 진행 단계</h2></div><ClipboardCheck className="text-emerald-700" size={21} /></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{STAGES.map((stage, index) => <div key={stage.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="text-[10px] font-bold text-emerald-700">STEP {index + 1}</div><div className="mt-2 text-sm font-bold text-slate-900">{stage.label}</div><p className="mt-1 text-[11px] leading-5 text-slate-500">{stage.description}</p></div>)}</div>
      </section>

      <section className="app-surface rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><div className="eyebrow">Service fee</div><h2 className="mt-1 text-lg font-bold text-slate-950">F-6 신청 대행 수임료</h2></div><Wallet className="text-emerald-700" size={21} /></div>
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
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] leading-5 text-amber-900">
          출입국 민원 대행은 등록된 대행기관과 변호사만 수행할 수 있습니다. 신청 대행은 제휴 법률사무소가 수임하며
          중개업체는 서류 준비를 보조합니다. 수임료는 사건 난이도에 따라 상담 후 조정될 수 있고, 발급을 보장하지 않습니다.
        </p>
      </section>

      <section className="app-surface overflow-hidden rounded-[24px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><div className="eyebrow">Cases</div><h2 className="mt-1 text-lg font-bold text-slate-950">비자 사건 목록</h2></div><ShieldCheck className="text-emerald-700" size={21} /></div>
        {loading && <p className="p-6 text-sm text-slate-500">불러오는 중입니다.</p>}
        {!loading && cases.length === 0 && <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-700">등록된 비자 사건이 없습니다.</p><p className="mt-1 text-xs text-slate-500">첫 사건을 등록하면 진행 단계와 기한을 관리할 수 있습니다.</p></div>}
        <div className="divide-y divide-slate-100">{cases.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6"><div><div className="flex items-center gap-2"><span className="font-bold text-slate-900">{item.clientName}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.visaType}</span></div><p className="mt-1 text-xs text-slate-500">배우자 국적 {item.nationality} · {item.note || '메모 없음'}</p></div><div className="text-xs text-slate-500">목표일 {item.dueDate}</div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_STYLE[item.stage]}`}>{STAGES.find((stage) => stage.id === item.stage)?.label}</span></div>)}</div>
      </section>

      <p className="text-center text-[11px] leading-5 text-slate-400">자동화 결과는 신청 가능성을 보장하지 않습니다. 제출 전 사실관계와 최신 출입국 기준을 담당 전문가가 확인해야 합니다.</p>
    </div>
  );
}
