import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, MapPin, MessageSquare, NotebookPen, Phone, Plus, StickyNote, UsersRound, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { ClientActivityType } from '@/types/schema';
import { createClientActivity, useClientActivities } from './useClientActivities';

const TYPE_LABEL: Record<ClientActivityType, string> = {
  call: '전화',
  message: '문자·메신저',
  consultation: '상담',
  visit: '방문',
  note: '메모',
};

const TYPE_ICON: Record<ClientActivityType, typeof Phone> = {
  call: Phone,
  message: MessageSquare,
  consultation: UsersRound,
  visit: MapPin,
  note: StickyNote,
};

function localDateTime(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export default function ActivitySection({ clientId }: { clientId: string }) {
  const user = useAuthStore((s) => s.user);
  const { items, loading } = useClientActivities(clientId);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ClientActivityType>('call');
  const [occurredAt, setOccurredAt] = useState(localDateTime());
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [assignedTo, setAssignedTo] = useState(user?.displayName ?? '');
  const [nextActionAt, setNextActionAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!user?.agencyId) return;
    if (!summary.trim()) { setError('무엇을 이야기하거나 처리했는지 적어 주세요.'); return; }
    setBusy(true);
    setError(null);
    try {
      await createClientActivity({
        agencyId: user.agencyId,
        clientId,
        uid: user.uid,
        type,
        occurredAt: new Date(occurredAt),
        summary,
        outcome,
        assignedTo,
        nextActionAt: nextActionAt ? new Date(`${nextActionAt}T09:00:00`) : null,
      });
      setAdding(false);
      setSummary('');
      setOutcome('');
      setNextActionAt('');
      setOccurredAt(localDateTime());
    } catch (err) {
      setError(`기록하지 못했습니다. (${(err as Error).message})`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">상담·연락 이력</h2><p className="mt-1 text-xs text-slate-500">전화, 문자, 상담과 다음 약속을 시간순으로 남깁니다.</p></div>
        <button type="button" onClick={() => setAdding((value) => !value)} className="primary-button !py-2 text-xs">
          {adding ? <X size={14} /> : <Plus size={14} />}{adding ? '닫기' : '기록 추가'}
        </button>
      </div>

      {adding && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="종류"><select value={type} onChange={(event) => setType(event.target.value as ClientActivityType)} className="field-control">{(Object.keys(TYPE_LABEL) as ClientActivityType[]).map((value) => <option key={value} value={value}>{TYPE_LABEL[value]}</option>)}</select></Field>
            <Field label="처리 일시"><input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} className="field-control" /></Field>
            <Field label="담당자"><input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="field-control" maxLength={60} placeholder="담당 직원" /></Field>
          </div>
          <div className="mt-3"><Field label="상담·연락 내용"><textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="field-control min-h-24" maxLength={1000} placeholder="고객이 문의한 내용과 안내한 내용을 적어 주세요." /></Field></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="처리 결과"><input value={outcome} onChange={(event) => setOutcome(event.target.value)} className="field-control" maxLength={300} placeholder="예: 서류 확인 후 다시 연락하기로 함" /></Field>
            <Field label="다음 조치일"><input type="date" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} className="field-control" /></Field>
          </div>
          {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end"><button type="button" onClick={save} disabled={busy} className="primary-button !py-2">{busy ? '저장 중…' : '기록 저장'}</button></div>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {!loading && items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><NotebookPen className="mx-auto text-slate-300" /><p className="mt-2 text-sm text-slate-500">아직 상담·연락 기록이 없습니다.</p></div>}
      <ol className="space-y-3">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.type] ?? StickyNote;
          const nextAction = item.nextActionAt?.toDate ? item.nextActionAt.toDate() : null;
          const overdue = nextAction ? nextAction.getTime() < new Date().setHours(0, 0, 0, 0) : false;
          return (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-semibold text-slate-900">{TYPE_LABEL[item.type]}</span><span className="text-xs text-slate-500">{item.occurredAt?.toDate ? format(item.occurredAt.toDate(), 'yyyy-MM-dd HH:mm') : ''}</span>{item.assignedTo && <span className="text-xs text-slate-400">· {item.assignedTo}</span>}</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.summary}</p>
                  {item.outcome && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="font-semibold">처리 결과</span> · {item.outcome}</p>}
                  {nextAction && <span className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${overdue ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}><CalendarClock size={13} />다음 조치 {format(nextAction, 'yyyy-MM-dd')}{overdue ? ' · 지남' : ''}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
