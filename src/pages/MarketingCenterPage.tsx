import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  BarChart3,
  CheckCircle2,
  Compass,
  Globe2,
  LayoutTemplate,
  MapPinned,
  Megaphone,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

const SERVICES = [
  {
    id: 'website',
    title: '전환형 홈페이지 제작',
    description: '상담 신청까지 이어지는 모바일 중심 홈페이지를 기획·제작합니다.',
    icon: LayoutTemplate,
    items: ['업체 신뢰정보 설계', '상담 전환 동선', '모바일·속도 최적화'],
  },
  {
    id: 'naver-seo',
    title: '네이버 검색 노출 최적화',
    description: '검색로봇이 사이트를 정확히 이해하도록 기술·콘텐츠 기반을 정비합니다.',
    icon: Search,
    items: ['서치어드바이저 등록', '키워드·메타데이터', '사이트맵·색인 점검'],
  },
  {
    id: 'local-content',
    title: '지역·콘텐츠 마케팅',
    description: '지역 고객이 실제로 검색하는 질문을 중심으로 콘텐츠를 운영합니다.',
    icon: MapPinned,
    items: ['지역 키워드 전략', '블로그 콘텐츠 캘린더', '업체 정보 일관성 점검'],
  },
  {
    id: 'aeo-geo',
    title: 'AEO·GEO 콘텐츠 설계',
    description: '검색 답변과 AI 검색에서 인용되기 쉬운 전문 콘텐츠 구조를 만듭니다.',
    icon: Sparkles,
    items: ['질문형 FAQ', '구조화된 답변', '전문성·출처 강화'],
  },
] as const;

const CHECKLIST = [
  { label: '회사 기본정보와 등록번호 공개', done: true },
  { label: '상담 전환 버튼과 연락 경로 점검', done: true },
  { label: '네이버 서치어드바이저 소유 확인', done: false },
  { label: '핵심 서비스별 검색 페이지 제작', done: false },
  { label: '월간 콘텐츠 발행 계획 수립', done: false },
];

export default function MarketingCenterPage() {
  const agencyId = useAuthStore((state) => state.user?.agencyId);
  const [selectedServices, setSelectedServices] = useState<string[]>(['naver-seo']);
  const [keywords, setKeywords] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const completed = useMemo(() => CHECKLIST.filter((item) => item.done).length, []);
  const score = Math.round((completed / CHECKLIST.length) * 100);

  function toggleService(id: string) {
    setSelectedServices((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!agencyId || selectedServices.length === 0) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await addDoc(collection(db, `agencies/${agencyId}/marketingRequests`), {
        agencyId,
        services: selectedServices,
        keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean),
        note: note.trim(),
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setKeywords('');
      setNote('');
      setNotice({ ok: true, text: '마케팅 상담 요청이 접수되었습니다.' });
    } catch (error) {
      setNotice({ ok: false, text: `접수하지 못했습니다: ${(error as Error).message}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#102621_0%,#17493c_100%)] px-6 py-8 text-white shadow-[0_20px_50px_rgba(16,38,33,.16)] sm:px-8 sm:py-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300">
              <Megaphone size={14} /> Marketing center
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
              검색되는 홈페이지를 만들고<br className="hidden sm:block" /> 상담으로 연결합니다
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              홈페이지 제작부터 네이버 검색 기반 정비, 지역 콘텐츠, AEO·GEO까지 한곳에서 신청하고 진행상황을 관리하세요.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur">
            <div className="flex items-center justify-between text-xs text-slate-300"><span>검색 준비도</span><span>{score}점</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${score}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-slate-400">기본 설정 {completed}/{CHECKLIST.length}개 완료</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><div className="eyebrow">Growth services</div><h2 className="mt-1 text-xl font-bold text-slate-950">필요한 마케팅 업무를 선택하세요</h2></div>
          <Globe2 className="text-emerald-700" size={22} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map(({ id, title, description, icon: Icon, items }) => {
            const selected = selectedServices.includes(id);
            return (
              <button key={id} type="button" onClick={() => toggleService(id)} className={`app-surface rounded-[22px] p-5 text-left transition ${selected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'hover:-translate-y-0.5 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={21} /></span>{selected && <CheckCircle2 className="text-emerald-600" size={20} />}</div>
                <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
                <ul className="mt-4 space-y-2">{items.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{item}</li>)}</ul>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.88fr_1.12fr]">
        <section className="app-surface rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="eyebrow">Readiness</div><h2 className="mt-1 text-lg font-bold text-slate-950">네이버 검색 준비 체크</h2></div><Compass className="text-emerald-700" size={21} /></div>
          <div className="mt-5 space-y-3">
            {CHECKLIST.map((item) => <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"><span className={`grid h-6 w-6 place-items-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-300 ring-1 ring-slate-200'}`}><CheckCircle2 size={15} /></span><span className={`text-sm ${item.done ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{item.label}</span></div>)}
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            검색 순위는 네이버 알고리즘과 경쟁 상황에 따라 달라지므로 특정 순위를 보장하지 않습니다. 비정상 트래픽이나 조작 대신 공식 가이드에 맞춘 지속 가능한 노출 개선을 진행합니다.
          </div>
        </section>

        <section className="app-surface rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="eyebrow">Request</div><h2 className="mt-1 text-lg font-bold text-slate-950">마케팅 상담 요청</h2></div><BarChart3 className="text-emerald-700" size={21} /></div>
          <form onSubmit={submitRequest} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">목표 검색어</label>
              <input className="field-control" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="예: 부산 국제결혼, 베트남 결혼중개, F-6 비자" />
              <p className="mt-1 text-[11px] text-slate-400">여러 검색어는 쉼표로 구분하세요.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">현재 상황과 목표</label>
              <textarea className="field-control min-h-32 resize-y" value={note} onChange={(event) => setNote(event.target.value)} placeholder="현재 홈페이지 주소, 주요 지역, 원하는 상담 건수 등을 적어주세요." />
            </div>
            {notice && <div className={`rounded-xl border px-3.5 py-3 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div>}
            <button className="primary-button w-full !py-3" disabled={!agencyId || selectedServices.length === 0 || submitting}><Send size={16} />{submitting ? '접수 중' : '상담 요청 접수'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
