// 홈페이지·검색노출·콘텐츠 마케팅 상품을 고르고 견적과 함께 상담을 접수하는 화면
import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  BarChart3,
  CheckCircle2,
  Compass,
  Globe2,
  LayoutTemplate,
  PenLine,
  Megaphone,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';

/**
 * 초기 프로모션. 정가는 2026년 국내 시세(홈페이지 제작 150만~800만원, 블로그·콘텐츠
 * 대행 월 30만~150만원)를 참고해 중하단 구간으로 잡고, 도입 초기 업체에는
 * 아래 할인가를 적용한다. 종료 조건과 금액은 운영 정책에 따라 변경한다.
 */
const PROMOTION = {
  label: '오픈 프로모션',
  detail: '선착순 20개 업체 한정',
  note: '선착순 소진 시 정가로 전환됩니다.',
};

const MEMBERSHIP = {
  label: '회원 상시 혜택',
  detail: '가입 업체는 기간 제한 없이 적용',
};

const SERVICES = [
  {
    id: 'website',
    title: '전환형 홈페이지 제작',
    description: '상담 신청까지 이어지는 모바일 중심 홈페이지를 기획·제작합니다.',
    icon: LayoutTemplate,
    items: ['업체 신뢰정보 설계', '상담 전환 동선', '모바일·속도 최적화'],
    listPrice: 2_900_000,
    promoPrice: 0,
    billing: 'once',
    benefit: 'membership',
    priceNote: '회원이면 언제든 제작비 없음 · 도메인/호스팅 실비만 별도',
  },
  {
    id: 'naver-seo',
    title: '네이버 검색노출·플레이스 광고 최적화',
    description: '검색결과에 사이트가 잡히게 하고, 지도·플레이스에서 업체가 노출되도록 정비합니다.',
    icon: Search,
    items: ['서치어드바이저 등록·색인 점검', '스마트플레이스 업체정보 정비', '플레이스 광고 세팅·입찰 관리'],
    listPrice: 500_000,
    promoPrice: 500_000,
    billing: 'once',
    benefit: null,
    priceNote: '초기 세팅 1회 · 네이버에 내는 광고비는 별도 실비',
  },
  {
    id: 'local-content',
    title: '블로그 글 자동 발행',
    description: '업체 홈페이지에 지역·업종 검색용 글이 매달 자동으로 올라갑니다.',
    icon: PenLine,
    items: ['지역·업종 키워드 자동 선정', '홈페이지에 글 자동 발행', '네이버 블로그용 원고 함께 제공'],
    listPrice: 100_000,
    promoPrice: 100_000,
    billing: 'monthly',
    benefit: null,
    priceNote: '네이버 블로그 게시는 업주가 직접 옮겨 적는 조건',
  },
  {
    id: 'aeo-geo',
    title: 'AEO·GEO 콘텐츠 설계',
    description: '검색 답변과 AI 검색에서 인용되기 쉬운 전문 콘텐츠 구조를 만듭니다.',
    icon: Sparkles,
    items: ['질문형 FAQ', '구조화된 답변', '전문성·출처 강화'],
    listPrice: 1_200_000,
    promoPrice: 500_000,
    billing: 'once',
    benefit: 'promotion',
    priceNote: '핵심 질문 20개 구조화 · 스키마 적용 포함',
  },
] as const;

const won = (value: number) => `${value.toLocaleString()}원`;

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
  const quote = useMemo(() => {
    const picked = SERVICES.filter((service) => selectedServices.includes(service.id));
    const sum = (billing: string, key: 'promoPrice' | 'listPrice') =>
      picked.filter((service) => service.billing === billing).reduce((total, service) => total + service[key], 0);
    return {
      picked,
      onceTotal: sum('once', 'promoPrice'),
      monthlyTotal: sum('monthly', 'promoPrice'),
      onceList: sum('once', 'listPrice'),
      monthlyList: sum('monthly', 'listPrice'),
    };
  }, [selectedServices]);
  const discount = quote.onceList - quote.onceTotal + (quote.monthlyList - quote.monthlyTotal);

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
        quote: {
          promotion: PROMOTION.label,
          onceTotal: quote.onceTotal,
          monthlyTotal: quote.monthlyTotal,
          currency: 'KRW',
          vatIncluded: true,
        },
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
            <div className="mt-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2.5 text-xs text-emerald-100">
                <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-bold text-[#102621]">{MEMBERSHIP.label}</span>
                <span className="font-semibold">홈페이지 제작 무료</span>
                <span className="text-emerald-200/70">· {MEMBERSHIP.detail}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs text-slate-300">
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">{PROMOTION.label}</span>
                <span className="font-semibold">AEO·GEO 설계 58% 할인</span>
                <span className="text-slate-400">· {PROMOTION.detail}</span>
              </div>
            </div>
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
          {SERVICES.map(({ id, title, description, icon: Icon, items, listPrice, promoPrice, billing, priceNote, benefit }) => {
            const selected = selectedServices.includes(id);
            return (
              <button key={id} type="button" onClick={() => toggleService(id)} className={`app-surface rounded-[22px] p-5 text-left transition ${selected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'hover:-translate-y-0.5 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={21} /></span>{selected && <CheckCircle2 className="text-emerald-600" size={20} />}</div>
                {benefit && (
                  <span className={`mt-4 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${benefit === 'membership' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}>
                    {benefit === 'membership' ? MEMBERSHIP.label : PROMOTION.label}
                  </span>
                )}
                <h3 className={`font-bold text-slate-950 ${benefit ? 'mt-2' : 'mt-4'}`}>{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
                <ul className="mt-4 space-y-2">{items.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{item}</li>)}</ul>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${promoPrice === 0 ? 'text-emerald-600' : 'text-slate-950'}`}>{promoPrice === 0 ? '무료' : won(promoPrice)}</span>
                    {promoPrice < listPrice && <span className="text-xs text-slate-400 line-through">{won(listPrice)}</span>}
                    {promoPrice > 0 && <span className="text-[10px] font-bold text-emerald-700">{billing === 'monthly' ? '월' : '1회'}</span>}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">{priceNote}</p>
                </div>
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">선택 항목 예상 견적</span>
                {quote.picked.some((service) => service.benefit === 'promotion') && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{PROMOTION.label} 적용</span>
                )}
              </div>
              {quote.picked.length === 0 && <p className="mt-3 text-xs text-slate-500">위에서 필요한 서비스를 선택하면 견적이 계산됩니다.</p>}
              {quote.picked.length > 0 && (
                <>
                  <ul className="mt-3 space-y-1.5">
                    {quote.picked.map((service) => (
                      <li key={service.id} className="flex items-center justify-between text-xs text-slate-600">
                        <span>{service.title}</span>
                        <span className="font-semibold text-slate-800">{service.promoPrice === 0 ? '무료' : `${won(service.promoPrice)}${service.billing === 'monthly' ? ' / 월' : ''}`}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                    {quote.onceTotal > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-600">초기 비용</span><span className="font-bold text-slate-950">{won(quote.onceTotal)}</span></div>}
                    {quote.monthlyTotal > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-600">월 운영비</span><span className="font-bold text-slate-950">{won(quote.monthlyTotal)}</span></div>}
                    {discount > 0 && <div className="flex items-center justify-between text-xs text-emerald-700"><span>프로모션 할인</span><span className="font-semibold">-{won(discount)}</span></div>}
                  </div>
                </>
              )}
              <p className="mt-3 text-[11px] leading-4 text-slate-400">
                부가세 포함 금액입니다. 홈페이지 제작은 회원 상시 혜택이라 기간 제한이 없고,
                AEO·GEO 할인은 {PROMOTION.note} 최종 금액은 상담 후 확정됩니다.
              </p>
            </div>
            {notice && <div className={`rounded-xl border px-3.5 py-3 text-sm ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.text}</div>}
            <button className="primary-button w-full !py-3" disabled={!agencyId || selectedServices.length === 0 || submitting}><Send size={16} />{submitting ? '접수 중' : '상담 요청 접수'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
