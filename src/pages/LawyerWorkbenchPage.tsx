import { useEffect, useMemo, useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, ClipboardCheck, FileSearch, Gavel, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { db, functions } from '@/lib/firebase';
import { liveErrorMessage, liveQuery } from '@/lib/live';
import type { AutomationJob } from '@/types/schema';

type ReviewItem = AutomationJob & { id: string };
type Filter = 'pending' | 'approved' | 'changes_requested' | 'all';

export default function LawyerWorkbenchPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reviewsQuery = query(collection(db, 'legalReviews'), orderBy('updatedAt', 'desc'), limit(100));
    return liveQuery(
      '변호사 검토 대기열',
      reviewsQuery,
      (snapshot) => {
        setItems(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AutomationJob) })));
        setLoading(false);
      },
      (snapshotError) => {
        setError(liveErrorMessage(snapshotError));
        setLoading(false);
      },
    );
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return item.status === 'awaiting_review';
    return item.status === filter;
  }), [filter, items]);

  async function decide(jobId: string, decision: 'approve' | 'request_changes') {
    const reviewNote = notes[jobId]?.trim() ?? '';
    if (decision === 'request_changes' && !reviewNote) {
      setError('수정 요청 사유를 입력해 주세요.');
      return;
    }
    setBusyId(jobId);
    setError(null);
    try {
      await httpsCallable(functions, 'reviewLegalDocument')({ jobId, decision, reviewNote });
      setNotes((current) => ({ ...current, [jobId]: '' }));
    } catch (caught) {
      setError((caught as { message?: string }).message ?? '검토 결과 저장에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#102621] px-6 py-7 text-white shadow-[0_20px_50px_rgba(16,38,33,.16)] sm:px-8 sm:py-9">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-emerald-300 uppercase"><Sparkles size={14} />Legal review desk</div><h1 className="flex items-center gap-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl"><Gavel />변호사 검토실</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">AI가 구조화한 초안의 사실·법적 근거·누락을 확인하고 최종 판단을 기록합니다.</p></div><div className="flex gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3"><div className="text-[10px] text-slate-400">검토 대기</div><div className="mt-1 text-2xl font-bold text-amber-300">{items.filter((item) => item.status === 'awaiting_review').length}</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3"><div className="text-[10px] text-slate-400">승인 완료</div><div className="mt-1 text-2xl font-bold text-emerald-300">{items.filter((item) => item.status === 'approved').length}</div></div></div></div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100"><ShieldAlert size={17} /></span><div><strong className="block">독립 검토 원칙</strong>승인은 변호사의 독립적 검토가 완료되었다는 내부 상태입니다. 원자료 대조 없이 승인하지 마세요.</div>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {([['pending', '검토 대기'], ['changes_requested', '수정 요청'], ['approved', '승인 완료'], ['all', '전체']] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${filter === value ? 'bg-[#102621] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>{label}</button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">검토 문서를 불러오는 중…</p>}
      {!loading && filtered.length === 0 && <div className="rounded-[26px] border border-dashed border-slate-300 bg-white p-14 text-center text-sm text-slate-500"><ClipboardCheck className="mx-auto mb-3 text-emerald-600" />해당 상태의 문서가 없습니다.</div>}

      <div className="space-y-4">
        {filtered.map((item) => (
          <article key={item.id} className="app-surface overflow-hidden rounded-[26px] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><FileSearch size={18} /></span><div><h2 className="font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-xs text-slate-500">업체 {item.agencyId} · 고객 {item.clientName} · 문서 v{item.version}</p></div></div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.status === 'approved' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : item.status === 'changes_requested' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>{item.status === 'approved' ? '승인' : item.status === 'changes_requested' ? '수정 요청' : '검토 대기'}</span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2"><div className="mb-2 text-xs font-bold text-slate-600">AI 초안</div><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-[#f8faf9] p-5 font-sans text-xs leading-6 text-slate-800">{item.generatedContent}</pre></div>
              <div className="space-y-3 text-sm">
                <ReviewList title="위험 신호" items={item.riskFlags} />
                <ReviewList title="누락 정보" items={item.missingInformation} />
                <ReviewList title="검토 체크리스트" items={item.lawyerChecklist} />
              </div>
            </div>

            {item.status === 'awaiting_review' && <div className="mt-4 border-t border-slate-100 pt-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">검토 의견</label>
              <textarea maxLength={3000} value={notes[item.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} className="field-control min-h-28 resize-y" placeholder="수정 근거와 필요한 증빙을 구체적으로 기록하세요." />
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={busyId !== null} onClick={() => decide(item.id, 'request_changes')} className="secondary-button !border-rose-200 !text-rose-700 hover:!bg-rose-50"><RotateCcw size={15} />수정 요청</button>
                <button type="button" disabled={busyId !== null} onClick={() => decide(item.id, 'approve')} className="primary-button !bg-emerald-700 hover:!bg-emerald-800"><CheckCircle2 size={15} />검토 승인</button>
              </div>
            </div>}
            {item.reviewNote && item.status !== 'awaiting_review' && <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700"><strong>검토 의견:</strong> {item.reviewNote}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"><div className="text-xs font-bold text-slate-700">{title}</div>{items.length === 0 ? <p className="mt-1 text-xs text-slate-400">없음</p> : <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul>}</div>;
}
