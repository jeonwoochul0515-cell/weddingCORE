/**
 * F-6 비자 룰 엔진 - 버전/상수 정의
 *
 * 2024년 기준 (2023 GNI 연동). 법무부 체류관리 지침 참조.
 * ⚠ 매년 갱신 필요. 창희 변호사 검수 후 정식 반영.
 */

export type VisaSimYear = 2024 | 2025;

export const CURRENT_RULE_YEAR: VisaSimYear = 2024;

/**
 * 가구원수별 연소득 기준 (원). 전년도 1인당 GNI 대비 계산.
 */
export const INCOME_THRESHOLDS: Record<VisaSimYear, Record<number, number>> = {
  2024: {
    2: 21_546_000,
    3: 27_938_000,
    4: 34_337_000,
    5: 40_737_000,
    6: 46_186_000,
    7: 51_635_000,
  },
  2025: {
    // TODO: 2025년 GNI 발표 후 갱신
    2: 22_500_000,
    3: 29_200_000,
    4: 35_900_000,
    5: 42_600_000,
    6: 48_300_000,
    7: 54_000_000,
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
