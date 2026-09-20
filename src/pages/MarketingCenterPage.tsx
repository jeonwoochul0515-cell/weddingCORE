// 홈페이지·검색노출·콘텐츠 마케팅 상품을 고르고 견적과 함께 상담을 접수하는 화면
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { monthlyFunnel, useAgencyLeads } from '@/features/leads/useAgencyLeads';
import {
  BarChart3,
  CheckCircle2,
  Compass,
  ClipboardList,
  Copy,
  Globe2,
  Inbox,
  LayoutTemplate,
  PenLine,
  Megaphone,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useCheckout } from '@/features/payments/useCheckout';
import { MARKETING_SERVICES } from '@/domain/pricing';
import {
  MARKETING_STATUS_LABEL,
  useMarketingRequests,
} from '@/features/marketing/useMarketingRequests';

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
    listPrice: MARKETING_SERVICES['naver-seo'].amount,
    promoPrice: MARKETING_SERVICES['naver-seo'].amount,
    billing: 'once',
    benefit: null,
    priceNote: '초기 세팅 1회 · 네이버에 내는 광고비는 별도 실비',
  },
  {
    id: 'local-content',
    title: '블로그 글 자동 발행',
    description: '업체 홈페이지에 글 8건이 매달 자동으로 올라가고, 네이버 블로그용 원고를 따로 받습니다.',
    icon: PenLine,
    items: ['홈페이지 자동 발행 월 8건', '네이버 블로그용 원고 8건 별도 작성', '원고 나오면 문자로 알림'],
    listPrice: MARKETING_SERVICES['local-content'].amount,
    promoPrice: MARKETING_SERVICES['local-content'].amount,
    billing: 'monthly',
    benefit: null,
    priceNote: '같은 내용을 두 벌로 다르게 씁니다(유사문서 회피) · 블로그 게시는 업주가 직접 · 자동이체가 아니라 달마다 결제',
  },
  {
    id: 'aeo-geo',
    title: 'AI 검색 노출 콘텐츠 설계',
    description: '검색 답변과 AI 검색에서 인용되기 쉬운 전문 콘텐츠 구조를 만듭니다.',
    icon: Sparkles,
    items: ['질문형 FAQ', '구조화된 답변', '전문성·출처 강화'],
    listPrice: 1_200_000,
    promoPrice: MARKETING_SERVICES['aeo-geo'].amount,
    billing: 'once',
    benefit: 'promotion',
    priceNote: '핵심 질문 20개 구조화 · 스키마 적용 포함',
  },
] as const;

const won = (value: number) => `${value.toLocaleString()}원`;

/**
 * 홈페이지 빠른 점검 위젯. 손님이 이름을 밝히기 전에 7문항으로 "나도 되나"를 확인하고,
 * 결과를 본 뒤 성함·연락처만 남긴다. 접수는 업체 전화로 문자가 가고 leads에 쌓인다.
 * 업체 사이트마다 기술이 달라 iframe으로 준다. 바깥 스크립트는 높이만 맞춘다.
 */
const EMBED_ORIGIN = 'https://weddingcore.net';

function embedUrl(agencyId: string, agencyName: string) {
  return EMBED_ORIGIN + '/embed/check?agency=' + encodeURIComponent(agencyId) + '&name=' + encodeURIComponent(agencyName);
}

function embedSnippet(agencyId: string, agencyName: string) {
  const src = embedUrl(agencyId, agencyName);
  return [
    '<iframe src="' + src + '" title="국제결혼 요건 빠른 점검" style="width:100%;min-height:760px;border:0" loading="lazy"></iframe>',
    '<script>window.addEventListener("message",function(e){if(e.origin!=="' + EMBED_ORIGIN + '")return;var d=e.data||{};' +
      'if(d.type==="weddingcore-check:height"){var f=document.querySelector(\'iframe[src^="' + EMBED_ORIGIN + '/embed/check"]\');if(f)f.style.height=d.height+"px";}});</script>',
  ].join('\n');
}



/**
 * 검색에 잡히기 위해 갖출 것. 업체마다 어디까지 돼 있는지는 시스템이 알 수 없으므로
 * 완료 표시나 점수를 매기지 않는다. 상담 요청이 오면 사람이 함께 확인한다.
 */
const SEARCH_STEPS = [
  '회사 기본정보와 등록번호를 홈페이지에 공개',
  '상담 신청 버튼과 전화 연결이 휴대폰에서 바로 되는지 점검',
  '네이버 서치어드바이저에 홈페이지 소유 확인',
  '핵심 서비스마다 검색용 페이지 제작',
  '달마다 글을 올리는 계획 세우기',
];

export default function MarketingCenterPage() {
  const agencyId = useAuthStore((state) => state.user?.agencyId);
  const [selectedServices, setSelectedServices] = useState<string[]>(['naver-seo']);
  const [keywords, setKeywords] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const checkout = useCheckout();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [agency, setAgency] = useState<{ name: string; phone: string }>({ name: '', phone: '' });
  const { items: leads } = useAgencyLeads();
  const funnel = useMemo(() => monthlyFunnel(leads), [leads]);
  const [copied, setCopied] = useState(false);
  // 낸 신청이 어떻게 됐는지. 결제하고도 화면에 흔적이 없으면 같은 신청을 또 넣게 된다.
  const { items: requests } = useMarketingRequests();

  useEffect(() => {
    if (!agencyId) return;
    void getDoc(doc(db, 'agencies', agencyId))
      .then((snap) => {
        const data = snap.data();
        setAgency({ name: String(data?.name ?? ''), phone: String(data?.phone ?? '') });
      })
      .catch(() => {});
  }, [agencyId]);

  const snippet = agencyId ? embedSnippet(agencyId, agency.name) : '';

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드를 못 쓰는 환경. 글상자에서 직접 복사하면 된다. */
    }
  }
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
              홈페이지 제작부터 네이버 검색 기반 정비, 지역 콘텐츠, AI 검색 노출까지 한곳에서 신청하고 진행상황을 관리하세요.
            </p>
            <div className="mt-5 space-y-2">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2.5 text-xs text-emerald-100">
                <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-bold text-[#102621]">{MEMBERSHIP.label}</span>
                <span className="font-semibold">홈페이지 제작 무료</span>
                <span className="text-emerald-200/70">· {MEMBERSHIP.detail}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs text-slate-300">
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">{PROMOTION.label}</span>
                <span className="font-semibold">AI 검색 노출 설계 58% 할인</span>
                <span className="text-slate-400">· {PROMOTION.detail}</span>
              </div>
            </div>
          </div>
          {/* 예전엔 고정 "준비도 40점"이 모든 업체에 똑같이 떴다. 진짜 숫자인 이번 달 접수 실적을 보여 준다 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur">
            <div className="text-xs text-slate-300">이번 달 접수</div>
            <div className="mt-1 text-3xl font-bold tracking-[-0.04em] text-white">{funnel.received}건</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">연락함 {funnel.contacted} · 고객 등록 {funnel.converted} · 전환율 {funnel.rate}%</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><div className="eyebrow">마케팅 상품</div><h2 className="mt-1 text-xl font-bold text-slate-950">필요한 마케팅 업무를 선택하세요</h2></div>
          <Globe2 className="text-emerald-700" size={22} />
        </div>
        {!checkout.ready && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">
            카드 결제는 아직 준비 중입니다. 아래에서 상담 요청을 접수해 주시면 담당자가 연락드립니다.
          </p>
        )}
        {checkout.error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-700">{checkout.error}</p>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map(({ id, title, description, icon: Icon, items, listPrice, promoPrice, billing, priceNote, benefit }) => {
            const selected = selectedServices.includes(id);
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => toggleService(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleService(id);
                  }
                }}
                className={`app-surface cursor-pointer rounded-[22px] p-5 text-left transition ${selected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'hover:-translate-y-0.5 hover:border-slate-300'}`}
              >
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
                {/* 유료 서비스만 바로 결제할 수 있다. 홈페이지 제작은 회원 무료다. */}
                {promoPrice > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      checkout.start('marketing', id);
                    }}
                    disabled={!checkout.ready || checkout.pending !== null}
                    className="primary-button mt-3 w-full justify-center !py-2"
                  >
                    {checkout.pending === id ? '결제창 여는 중…' : '카드로 결제'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {requests.length > 0 && (
        <section className="app-surface rounded-[24px] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="eyebrow">신청 내역</div>
              <h2 className="mt-1 text-lg font-bold text-slate-950">내가 낸 신청 {requests.length}건</h2>
            </div>
            <ClipboardList className="text-emerald-700" size={21} />
          </div>
          <ul className="space-y-2">
            {requests.map((item) => {
              const status = MARKETING_STATUS_LABEL[item.status] ?? MARKETING_STATUS_LABEL.requested!;
              const titles = item.services
                .map((id) => SERVICES.find((s) => s.id === id)?.title ?? id)
                .join(', ');
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{titles || '마케팅 상담'}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ko-KR') : ''}
                      {item.paid && item.paidAmount
                        ? ` · ${won(item.paidAmount)} 결제됨${item.billing === 'monthly' ? ' (월)' : ''}`
                        : ' · 상담 요청'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {item.paid && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">결제완료</span>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>{status.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-4 text-slate-400">
            결제한 신청은 담당자가 먼저 처리합니다. 진행 상황은 사무실(1660-4452)로 문의해 주세요.
          </p>
        </section>
      )}

      <section className="app-surface rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><div className="eyebrow">홈페이지 위젯</div><h2 className="mt-1 text-lg font-bold text-slate-950">홈페이지 요건 점검 위젯</h2></div><Inbox className="text-emerald-700" size={21} /></div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          손님의 첫 질문은 "나도 될까"입니다. 이 점검을 홈페이지에 두면 손님이 이름을 밝히기 전에 7문항으로 먼저 확인하고,
          결과를 본 뒤 성함·연락처만 남깁니다. 접수는 업체 전화{agency.phone ? '(' + agency.phone + ')' : ''}로 문자가 가고 아래 목록에 쌓입니다.
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-700">홈페이지에 넣기</div>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              홈페이지를 저희가 만들었다면 말씀만 주시면 넣어 드립니다. 직접 관리하는 홈페이지라면 아래 「삽입 코드 복사」를 누른 뒤
              홈페이지 관리자에게 전달하거나 편집기의 원하는 자리에 붙여 넣으면 됩니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={copySnippet} disabled={!snippet} className="primary-button !px-4 !py-2 text-xs"><Copy size={13} />{copied ? '복사됐습니다' : '삽입 코드 복사'}</button>
              {agencyId && <a href={embedUrl(agencyId, agency.name)} target="_blank" rel="noreferrer" className="secondary-button !px-4 !py-2 text-xs">새 창에서 미리 보기</a>}
            </div>
            {/* 코드는 대표가 읽을 것이 아니라 홈페이지 관리자에게 넘길 것이다. 기본으로 접어 둔다. */}
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] text-slate-400">코드 직접 보기 (홈페이지 관리자용)</summary>
              <textarea readOnly value={snippet} className="field-control mt-2 min-h-40 font-mono text-[11px] leading-5" onFocus={(event) => event.currentTarget.select()} />
            </details>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-slate-700">이번 달 성과</div>
            {/* 접수 처리는 고객 관리의 접수 탭에서 한다. 여기는 마케팅 돈을 낸 사람이 결과를 보는 자리다 */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: '접수', value: funnel.received },
                { label: '연락함', value: funnel.contacted },
                { label: '고객 등록', value: funnel.converted },
                { label: '전환율', value: funnel.rate + '%' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                  <div className="text-[11px] text-slate-500">{item.label}</div>
                  <div className="mt-0.5 text-xl font-bold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">
              누적 접수 {leads.length}건. 전화·상담·고객 등록은 <Link to="/agency/clients?tab=leads" className="font-semibold text-emerald-700 underline">고객 관리 → 접수 탭</Link>에서 처리합니다. 접수가 들어오면 문자로도 알립니다.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.88fr_1.12fr]">
        <section className="app-surface rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="eyebrow">검색 준비</div><h2 className="mt-1 text-lg font-bold text-slate-950">네이버 검색 준비 체크</h2></div><Compass className="text-emerald-700" size={21} /></div>
          <p className="mt-3 text-sm leading-6 text-slate-600">검색에 잡히려면 이 다섯 가지가 필요합니다. 어디까지 돼 있는지는 아래 상담 요청을 보내 주시면 함께 확인합니다.</p>
          <ol className="mt-4 space-y-2">
            {SEARCH_STEPS.map((label, index) => <li key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-emerald-700 ring-1 ring-slate-200">{index + 1}</span><span className="text-sm text-slate-700">{label}</span></li>)}
          </ol>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            검색 순위는 네이버 알고리즘과 경쟁 상황에 따라 달라지므로 특정 순위를 보장하지 않습니다. 비정상 트래픽이나 조작 대신 공식 가이드에 맞춘 지속 가능한 노출 개선을 진행합니다.
          </div>
        </section>

        <section className="app-surface rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="eyebrow">상담 요청</div><h2 className="mt-1 text-lg font-bold text-slate-950">마케팅 상담 요청</h2></div><BarChart3 className="text-emerald-700" size={21} /></div>
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
                AI 검색 노출 설계 할인은 {PROMOTION.note} 최종 금액은 상담 후 확정됩니다.
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
