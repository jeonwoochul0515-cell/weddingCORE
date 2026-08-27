/**
 * F-6 비자 룰 엔진 - 버전/상수 정의
 *
 * 2026년 공개 기준. 매년 새 고시 확인 후 갱신해야 한다.
 * 출처: 외교부 재외공관 2026 결혼이민사증 소득요건 안내(2026-01-05).
 */

export type VisaSimYear = 2026;

export const CURRENT_RULE_YEAR: VisaSimYear = 2026;
export const RULE_SOURCE_URL =
  'https://overseas.mofa.go.kr/jp-yokohama-ko/brd/m_909/view.do?seq=1344102';
export const HOUSEHOLD_INCREMENT_OVER_SEVEN = 5_755_188;

/**
 * 가구원수별 연소득 기준 (원). 전년도 1인당 GNI 대비 계산.
 */
export const INCOME_THRESHOLDS: Record<VisaSimYear, Record<number, number>> = {
  2026: {
    2: 25_195_752,
    3: 32_154_216,
    4: 38_968_428,
    5: 45_340_314,
    6: 51_335_712,
    7: 57_090_900,
  },
};

/** 재산의 소득 환산 연 이율 (5%) */
export const PROPERTY_TO_INCOME_RATE = 0.05;

/** 배우자 본국법상 최저 혼인연령 (국제사법 §63) */
export const MIN_MARRIAGE_AGE_BY_COUNTRY: Record<string, { male: number; female: number }> = {
  VN: { male: 20, female: 18 }, // 베트남
  KH: { male: 18, female: 18 }, // 캄보디아
  CN: { male: 22, female: 20 }, // 중국
  UZ: { male: 18, female: 18 }, // 우즈베키스탄
  PH: { male: 18, female: 18 }, // 필리핀
  TH: { male: 17, female: 17 }, // 태국
  KR: { male: 18, female: 18 }, // 한국
  OTHER: { male: 18, female: 18 },
};

export const SUPPORTED_COUNTRIES = [
  { code: 'VN', ko: '베트남', en: 'Vietnam' },
  { code: 'KH', ko: '캄보디아', en: 'Cambodia' },
  { code: 'CN', ko: '중국', en: 'China' },
  { code: 'UZ', ko: '우즈베키스탄', en: 'Uzbekistan' },
  { code: 'PH', ko: '필리핀', en: 'Philippines' },
  { code: 'TH', ko: '태국', en: 'Thailand' },
  { code: 'OTHER', ko: '기타', en: 'Other' },
] as const;
