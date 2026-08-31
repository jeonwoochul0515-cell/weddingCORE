import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Gavel,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import BrandMark from '@/components/brand/BrandMark';
import { usePageMeta } from '@/lib/usePageMeta';
import { breadcrumbSchema } from '@/lib/schema';

const FEATURES = [
  { icon: Bot, number: '01', title: '반복 문서업무 자동화', body: '고객정보와 보유서류를 바탕으로 F-6, 계약검토, 보완답변 초안을 구조화합니다.' },
  { icon: Gavel, number: '02', title: '변호사 검토 워크플로', body: 'AI 초안은 독립된 변호사 검토 큐를 거쳐 승인되기 전까지 제출할 수 없습니다.' },
  { icon: TimerReset, number: '03', title: '기한·의무 자동 추적', body: '결혼중개업법 의무와 서류 유효기간을 고객별 타임라인에서 놓치지 않게 관리합니다.' },
];

/**
 * 검색·AI 답변에서 인용되도록 질문형 제목과 두괄식 답변으로 쓴다.
 * 아래 FAQPage 스키마를 이 배열에서 그대로 만들어 화면과 어긋날 일이 없다.
 */
const FAQ = [
  {
    q: '국제결혼중개업체가 지켜야 할 법정 의무는 무엇인가요?',
    a: '결혼중개업법상 신상정보 제공, 계약서 교부, 환불기준 명시 등 42개 의무가 계약 단계별로 발생합니다. weddingCORE는 고객을 등록하는 시점에 각 의무와 이행 기한을 고객별 타임라인으로 자동 전개하고, 기한이 임박하면 알립니다.',
  },
  {
    q: 'F-6 결혼이민 비자의 소득요건은 얼마인가요?',
    a: '2026년 기준 2인 가구 연 2,519만원, 4인 가구 연 3,896만원입니다. 전년도 1인당 국민총소득(GNI)에 연동되어 매년 바뀌며 근거는 외교부 재외공관 안내입니다. 가구원수별 충족 여부는 비자 준비도 점검에서 확인할 수 있습니다.',
  },
  {
    q: 'AI가 만든 서류를 그대로 관공서에 제출해도 되나요?',
    a: '제출할 수 없습니다. weddingCORE가 만드는 문서는 모두 초안이며, 변호사가 검토하고 승인하기 전에는 고객 교부나 관공서 제출용으로 표시되지 않습니다. 승인 전 문서에는 제출 금지 표시가 계속 남습니다.',
  },
  {
    q: '중개업체가 F-6 비자 신청을 대신 접수할 수 있나요?',
    a: '출입국 민원 대행은 등록된 대행기관과 변호사만 수행할 수 있습니다. 중개업체가 직접 접수하면 무자격 대행에 해당해 처벌 대상이 됩니다. weddingCORE에서는 제휴 법률사무소가 신청을 수임하고 중개업체는 서류 준비와 고객 안내를 보조합니다. 대행 접수는 2026년 9월 17일부터 시작합니다.',
  },
];

export default function HomePage() {
  usePageMeta({
    title: 'weddingCORE — 국제결혼중개업 AI 업무 자동화',
    description: '국제결혼중개업체의 고객·서류·법정기한 관리와 F-6 결혼이민 비자 준비, 변호사 문서 검토를 하나로 연결합니다.',
    path: '/',
  });

  // 화면의 FAQ 배열에서 그대로 만든다. 홈에만 실려야 하므로 index.html이 아니라 여기 둔다.
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    breadcrumbSchema([{ name: 'weddingCORE', path: '/' }]),
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f3] text-[#102621]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <div className="relative border-b border-emerald-950/10 bg-[#f6f7f3]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(15,159,124,.16),transparent_26rem)]" />
        <header className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="weddingCORE 홈"><BrandMark /></Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <Link to="/visa-simulator" className="hidden text-sm font-semibold text-slate-600 hover:text-emerald-700 sm:block">F-6 준비도 점검</Link>
            <Link to="/login" className="secondary-button !rounded-full !border-emerald-950/10 !bg-white/70 !px-4 !py-2 backdrop-blur">로그인</Link>
            <Link to="/login" className="primary-button !rounded-full !px-4 !py-2">무료로 시작하기 <ArrowRight size={15} /></Link>
          </nav>
        </header>

        <main className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:pb-32 lg:pt-20">
          <div className="max-w-2xl animate-rise">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur">
              <Sparkles size={14} className="text-emerald-500" />국제결혼중개업을 위한 AI 운영체제
            </div>
            <h1 className="text-[42px] font-bold leading-[1.08] tracking-[-0.055em] text-[#102621] sm:text-6xl lg:text-[68px]">
              영업에 집중하세요.<br />복잡한 업무는<br /><span className="text-emerald-600">CORE가 처리합니다.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              고객 등록부터 법정의무, F-6 서류 초안, 변호사 승인까지. 국제결혼중개업의 반복 업무를 하나의 안전한 흐름으로 연결합니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/login" className="primary-button !rounded-full !px-6 !py-3.5">무료 워크스페이스 만들기 <ArrowRight size={17} /></Link>
              <Link to="/visa-simulator" className="secondary-button !rounded-full !px-6 !py-3.5">F-6 준비도 점검</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              {['설치비 0원', '고객 수 제한 없음', '변호사 승인 분리'].map((item) => <span key={item} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" />{item}</span>)}
            </div>
          </div>

          <ProductPreview />
        </main>
      </div>

      <section className="bg-[#102621] px-5 py-8 text-white sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 md:grid-cols-4">
          <Metric value="5종" label="핵심 법률문서 자동화" />
          <Metric value="24/7" label="기한·규제 모니터링" />
          <Metric value="42개" label="결혼중개업법 의무 추적" />
          <Metric value="2단계" label="AI 초안 + 변호사 승인" />
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div><div className="eyebrow">One operating system</div><h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">한 번 입력하고,<br />끝까지 연결합니다.</h2></div>
            <p className="max-w-xl text-base leading-7 text-slate-600 lg:justify-self-end">직원이 같은 정보를 여러 문서에 반복해서 옮기지 않도록 만들었습니다. 모든 작업은 고객 단위로 이어지고, 위험한 판단은 변호사에게 자동으로 넘어갑니다.</p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, number, title, body }) => <div key={number} className="group app-surface rounded-[28px] p-7 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,38,33,.09)]"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={21} /></span><span className="font-mono text-xs text-slate-300">{number}</span></div><h3 className="mt-9 text-xl font-bold tracking-[-0.025em]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{body}</p><div className="mt-6 flex items-center gap-1 text-xs font-bold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">자세히 보기 <ChevronRight size={14} /></div></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8 lg:pb-32">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[36px] bg-[#dff3eb] lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-16"><div className="eyebrow">Human in the loop</div><h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">AI는 초안을 만들고,<br />최종 판단은 사람이 합니다.</h2><p className="mt-5 max-w-md text-sm leading-7 text-slate-600">개인정보 동의 게이트, 테넌트 분리, 감사로그, 변호사 승인까지. 편리함을 위해 안전 경계를 없애지 않았습니다.</p><ul className="mt-8 space-y-3">{['고객 동의 전 AI 처리 차단', '업체와 변호사 권한 완전 분리', '승인 전 교부·제출 금지 표시'].map((item) => <li key={item} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-emerald-700"><Check size={14} /></span>{item}</li>)}</ul></div>
          <div className="relative min-h-80 bg-[#17352e] p-8 sm:p-12"><div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" /><div className="relative space-y-3"><SecurityRow icon={LockKeyhole} title="개인정보 보호" body="동의 증빙과 최소정보 원칙" /><SecurityRow icon={ShieldCheck} title="권한 분리" body="업체·변호사·관리자 역할 격리" /><SecurityRow icon={FileCheck2} title="검토 감사기록" body="생성부터 승인까지 변경 이력" /></div></div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow">Questions</div>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">자주 묻는 질문</h2>
          <dl className="mt-10 space-y-8">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 pb-8 last:border-0">
                <dt className="text-lg font-bold tracking-[-0.02em] text-slate-950">{q}</dt>
                <dd className="mt-3 text-sm leading-7 text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-5 py-20 text-center sm:px-8"><div className="mx-auto max-w-2xl"><Scale className="mx-auto text-emerald-600" /><h2 className="mt-5 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">회사는 영업에 집중하고,<br />CORE는 업무를 지킵니다.</h2><p className="mt-4 text-sm leading-6 text-slate-500">무료 워크스페이스에서 실제 고객 흐름을 시작해 보세요.</p><Link to="/login" className="primary-button mt-8 !rounded-full !px-7 !py-3.5">지금 무료로 시작하기 <ArrowRight size={17} /></Link></div></section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row"><BrandMark /><p className="text-xs text-slate-400">© 2026 weddingCORE · 법률사무소 청송 협업 워크플로 · <Link to="/privacy" className="underline">개인정보처리방침</Link></p></div></footer>
    </div>
  );
}

function ProductPreview() {
  return <div className="relative mx-auto w-full max-w-[620px] animate-rise [animation-delay:120ms]"><div className="absolute -inset-6 rounded-[40px] bg-emerald-300/20 blur-3xl" /><div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-3 shadow-[0_35px_100px_rgba(16,38,33,.18)] backdrop-blur-xl"><div className="flex items-center justify-between border-b border-slate-100 px-3 pb-3"><div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold tracking-wider text-emerald-700">SECURE WORKSPACE</span></div><div className="grid min-h-[430px] grid-cols-[92px_1fr]"><div className="border-r border-slate-100 px-2 py-5"><div className="mb-5 h-5 w-14 rounded-md bg-[#102621]" />{[1,2,3,4,5].map((item) => <div key={item} className={`mb-2 h-8 rounded-lg ${item === 4 ? 'bg-emerald-100' : 'bg-slate-50'}`} />)}</div><div className="p-5"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold text-emerald-700">AI AUTOMATION</div><div className="mt-1 text-base font-bold">오늘의 업무 현황</div></div><div className="rounded-xl border border-slate-100 px-3 py-2 text-right"><div className="text-[8px] text-slate-400">AI 캐럿</div><div className="text-sm font-bold">92 / 100</div></div></div><div className="mt-5 grid grid-cols-3 gap-2">{[['12','진행 고객'],['3','검토 대기'],['0','기한 위반']].map(([v,l]) => <div key={l} className="rounded-xl border border-slate-100 p-3"><div className="text-xl font-bold">{v}</div><div className="mt-1 text-[8px] text-slate-400">{l}</div></div>)}</div><div className="mt-4 rounded-2xl bg-[#f6f8f7] p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold">F-6 신청 패키지</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-bold text-amber-700">변호사 검토 대기</span></div><div className="mt-4 space-y-2">{[94,72,84].map((width, index) => <div key={width} className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-full ${index === 0 ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'}`}>{index === 0 ? <Check size={11} /> : index + 1}</span><span className="h-2 rounded-full bg-slate-200" style={{ width: `${width}%` }} /></div>)}</div></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-100 p-4"><div className="mb-5 grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Bot size={15} /></div><div className="h-2 w-16 rounded bg-slate-700" /><div className="mt-2 h-1.5 w-full rounded bg-slate-100" /></div><div className="rounded-2xl border border-slate-100 p-4"><div className="mb-5 grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-600"><Gavel size={15} /></div><div className="h-2 w-16 rounded bg-slate-700" /><div className="mt-2 h-1.5 w-full rounded bg-slate-100" /></div></div></div></div></div></div>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div className="text-center md:text-left"><div className="text-2xl font-bold tracking-tight text-emerald-300 sm:text-3xl">{value}</div><div className="mt-1 text-[11px] text-slate-400 sm:text-xs">{label}</div></div>; }
function SecurityRow({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) { return <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white backdrop-blur"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><Icon size={19} /></span><div><div className="text-sm font-semibold">{title}</div><div className="mt-0.5 text-xs text-slate-400">{body}</div></div></div>; }
