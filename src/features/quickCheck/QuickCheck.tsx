// 빠른 요건 점검 화면 — 7문항을 고르고 결과를 본 뒤, 업체 위젯이면 이름·연락처만 남겨 상담으로 잇는다
//
// 두 곳에서 쓴다. weddingcore.net의 /check(공개 화면)와 회원 업체 홈페이지에 iframe으로
// 심는 /embed/check. 업체 ID가 있으면 결과 아래에 접수 칸이 열리고, 접수는 그 업체의
// 전화로 문자가 간다. 답은 저장하지 않는다. 손님이 접수를 누를 때만 요약이 함께 간다.

import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Send, XCircle } from 'lucide-react';
import { evaluate, LEVEL_LABEL, QUESTIONS, summarize, type Verdict } from './questions';

const LEAD_URL = 'https://asia-northeast3-sungpan2026.cloudfunctions.net/submitCheckLead';

type Props = {
  /** 회원 업체 ID. 있으면 결과 화면에 접수 칸이 열린다. */
  agencyId?: string;
  /** 표시용 업체명. 접수 동의 문구에 들어간다. */
  agencyName?: string;
  /** iframe 안에서는 여백을 줄이고 바깥 링크를 새 창으로 연다. */
  compact?: boolean;
};

const LEVEL_STYLE: Record<Verdict, { icon: typeof CheckCircle2; box: string; text: string }> = {
  ok: { icon: CheckCircle2, box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-800' },
  check: { icon: AlertCircle, box: 'border-amber-200 bg-amber-50', text: 'text-amber-900' },
  stop: { icon: XCircle, box: 'border-red-200 bg-red-50', text: 'text-red-800' },
};

export default function QuickCheck({ agencyId, agencyName, compact = false }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'form' | 'result'>('form');
  const ev = useMemo(() => evaluate(answers), [answers]);
  const answered = QUESTIONS.filter((q) => answers[q.key]).length;

  function showResult() {
    setPhase('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setAnswers({});
    setPhase('form');
    window.scrollTo({ top: 0 });
  }

  if (phase === 'form') {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
          <span>{answered} / {QUESTIONS.length} 문항</span>
          <span>답하지 않은 문항은 "미응답"으로 남습니다</span>
        </div>
        <ol className={compact ? 'space-y-3' : 'space-y-4'}>
          {QUESTIONS.map((q, i) => (
            <li key={q.key} className={`app-surface rounded-[22px] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
              <div className="text-[11px] font-bold tracking-widest text-emerald-700">{i + 1}번</div>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-slate-900">{q.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">{q.why}</p>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={q.title}>
                {q.options.map((o) => {
                  const on = answers[q.key] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: o.value }))}
                      className={`min-h-[44px] rounded-xl border px-4 py-2.5 text-[15px] transition-colors ${
                        on
                          ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button type="button" className="primary-button !px-6 !py-3 text-base" disabled={answered === 0} onClick={showResult}>
            결과 보기 <ArrowRight size={18} />
          </button>
          <p className="text-xs leading-5 text-slate-500">
            답은 이 화면에만 있고 저장되지 않습니다. 이 점검은 업체와 출입국 심사의 최종 판단을 대신하지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  const style = LEVEL_STYLE[ev.level];
  const Icon = style.icon;

  return (
    <div className="space-y-5">
      <div className={`rounded-[22px] border p-5 sm:p-6 ${style.box}`}>
        <div className={`flex items-center gap-2 text-lg font-bold ${style.text}`}>
          <Icon size={22} /> {LEVEL_LABEL[ev.level]}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {ev.level === 'ok' && '지금 답하신 범위에서는 진행을 막는 조건이 보이지 않습니다. 소득 증빙과 서류는 상담에서 실제 서류로 확인합니다.'}
          {ev.level === 'check' && `확인이 필요한 항목이 ${ev.checks}건 있습니다. 대부분은 서류를 보면 정리되는 항목입니다. 아래에서 무엇을 확인하는지 보세요.`}
          {ev.level === 'stop' && '지금 상태로는 진행할 수 없는 항목이 있습니다. 그 항목이 정리되면 다시 점검하시면 됩니다. 상담은 미리 받아 두셔도 됩니다.'}
        </p>
      </div>

      <ul className="space-y-2">
        {ev.rows.map(({ q, opt }) => (
          <li key={q.key} className="app-surface flex gap-3 rounded-2xl p-4">
            <VerdictDot verdict={opt?.verdict} />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500">{q.title}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">{opt?.label ?? '미응답'}</div>
              {opt?.note && <p className="mt-1 text-sm leading-6 text-slate-600">{opt.note}</p>}
            </div>
          </li>
        ))}
        {ev.cross.map((c) => (
          <li key={c.title} className="app-surface flex gap-3 rounded-2xl p-4">
            <VerdictDot verdict={c.verdict} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{c.title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{c.note}</p>
            </div>
          </li>
        ))}
      </ul>

      {agencyId ? (
        <LeadForm agencyId={agencyId} agencyName={agencyName} summary={summarize(ev)} level={ev.level} />
      ) : (
        <div className="app-surface rounded-[22px] p-5">
          <div className="text-sm font-bold text-slate-900">더 자세히 보려면</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            소득 기준 금액, 재산 환산, 교제 증빙까지 23문항으로 보는 정밀 점검이 있습니다. 결과를 인쇄해 상담에 가져가실 수 있습니다.
          </p>
          <a href="/visa-simulator" target={compact ? '_blank' : undefined} rel={compact ? 'noreferrer' : undefined} className="primary-button mt-3">
            정밀 점검으로 <ExternalLink size={14} />
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="secondary-button">다시 점검</button>
        {agencyId && (
          <a href="/visa-simulator" target="_blank" rel="noreferrer" className="secondary-button">
            정밀 점검(23문항) <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function VerdictDot({ verdict }: { verdict?: Verdict }) {
  const cls = verdict === 'stop' ? 'bg-red-500' : verdict === 'check' ? 'bg-amber-500' : verdict === 'ok' ? 'bg-emerald-500' : 'bg-slate-300';
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

function LeadForm({ agencyId, agencyName, summary, level }: { agencyId: string; agencyName?: string; summary: string; level: Verdict }) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const who = agencyName ? `${agencyName}에서` : '업체에서';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!f.consent) {
      setState('err');
      setMsg('개인정보 수집·이용에 동의해 주세요.');
      return;
    }
    const phone = (f.phone ?? '').replace(/\D/g, '');
    if (!/^01[016789]\d{7,8}$/.test(phone)) {
      setState('err');
      setMsg('휴대전화 번호를 확인해 주세요. 예: 010-1234-5678');
      return;
    }
    setState('sending');
    try {
      const res = await fetch(LEAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          name: (f.name ?? '').trim(),
          phone,
          level,
          summary,
          page: document.referrer || window.location.href,
          company: f.company ?? '',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || '접수가 되지 않았습니다.');
      setState('ok');
    } catch (err) {
      setState('err');
      setMsg((err as Error).message || '접수 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  if (state === 'ok') {
    return (
      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> 접수됐습니다</div>
        {who} 남기신 번호로 연락드립니다. 점검 결과는 함께 전달되어 같은 설명을 두 번 하지 않으셔도 됩니다.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="app-surface relative rounded-[22px] p-5 sm:p-6">
      <div className="text-sm font-bold text-slate-900">이 결과로 상담 받기</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        성함과 연락처만 남기시면 됩니다. 위 결과가 함께 전달되어 {who} 바로 확인하고 연락드립니다.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">성함</span>
          <input name="name" required maxLength={40} autoComplete="name" className="field-control" placeholder="성함 또는 부르실 이름" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-700">휴대전화</span>
          <input name="phone" required inputMode="tel" autoComplete="tel" className="field-control" placeholder="010-1234-5678" />
        </label>
      </div>
      {/* 자동 입력 봇을 걸러내는 빈 칸. 사람에게는 보이지 않는다. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label>회사명 <input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
        <input type="checkbox" name="consent" className="mt-1" />
        <span>
          성함·연락처와 위 점검 결과를 상담 연락 목적으로 {agencyName ?? '해당 업체'}에 전달하는 데 동의합니다.
          weddingCORE는 전달과 기록을 위해서만 보관하며, 다른 목적으로 쓰지 않습니다.
        </span>
      </label>
      {state === 'err' && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={state === 'sending'} className="primary-button mt-4 w-full justify-center !py-3">
        <Send size={16} /> {state === 'sending' ? '접수 중…' : '상담 접수'}
      </button>
    </form>
  );
}
