// 화면에서 쓰는 상품·금액 정의
//
// 서버(functions/src/domain/pricing.ts)와 값이 반드시 같아야 한다. 두 빌드가 분리되어
// 있어 한 파일을 공유할 수 없으므로 visaTracks와 같은 방식으로 미러를 두고
// `npm run check:tracks`가 배포 전에 대조한다.
//
// 어긋나면 무슨 일이 생기나. 화면에 적힌 금액과 서버가 만드는 주문 금액이 달라지고,
// packId가 어긋나면 「계좌이체로 신청」이 보안 규칙에서 통째로 거부된다
// (2026-09-05 점검에서 실제로 발견된 형태다).

export const CARAT_PACKS = {
  pack_110: { label: '110캐럿', carats: 110, amount: 110_000, discountNote: null },
  pack_330: { label: '330캐럿', carats: 330, amount: 300_000, discountNote: '9% 할인' },
  pack_550: { label: '550캐럿', carats: 550, amount: 480_000, discountNote: '13% 할인' },
} as const;

export type CaratPackId = keyof typeof CARAT_PACKS;

/** 화면이 목록으로 돌리기 좋게 배열로도 낸다. 순서는 금액 오름차순이다. */
export const CARAT_PACK_LIST = (Object.entries(CARAT_PACKS) as Array<
  [CaratPackId, (typeof CARAT_PACKS)[CaratPackId]]
>).map(([id, pack]) => ({ id, ...pack }));

/**
 * 마케팅 서비스의 결제 금액. 라벨은 토스 결제창과 영수증에 그대로 찍힌다.
 * 화면 카드의 제목·설명·특전 문구는 MarketingCenterPage가 따로 들고 있고,
 * 여기 있는 것은 "돈이 오가는 값"뿐이다.
 */
export const MARKETING_SERVICES = {
  'naver-seo': { label: '네이버 검색노출·플레이스 광고 최적화', amount: 500_000, billing: 'once' },
  'local-content': { label: '블로그 글 자동 발행 (월 8건 · 1개월분)', amount: 100_000, billing: 'monthly' },
  'aeo-geo': { label: 'AI 검색 노출 콘텐츠 설계', amount: 500_000, billing: 'once' },
} as const;

export type MarketingId = keyof typeof MARKETING_SERVICES;

export const won = (value: number) => `${value.toLocaleString()}원`;
