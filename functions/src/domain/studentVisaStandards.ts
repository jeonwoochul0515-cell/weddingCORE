// 유학 비자의 수치 기준 — 얼마를 갖고 있어야 하고, 몇 급이어야 하고, 몇 시간 일할 수 있는가
//
// 이 숫자들은 법령이 아니라 지침과 요령에 있다. 법제처 국가법령정보센터에서 검색되지 않아
// 실무자도 원문을 못 보는 경우가 많고, 그 정보 격차가 유학 시장에 브로커가 끼는 자리다.
//
// 출처를 항목마다 붙였다. 출처 없는 숫자는 넣지 않는다 — 업체가 그대로 고객에게 안내하고,
// 틀리면 우리 책임이 된다.
//
// 갱신: 재정능력·어학 기준은 교육부 요령이 개정될 때, 시간제취업은 법무부 지침이
//       개정될 때 바뀐다. 두 문서 모두 docs/sources/에 원문을 보관해 두었다.

export const STANDARDS_SOURCE = {
  finance: {
    doc: '외국인 유학생 및 어학연수생 표준업무처리요령',
    issuedBy: '교육부',
    revisedOn: '2025-03-14',
    note: '재정능력 관련 사항은 법무부 「외국인유학생 사증발급 및 체류관리 지침」 개정 시마다 반영된다',
  },
  partTime: {
    doc: '외국인유학생 사증발급 및 체류관리 지침 중 「시간제취업」',
    issuedBy: '법무부',
    note: '대학이 배포한 발췌본으로 확인. 원문 전체는 미확보',
  },
} as const;

// ── 재정능력 ─────────────────────────────────────────────

export type Region = 'capital' | 'local';

/**
 * 재정능력 심사기준(연간).
 * 수도권이냐 지방이냐로 금액이 갈린다. 대학 명단에는 소재지가 없으므로 따로 받아야 한다.
 */
export const FINANCE_THRESHOLD = {
  degree: { capital: 20_000_000, local: 16_000_000 },
  language: { capital: 10_000_000, local: 8_000_000 },
} as const;

/**
 * 주거급여 1인 가구 월 기준금액(국토교통부 고시).
 * 학위과정 체류기간이 1년 미만이면 체재비를 이 금액 × 체류개월수로 계산한다.
 */
export const MONTHLY_LIVING_COST_2024 = 1_069_654;

export type FinanceInput = {
  course: 'degree' | 'language';
  region: Region;
  /** 학위과정에서 체류기간이 1년 미만일 때만 쓴다 */
  monthsOfStay?: number;
  /** 체류기간이 1년 미만일 때 등록금을 따로 더한다 */
  tuition?: number;
};

export type FinanceResult = {
  amount: number;
  basis: string;
  /** 잔고증명서가 갖춰야 할 요건 */
  documentRules: string[];
};

export function financeRequirement(input: FinanceInput): FinanceResult {
  const documentRules = [
    '잔고증명서는 신청일 기준 30일 이내에 발급한 것이어야 합니다.',
    '유효기간이 명시된 잔고증명서는 그 기간까지 인정하되, 발급일로부터 최대 6개월까지만 인정됩니다.',
    '본인 명의가 아니면 재정보증인의 재직증명서(또는 사업자등록증), 자산증명서, 유학경비 부담서약서가 함께 필요합니다.',
  ];

  // 어학연수는 체류기간과 무관하게 정액이다
  if (input.course === 'language') {
    return {
      amount: FINANCE_THRESHOLD.language[input.region],
      basis: `어학연수과정 ${input.region === 'capital' ? '수도권' : '지방'} 대학 기준(6개월 평균 소요경비)`,
      documentRules,
    };
  }

  // 학위과정이 1년 미만이면 등록금 + 체류개월수에 비례한 체재비
  const months = input.monthsOfStay;
  if (months !== undefined && months < 12) {
    const living = MONTHLY_LIVING_COST_2024 * months;
    return {
      amount: (input.tuition ?? 0) + living,
      basis: `체류기간 ${months}개월(1년 미만)이므로 등록금 + 체재비(월 ${MONTHLY_LIVING_COST_2024.toLocaleString()}원 × ${months}개월)`,
      documentRules,
    };
  }

  return {
    amount: FINANCE_THRESHOLD.degree[input.region],
    basis: `학위과정 ${input.region === 'capital' ? '수도권' : '지방'} 대학 기준(연간 소요경비)`,
    documentRules,
  };
}

// ── 어학능력 ─────────────────────────────────────────────

export type Program = 'bachelor' | 'associate' | 'graduate' | 'language';

/**
 * 입학·졸업에 필요한 TOPIK 급수.
 * 전문대(associate)는 4년제보다 한 급씩 낮다.
 */
export const TOPIK_REQUIREMENT: Record<Program, { admission: number | null; graduation: number | null }> = {
  bachelor: { admission: 3, graduation: 4 },
  graduate: { admission: 3, graduation: 4 },
  associate: { admission: 2, graduation: 3 },
  language: { admission: null, graduation: null },
};

/** TOPIK을 대신할 수 있는 것들. 세종학당은 현지 오프라인 수료증만 인정된다. */
export const TOPIK_ALTERNATIVES = [
  { topik: 2, socialPreTest: 41, socialCourse: '2단계 이수', sejong: '초급2 이수' },
  { topik: 3, socialPreTest: 61, socialCourse: '3단계 이수', sejong: '중급1 이수' },
  { topik: 4, socialPreTest: 81, socialCourse: '4단계 이수', sejong: '중급2 이수' },
] as const;

/** 영어 트랙으로 들어갈 때의 기준. 졸업 기준은 없다. */
export const ENGLISH_ADMISSION = {
  toeflIbt: 59,
  ielts: 5.5,
  cefr: 'B2',
  newTeps: 202,
} as const;

// ── 시간제취업(아르바이트) ────────────────────────────────

export type PartTimeInput = {
  program: Program;
  /** 학사과정의 학년. 3학년 이상이면 요구 급수가 올라간다 */
  year?: number;
  /** 보유 TOPIK 급수. 없으면 0 */
  topik: number;
  /** 인증대학이면 주말·방학 허용시간이 5시간 늘어난다 */
  certifiedUniversity: boolean;
};

export type PartTimeResult = {
  /** 주중 허용시간(주당) */
  weekdayHours: number;
  /** 주말·방학 — 'unlimited'면 무제한 */
  weekendHours: number | 'unlimited';
  /** 요구되는 TOPIK 급수 */
  requiredTopik: number;
  meetsLanguage: boolean;
  notes: string[];
};

/**
 * 시간제취업 허용시간을 계산한다.
 *
 * 한국어 능력이 기준에 못 미치면 허용시간이 절반으로 줄고, 방학 무제한 혜택도 사라진다.
 * 이 규칙을 모르고 일하다 적발되면 1차에 1년 제한, 3차에 유학자격이 취소된다.
 */
export function partTimeAllowance(input: PartTimeInput): PartTimeResult {
  const notes: string[] = [];

  const requiredTopik =
    input.program === 'language' ? 2
    : input.program === 'associate' ? 3
    : input.program === 'graduate' ? 4
    : (input.year ?? 1) >= 3 ? 4 : 3;

  const meetsLanguage = input.topik >= requiredTopik;
  const bonus = input.certifiedUniversity ? 5 : 0;

  if (!meetsLanguage) {
    // 급수 미달이면 절반. 인증대 혜택도 방학 무제한도 적용되지 않는다.
    const half = input.program === 'graduate' ? 15 : 10;
    notes.push(
      `TOPIK ${requiredTopik}급에 미달하여 허용시간이 절반으로 제한되고, 방학 무제한과 인증대학 혜택이 적용되지 않습니다.`,
    );
    return { weekdayHours: half, weekendHours: half, requiredTopik, meetsLanguage, notes };
  }

  if (input.program === 'language') {
    notes.push('어학연수생은 자격변경일(사증 소지자는 입국일)로부터 6개월이 지나야 신청할 수 있습니다.');
    notes.push('어학연수과정은 방학 무제한이 적용되지 않으며, 근무 장소는 1곳, 허가기간은 최장 6개월입니다.');
    return { weekdayHours: 20, weekendHours: 20 + bonus, requiredTopik, meetsLanguage, notes };
  }

  if (input.program === 'associate') {
    notes.push('전문학사과정은 방학 무제한이 적용되지 않습니다.');
    return { weekdayHours: 20, weekendHours: 20 + bonus, requiredTopik, meetsLanguage, notes };
  }

  if (input.program === 'graduate') {
    return { weekdayHours: 30, weekendHours: 'unlimited', requiredTopik, meetsLanguage, notes };
  }

  return { weekdayHours: 20, weekendHours: 'unlimited', requiredTopik, meetsLanguage, notes };
}

/** 어떤 일은 허가 자체가 안 된다. 미리 알려주지 않으면 계약부터 하고 온다. */
export const PART_TIME_PROHIBITED = [
  '제조업(사업자등록증에 제조업이 있으면 원칙적으로 불허)',
  '파견근로(사업자등록증상 고용주와 근로계약상 고용주가 달라지는 형태)',
  '개인과외교습',
  '연구과정(D-2-5) 유학생',
  '과거 불법고용으로 사증발급이 제한된 업체',
];

/**
 * 위반했을 때 무슨 일이 생기는지.
 * 이걸 먼저 알려주는 것이 상담의 핵심이다 — 3차면 유학자격이 취소된다.
 */
export const PART_TIME_PENALTIES = {
  withoutPermit: [
    '1차 적발이 경미해 통고처분 후 체류가 허가된 경우, 범칙금 납부일부터 1년간 시간제취업이 제한됩니다.',
    '2차 적발부터는 강제퇴거가 원칙입니다.',
  ],
  breachOfCondition: [
    '1차 적발 — 향후 1년간 시간제취업 불허',
    '2차 적발 — 유학기간 중 시간제취업 불허',
    '3차 적발 — 유학자격 취소',
  ],
} as const;
