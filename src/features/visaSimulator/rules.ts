/**
 * F-6 결혼이민 비자 요건 규칙 (requirementSet: 'f6_income')
 *
 * 이 파일은 결혼 트랙 전용이다. 유학 비자는 소득이 아니라 학비·체재비 잔고가 기준이고,
 * 체류 연장은 또 다른 기준을 쓴다. 다른 사업의 요건을 여기에 섞지 말고
 * requirementSet을 새로 만들어 분리할 것 (domain/visaTracks.ts 참조).
 *
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

/**
 * 상대 나라가 한국인 초청인에게 따로 요구하는 조건. F-6 이전에 현지 혼인등록 단계에서 걸린다.
 *
 * 캄보디아 — 외교부 규정(2011)으로 만 50세 미만·월소득 기준이 생겼으나, **나이 제한은 폐지됐다**
 * (주시엠립 대한민국 분관 2021-11-11 안내 "외국인의 연령(만 50세) 제한 규정이 폐지됨").
 * 월소득 **USD 2,500 이상** 규정만 남아 있다(같은 안내, 주캄보디아 대사관 2025-02-18 게시
 * "월소득 $2,500불 이상"). 2026-09-04에 넣었던 "만 50세 미만·2,550달러"는 낡은 수치였다(2026-09-05 정정).
 */
export const COUNTRY_SPONSOR_RULES: Record<
  string,
  { maxSponsorAgeExclusive?: number; minMonthlyIncomeUsd: number; source: string; sourceUrl: string }
> = {
  KH: {
    minMonthlyIncomeUsd: 2_500,
    source: '주캄보디아 대한민국 대사관 국제결혼 절차 안내(2025-02-18) · 주시엠립 분관 나이제한 폐지 안내(2021-11-11)',
    sourceUrl: 'https://overseas.mofa.go.kr/kh-ko/brd/m_3100/view.do?seq=938666',
  },
};

/**
 * 달러 기준 규정을 원화 소득과 견주기 위한 참고 환율. 실제 심사는 증빙 시점 환율을 쓰므로
 * 이 값으로 계산한 결과는 참고치다. 크게 바뀌면 갱신한다.
 */
export const USD_KRW_REFERENCE = 1_370;

export const SUPPORTED_COUNTRIES = [
  { code: 'VN', ko: '베트남', en: 'Vietnam' },
  { code: 'KH', ko: '캄보디아', en: 'Cambodia' },
  { code: 'CN', ko: '중국', en: 'China' },
  { code: 'UZ', ko: '우즈베키스탄', en: 'Uzbekistan' },
  { code: 'PH', ko: '필리핀', en: 'Philippines' },
  { code: 'TH', ko: '태국', en: 'Thailand' },
  { code: 'OTHER', ko: '기타', en: 'Other' },
] as const;
