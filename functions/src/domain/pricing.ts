// 상품과 금액의 정본(定本). 값이 필요한 곳은 전부 여기를 import 한다.
//
// 왜 한 곳인가. 예전에는 같은 숫자가 네 군데 흩어져 있었다 —
// payments/toss.ts, automation/index.ts, AutomationCenterPage.tsx, firestore.rules.
// 2026-09-05 점검에서 화면의 packId와 규칙의 목록이 어긋나 「계좌이체로 신청」이
// 항상 거부되는 것을 발견했다. 값이 맞는 것과 정본이 있는 것은 다른 문제다.
// 지금 맞는 값도 다음에 가격을 바꾸면 또 어긋난다.
//
// firestore.rules만은 파일 형식상 import가 안 된다. 그쪽 packId 목록을 바꿀 때는
// 이 파일의 CARAT_PACK_IDS와 같은지 확인해야 한다.

/** 캐럿 팩. 1캐럿 = 1,000원이고 대량 구매에만 할인을 준다. */
export const CARAT_PACKS = {
  pack_110: { label: '110캐럿', carats: 110, amount: 110_000, discountNote: null },
  pack_330: { label: '330캐럿', carats: 330, amount: 300_000, discountNote: '9% 할인' },
  pack_550: { label: '550캐럿', carats: 550, amount: 480_000, discountNote: '13% 할인' },
} as const;

export type CaratPackId = keyof typeof CARAT_PACKS;

/** firestore.rules의 packId 목록과 같아야 한다. */
export const CARAT_PACK_IDS = Object.keys(CARAT_PACKS) as CaratPackId[];

export const isCaratPack = (value: string): value is CaratPackId => value in CARAT_PACKS;

/**
 * 마케팅 서비스. 라벨은 토스 결제창과 영수증에 그대로 찍힌다.
 * 화면(MarketingCenterPage)의 제목과 같아야 손님이 무엇을 샀는지 헷갈리지 않는다.
 */
export const MARKETING_SERVICES = {
  'naver-seo': {
    label: '네이버 검색노출·플레이스 광고 최적화',
    amount: 500_000,
    billing: 'once',
  },
  // 월 10만원짜리다. 이름에 기간을 넣지 않으면 토스 결제창과 영수증에 그냥
  // "블로그 글 자동 발행 100,000원"으로만 떠서 1회성으로 오해한다.
  // 정기결제(빌링)는 아직 없어서 매달 다시 결제해야 한다.
  'local-content': {
    label: '블로그 글 자동 발행 (월 8건 · 1개월분)',
    amount: 100_000,
    billing: 'monthly',
  },
  'aeo-geo': {
    label: 'AI 검색 노출 콘텐츠 설계',
    amount: 500_000,
    billing: 'once',
  },
  // website(홈페이지 제작)는 회원 무료라 결제 대상이 아니다.
} as const;

export type MarketingId = keyof typeof MARKETING_SERVICES;

export const isMarketing = (value: string): value is MarketingId => value in MARKETING_SERVICES;
