import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Bot, CheckCircle2, Coins, FileText, LockKeyhole, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { functions } from '@/lib/firebase';
import { useAgencyClients } from '@/features/agency/useAgencyClients';
import { useAutomationJobs } from '@/features/automation/useAutomationJobs';
import type { AutomationDocumentType, AutomationJobStatus } from '@/types/schema';

const DOCUMENTS: Array<{ value: AutomationDocumentType; label: string; cost: number; description: string }> = [
  { value: 'f6_application_package', label: 'F-6 신청 패키지', cost: 8, description: '요건·입증구조·누락서류 초안' },
  { value: 'brokerage_contract_review', label: '국제결혼중개 계약 검토', cost: 5, description: '환불·제휴·업무범위 위험 점검' },
  { value: 'premarital_property_agreement', label: '혼인 전 재산약정', cost: 10, description: '재산·채무·생활비 조항 초안' },
  { value: 'privacy_third_party_consent', label: '개인정보 제3자 제공 동의서', cost: 3, description: '법률사무소 제공 범위 초안' },
  { value: 'immigration_supplement_response', label: '출입국 보완요청 답변서', cost: 10, description: '사실·증빙별 대응 구조 초안' },
];

const STATUS: Record<AutomationJobStatus, { label: string; tone: string }> = {
  generating: { label: '생성 중', tone: 'border-blue-100 bg-blue-50 text-blue-700' },
  awaiting_review: { label: '변호사 검토 대기', tone: 'border-amber-100 bg-amber-50 text-amber-700' },
  changes_requested: { label: '수정 요청', tone: 'border-rose-100 bg-rose-50 text-rose-700' },
  approved: { label: '변호사 승인', tone: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  failed: { label: '생성 실패', tone: 'border-slate-200 bg-slate-100 text-slate-700' },
};

function errorMessage(error: unknown) {
  const value = error as { message?: string };
  return value.message?.replace(/^Firebase:\s*/i, '') ?? '처리 중 오류가 발생했습니다.';
}

export default function AutomationCenterPage() {
  const [params] = useSearchParams();
  const { items: clients } = useAgencyClients();
  const { items: jobs, credits, loading } = useAutomationJobs();
  const [clientId, setClientId] = useState(params.get('clientId') ?? '');
  const [documentType, setDocumentType] = useState<AutomationDocumentType>('f6_application_package');
  const [requestNote, setRequestNote] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [busy, setBusy] = useState<'consent' | 'generate' | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === clientId), [clients, clientId]);
  const selectedDocument = DOCUMENTS.find((item) => item.value === documentType)!;
  const consentReady = Boolean(
    selectedClient?.automationConsents?.aiProcessing
      && selectedClient.automationConsents.legalReviewSharing,
  );
  const allowance = credits?.monthlyAllowance ?? 0;
  const remaining = Math.max(0, allowance - (credits?.used ?? 0));

  async function saveConsent() {
    if (!clientId || !evidenceReference.trim()) return;
    setBusy('consent');
    setNotice(null);
    try {
      await httpsCallable(functions, 'recordAutomationConsent')({
        clientId,
        aiProcessing: true,
        legalReviewSharing: true,
        evidenceReference: evidenceReference.trim(),
      });
      setNotice({ ok: true, text: '동의 증빙을 감사기록과 함께 저장했습니다.' });
    } catch (error) {
      setNotice({ ok: false, text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    if (!clientId || !consentReady) return;
    setBusy('generate');
    setNotice(null);
    try {
      await httpsCallable(functions, 'generateLegalDocument')({ clientId, documentType, requestNote });
      setRequestNote('');
      setNotice({ ok: true, text: '초안을 생성해 변호사 검토 큐로 보냈습니다.' });
    } catch (error) {
      setNotice({ ok: false, text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#102621_0%,#173f35_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(16,38,33,.16)] sm:px-8 sm:py-9">
        <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-emerald-300 uppercase"><Sparkles size={14} />AI operation studio</div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl"><WandSparkles />업무 자동화</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">고객을 선택하면 동의 확인부터 초안 생성, 변호사 승인까지 하나의 안전한 흐름으로 이어집니다.</p>
        </div>
        <div className="min-w-48 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-emerald-100"><Coins size={15} />이번 달 AI 크레딧</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-white">{credits ? remaining : '—'}<span className="ml-1 text-xs font-normal text-slate-400">/ {credits ? allowance : '—'}</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${allowance > 0 ? Math.min(100, (remaining / allowance) * 100) : 0}%` }} /></div>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">제공량은 요금제와 운영 정책에 따라 사전 고지 후 변경될 수 있습니다.</p>
        </div>
      </div>
      </section>

      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
        {[['1','고객 선택'],['2','동의 확인'],['3','초안 생성']].map(([step, label], index) => <div key={step} className={`rounded-xl border px-3 py-2.5 ${index === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}><div className={`text-[10px] font-bold ${index === 0 ? 'text-emerald-700' : 'text-slate-400'}`}>STEP {step}</div><div className="mt-0.5 text-xs font-semibold text-slate-700">{label}</div></div>)}
      </div>

      {notice && <div className={`rounded-2xl border p-4 text-sm shadow-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{notice.text}</div>}

      <section className="app-surface grid overflow-hidden rounded-[26px] lg:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-5 p-5 sm:p-7">
          <div><div className="eyebrow">Document setup</div><h2 className="mt-1 text-lg font-bold text-slate-900">자동화 작업 설정</h2></div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">1. 고객 선택</label>
            <select className="field-control" value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">고객을 선택하세요</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.koreanClient.name} · {client.koreanClient.occupation}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">2. 자동화 문서</label>
            <select className="field-control" value={documentType} onChange={(event) => setDocumentType(event.target.value as AutomationDocumentType)}>
              {DOCUMENTS.map((item) => <option key={item.value} value={item.value}>{item.label} · {item.cost}점</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">{selectedDocument.description}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">담당자 추가 요청</label>
            <textarea className="field-control min-h-32 resize-y" maxLength={3000} value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="사실관계와 특별히 확인할 부분만 입력하세요." />
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-100 bg-[#f4f8f6] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div><div className="eyebrow">Privacy gate</div><div className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900"><ShieldCheck size={19} className="text-emerald-700" />개인정보·법률검토 동의</div></div>
          {consentReady ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm leading-6 text-emerald-800 shadow-sm"><span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-emerald-100"><CheckCircle2 size={16} /></span>AI 처리와 법률사무소 제공 동의가 기록되어 있습니다.</div>
          ) : (
            <>
              <p className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-slate-600"><LockKeyhole className="mb-2 text-emerald-700" size={18} />고객 본인에게 AI 처리 및 법률사무소 청송 제공 범위를 고지하고 서면 또는 전자동의를 받은 경우에만 기록하세요.</p>
              <input className="field-control" value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="예: 고객서명 동의서 문서번호 DOC-2026-104" />
              <button type="button" disabled={!clientId || evidenceReference.trim().length < 3 || busy !== null} onClick={saveConsent} className="secondary-button w-full">{busy === 'consent' ? '저장 중…' : '동의 증빙 기록'}</button>
            </>
          )}
          <div className="border-t border-slate-200 pt-4">
            <button type="button" disabled={!clientId || !consentReady || remaining < selectedDocument.cost || busy !== null} onClick={generate} className="primary-button w-full !py-3.5"><FileText size={17} />{busy === 'generate' ? '초안 생성 중…' : `${selectedDocument.cost}점으로 초안 생성`}</button>
            <p className="mt-2 text-center text-[11px] text-slate-500">AI 결과는 법률의견이 아니며, “변호사 승인” 상태가 되기 전에는 고객에게 교부하거나 제출할 수 없습니다.</p>
          </div>
        </div>
      </section>

      <section className="app-surface overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><div className="eyebrow">Activity</div><h2 className="mt-1 text-base font-bold text-slate-900">최근 자동화 작업</h2></div><Bot className="text-emerald-600" size={20} /></div>
        {loading && <p className="p-5 text-sm text-slate-500">불러오는 중…</p>}
        {!loading && jobs.length === 0 && <p className="p-5 text-sm text-slate-500">아직 생성한 문서가 없습니다.</p>}
        {jobs.map((job) => {
          const state = STATUS[job.status];
          return <details key={job.id} className="group border-b border-slate-100 last:border-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-[#fafcfb] sm:px-6">
              <div><div className="text-sm font-medium text-slate-900">{job.title}</div><div className="mt-0.5 text-xs text-slate-500">{job.clientName} · {job.creditCost}점 · v{job.version}</div></div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${state.tone}`}>{state.label}</span>
            </summary>
            <div className="space-y-3 border-t border-slate-100 bg-[#f8faf9] px-5 py-5 text-sm sm:px-6">
              {job.reviewNote && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"><strong>검토 의견:</strong> {job.reviewNote}</div>}
              {job.riskFlags.length > 0 && <div><strong>위험 신호</strong><ul className="mt-1 list-disc pl-5 text-slate-700">{job.riskFlags.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 font-sans text-xs leading-6 text-slate-800 shadow-sm">{job.generatedContent || '아직 생성된 본문이 없습니다.'}</pre>
            </div>
          </details>;
        })}
      </section>
    </div>
  );
}
