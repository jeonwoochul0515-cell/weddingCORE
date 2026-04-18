/**
 * F-6 비자 승인 가능성 계산 엔진.
 * 순수 함수 - AI 없음. 룰 기반만.
 */

import {
  CURRENT_RULE_YEAR,
  INCOME_THRESHOLDS,
  MIN_MARRIAGE_AGE_BY_COUNTRY,
  PROPERTY_TO_INCOME_RATE,
} from './rules';

export type Inputs = {
  // 초청인
  inviterAge: number;
  inviterGender: 'M' | 'F';
  inviterMaritalHistory: 'first' | 'remarried';
  inviterRemarriageCount: number;
  hasChildren: boolean;

  // 가구·경제
  householdSize: number; // 본인 + 배우자 + 동거 직계가족
  annualIncome: number; // 원
  propertyNetWorth: number; // 순자산
  includeFamilyIncome: boolean;
  familyIncomeTotal: number;

  // 주거
  housingType: 'owned' | 'jeonse' | 'monthly' | 'family' | 'other';

  // 배우자
  partnerCountry: string;
  partnerAge: number;
  partnerGender: 'M' | 'F';
  partnerMaritalHistory: 'first' | 'remarried';

  // 진정성
  relationshipMonths: number; // 교제 기간(개월)
  inPersonMeetings: number; // 대면 만남 횟수
  communicationLanguage: 'fluent' | 'basic' | 'interpreter_only';
  evidencePhotoCount: number;

  // 기타
  preMarriageProgramCompleted: boolean;
  inviterCriminalHistory: 'none' | 'minor' | 'serious' | 'child_abuse_sex';
  inviterMedicalCondition: 'none' | 'minor' | 'serious';
  partnerMaritalClear: boolean; // 배우자 본국 혼인 정리 완료
};

export type Recommendation = {
  severity: 'blocker' | 'critical' | 'warning' | 'info';
  category: 'income' | 'sincerity' | 'housing' | 'legal' | 'other';
  title: string;
  detail: string;
  legalBasis?: string;
};

export type Result = {
  ruleYear: number;
  visaType: 'F-6-1' | 'F-6-2' | 'F-6-3' | 'INELIGIBLE';
  overallProbability: number; // 0-100
  scores: {
    income: number;
    sincerity: number;
    housing: number;
    other: number;
  };
  incomeDetail: {
    threshold: number;
    effectiveIncome: number;
    propertyConverted: number;
    familyIncluded: number;
    meetsMinimum: boolean;
  };
  hardBlockers: Recommendation[];
  recommendations: Recommendation[];
  summary: string;
};

export function runSimulation(inputs: Inputs): Result {
  const year = CURRENT_RULE_YEAR;
  const blockers = checkHardBlockers(inputs);

  // 비자 유형 분기
  const visaType = determineVisaType(inputs, blockers);

  if (visaType === 'INELIGIBLE') {
    return {
      ruleYear: year,
      visaType,
      overallProbability: 0,
      scores: { income: 0, sincerity: 0, housing: 0, other: 0 },
      incomeDetail: {
        threshold: 0,
        effectiveIncome: 0,
        propertyConverted: 0,
        familyIncluded: 0,
        meetsMinimum: false,
      },
      hardBlockers: blockers,
      recommendations: [],
      summary: 'F-6 비자 신청이 불가한 사유가 있습니다. 변호사 상담을 권장합니다.',
    };
  }

  const incomeAnalysis = analyzeIncome(inputs);
  const incomeScore = scoreIncome(incomeAnalysis);
  const sincerityScore = scoreSincerity(inputs);
  const housingScore = scoreHousing(inputs);
  const otherScore = scoreOther(inputs);

  // 가중 평균 + 가드레일
  let probability = Math.round(
    incomeScore * 0.4 + sincerityScore * 0.3 + housingScore * 0.15 + otherScore * 0.15,
  );

  // 가드레일: 소득이 낮으면 상한 적용
  if (incomeScore < 60) probability = Math.min(probability, 30);
  if (sincerityScore < 50) probability = Math.min(probability, 40);
  if (!inputs.preMarriageProgramCompleted) probability = 0; // 접수 자체 불가

  const recommendations = buildRecommendations(inputs, {
    incomeScore,
    sincerityScore,
    housingScore,
    incomeAnalysis,
  });

  return {
    ruleYear: year,
    visaType,
    overallProbability: Math.max(0, Math.min(100, probability)),
    scores: {
      income: incomeScore,
      sincerity: sincerityScore,
      housing: housingScore,
      other: otherScore,
    },
    incomeDetail: incomeAnalysis,
    hardBlockers: blockers,
    recommendations,
    summary: buildSummary(probability, visaType, recommendations),
  };
}

function checkHardBlockers(inputs: Inputs): Recommendation[] {
  const list: Recommendation[] = [];

  if (inputs.inviterCriminalHistory === 'child_abuse_sex') {
    list.push({
      severity: 'blocker',
      category: 'legal',
      title: '아동학대·성범죄 전력',
      detail:
        '아동복지법 §29의3 및 출입국관리법 시행규칙상 결혼이민 초청 자격이 제한됩니다.',
      legalBasis: '아동복지법 §29의3, 출입국관리법 시행규칙 별표 1의2',
    });
  }

  if (!inputs.partnerMaritalClear) {
    list.push({
      severity: 'blocker',
      category: 'legal',
      title: '배우자 본국 혼인 미정리',
      detail:
        '배우자가 본국에서 이전 혼인 정리가 완료되지 않은 경우 중혼 상태로 혼인 자체가 무효입니다.',
      legalBasis: '민법 §810, 국제사법 §63',
    });
  }

  // 배우자 본국법상 최저 혼인연령
  const minAge = MIN_MARRIAGE_AGE_BY_COUNTRY[inputs.partnerCountry] ??
    MIN_MARRIAGE_AGE_BY_COUNTRY.OTHER!;
  const limit = inputs.partnerGender === 'M' ? minAge.male : minAge.female;
  if (inputs.partnerAge < limit) {
    list.push({
      severity: 'blocker',
      category: 'legal',
      title: '배우자 본국법 혼인연령 미달',
      detail: `배우자 본국법상 최저 혼인연령(${limit}세)에 미달합니다.`,
      legalBasis: '국제사법 §63 (혼인의 성립)',
    });
  }

  return list;
}

function determineVisaType(inputs: Inputs, blockers: Recommendation[]): Result['visaType'] {
  if (blockers.length > 0) return 'INELIGIBLE';
  if (inputs.hasChildren && inputs.inviterMaritalHistory === 'remarried') {
    return 'F-6-2'; // 자녀 양육
  }
  return 'F-6-1';
}

function analyzeIncome(inputs: Inputs): Result['incomeDetail'] {
  const thresholds = INCOME_THRESHOLDS[CURRENT_RULE_YEAR];
  const threshold =
    thresholds[inputs.householdSize] ??
    (inputs.householdSize > 7
      ? thresholds[7]! + (inputs.householdSize - 7) * 5_500_000
      : thresholds[2]!);

  const propertyConverted = Math.floor(inputs.propertyNetWorth * PROPERTY_TO_INCOME_RATE);
  const familyIncluded = inputs.includeFamilyIncome ? inputs.familyIncomeTotal : 0;
  const effectiveIncome = inputs.annualIncome + propertyConverted + familyIncluded;

  return {
    threshold,
    effectiveIncome,
    propertyConverted,
    familyIncluded,
    meetsMinimum: effectiveIncome >= threshold,
  };
}

function scoreIncome(detail: Result['incomeDetail']): number {
  if (detail.threshold === 0) return 0;
  const ratio = detail.effectiveIncome / detail.threshold;
  if (ratio >= 1.5) return 100;
  if (ratio >= 1.2) return 90;
  if (ratio >= 1.0) return 75;
  if (ratio >= 0.9) return 55;
  if (ratio >= 0.7) return 30;
  return 10;
}

function scoreSincerity(inputs: Inputs): number {
  const durationScore =
    inputs.relationshipMonths >= 12 ? 100
    : inputs.relationshipMonths >= 6 ? 80
    : inputs.relationshipMonths >= 3 ? 50
    : 20;

  const meetingScore =
    inputs.inPersonMeetings >= 3 ? 100
    : inputs.inPersonMeetings === 2 ? 70
    : inputs.inPersonMeetings === 1 ? 40
    : 0;

  const commScore =
    inputs.communicationLanguage === 'fluent' ? 100
    : inputs.communicationLanguage === 'basic' ? 65
    : 30;

  const evidenceScore =
    inputs.evidencePhotoCount >= 20 ? 100
    : inputs.evidencePhotoCount >= 10 ? 70
    : inputs.evidencePhotoCount >= 5 ? 40
    : 10;

  return Math.round(
    durationScore * 0.3 + meetingScore * 0.25 + commScore * 0.25 + evidenceScore * 0.2,
  );
}

function scoreHousing(inputs: Inputs): number {
  switch (inputs.housingType) {
    case 'owned': return 100;
    case 'jeonse': return 85;
    case 'monthly': return 65;
    case 'family': return 50;
    default: return 30;
  }
}

function scoreOther(inputs: Inputs): number {
  let score = 100;
  if (!inputs.preMarriageProgramCompleted) score -= 100;
  if (inputs.inviterCriminalHistory === 'serious') score -= 40;
  else if (inputs.inviterCriminalHistory === 'minor') score -= 15;
  if (inputs.inviterMedicalCondition === 'serious') score -= 20;
  if (inputs.inviterMaritalHistory === 'remarried' && inputs.inviterRemarriageCount >= 3) {
    score -= 30;
  }
  return Math.max(0, score);
}

function buildRecommendations(
  inputs: Inputs,
  ctx: {
    incomeScore: number;
    sincerityScore: number;
    housingScore: number;
    incomeAnalysis: Result['incomeDetail'];
  },
): Recommendation[] {
  const list: Recommendation[] = [];

  // 사전안내프로그램
  if (!inputs.preMarriageProgramCompleted) {
    list.push({
      severity: 'critical',
      category: 'other',
      title: '결혼이민사전안내프로그램 미이수',
      detail:
        '초청인은 반드시 결혼이민사전안내프로그램을 이수해야 합니다. 미이수 시 F-6 접수 자체가 불가합니다.',
      legalBasis: '출입국관리법 §79의2, 시행규칙 §9의6',
    });
  }

  // 소득요건
  if (!ctx.incomeAnalysis.meetsMinimum) {
    const shortfall = ctx.incomeAnalysis.threshold - ctx.incomeAnalysis.effectiveIncome;
    list.push({
      severity: 'critical',
      category: 'income',
      title: '소득요건 미달',
      detail:
        `가구원 ${inputs.householdSize}인 기준 ${ctx.incomeAnalysis.threshold.toLocaleString()}원이 필요하며, ` +
        `현재 ${ctx.incomeAnalysis.effectiveIncome.toLocaleString()}원으로 ${shortfall.toLocaleString()}원 부족합니다. ` +
        `재산 환산(${ctx.incomeAnalysis.propertyConverted.toLocaleString()}원) 또는 동거가족 소득 합산을 검토하세요.`,
      legalBasis: '출입국관리법 시행규칙 별표 1의2 F-6',
    });
  } else if (ctx.incomeScore < 80) {
    list.push({
      severity: 'warning',
      category: 'income',
      title: '소득 여유분 부족',
      detail:
        '소득요건은 충족하나 여유분이 크지 않아 심사에서 감점 요인이 될 수 있습니다. 재직 안정성·추가 소득원 증빙을 강화하세요.',
    });
  }

  // 진정성
  if (inputs.relationshipMonths < 6) {
    list.push({
      severity: 'warning',
      category: 'sincerity',
      title: '교제 기간이 짧음',
      detail:
        `교제 기간 ${inputs.relationshipMonths}개월은 진정성 심사에서 의심 요인입니다. 가능하다면 추가 교제 후 신청을 권장합니다.`,
    });
  }
  if (inputs.inPersonMeetings < 3) {
    list.push({
      severity: 'warning',
      category: 'sincerity',
      title: '대면 만남 횟수 부족',
      detail: `현재 ${inputs.inPersonMeetings}회. 최소 3회 이상 권장. 현지 방문 또는 배우자 단기 방한 고려.`,
    });
  }
  if (inputs.communicationLanguage === 'interpreter_only') {
    list.push({
      severity: 'critical',
      category: 'sincerity',
      title: '공통 의사소통 언어 부재',
      detail:
        '양측 통역 없이 소통 불가한 경우 혼인 진정성 의심이 매우 커집니다. 한국어 TOPIK 또는 배우자 언어 기초 학습 후 신청 권장.',
    });
  }
  if (inputs.evidencePhotoCount < 20) {
    list.push({
      severity: 'warning',
      category: 'sincerity',
      title: '교제 증빙 자료 부족',
      detail: `현재 사진 ${inputs.evidencePhotoCount}장. 20장 이상 권장(양가 방문, 데이트, 영상통화 캡처 등 다양화).`,
    });
  }

  // 주거
  if (inputs.housingType === 'family' || inputs.housingType === 'other') {
    list.push({
      severity: 'warning',
      category: 'housing',
      title: '주거 안정성 낮음',
      detail:
        '자가·전세·월세 중 하나의 독립 주거 확보가 권장됩니다. 현재 상태는 "혼인 진정성 의심" 근거로 활용될 수 있습니다.',
    });
  }

  // 범죄 경력
  if (inputs.inviterCriminalHistory === 'serious') {
    list.push({
      severity: 'critical',
      category: 'legal',
      title: '초청인 중대 범죄 전력',
      detail:
        '가정폭력·성폭력 전력은 공개 의무가 있으며 심사에 부정적 영향이 큽니다. 변호사 상담 권장.',
      legalBasis: '결혼중개업법 §10의2 ① 3호, 아동복지법 §29의3',
    });
  }

  return list;
}

function buildSummary(
  probability: number,
  visaType: Result['visaType'],
  recs: Recommendation[],
): string {
  if (visaType === 'INELIGIBLE') {
    return 'F-6 비자 신청이 불가한 하드 블로커가 있습니다. 해당 사유 해소 전 신청은 권장되지 않습니다.';
  }
  const criticalCount = recs.filter((r) => r.severity === 'critical').length;
  if (probability >= 80) {
    return `승인 가능성이 높은 상태입니다. 서류 유효기간을 마지막으로 점검하고 접수하세요.`;
  }
  if (probability >= 60) {
    return `승인 가능성은 있으나 ${criticalCount}개의 중대 보완 사항이 있습니다. 보완 후 접수 권장.`;
  }
  if (probability >= 30) {
    return `현재 상태로 접수 시 불허 리스크가 큽니다. 핵심 요건(소득·진정성)을 먼저 보강하세요.`;
  }
  return `현재 상태로는 접수해도 거의 불허됩니다. 변호사 상담 후 전략을 재검토하세요.`;
}
