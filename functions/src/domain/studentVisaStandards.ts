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
  '제조업(사업자등록증에 제조업이 있으면 원칙적으로 불허, 2017-04부)',
  '건설업(2018-10부 추가. 적발되면 횟수와 관계없이 1차에 출국명령이다)',
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
  /**
   * 건설업은 별도다. 단계적 제재가 아니라 1차에 바로 출국명령이 나간다.
   * 유학생이 쉽게 구하는 일자리라 상담에서 먼저 짚어야 한다.
   */
  construction: [
    '건설업 분야는 적발 횟수와 관계없이 1차 적발 시 예외 없이 30일 이내 출국명령(입국규제는 유예)',
  ],
} as const;

// ── 체류기간 연장 ─────────────────────────────────────────
//
// 출처: 법무부 「외국인유학생 사증발급 및 체류관리 지침」(2016-03-02 개정본 전문).
// 원문을 docs/sources/에 보관했다. 8년 전 판이라 금액은 옛것이지만 심사 체계와
// 학점·출석 기준은 2026년 발표 자료와 일관된다. 최신본 확보 시 대조할 것.

export const EXTENSION_RULES = {
  /** 체류기간은 학사일정에 맞춰 조정된다 */
  alignment:
    '외국인등록 시 익년도 3월말 또는 9월말로 조정한다(연장 수수료 면제). 졸업 예정자는 3월말 또는 9월말까지 허가한다.',
  cap: {
    degree: 'D-2는 2년 이내',
    language: 'D-4는 6개월 이내에서 연수종료일부터 15일 이내 추가 연장. 어학연수 기간은 최대 2년까지만 허용',
  },
  /**
   * 학점이 체류를 좌우한다. 인증대학이라도 C 미만이면 혜택이 사라지고,
   * 하위대학에서 D 이하가 이어지면 연장 자체가 막힌다.
   */
  gradeThresholds: {
    incentive: '인증대학 재학생 중 평균 C학점(평점 2.0) 이상 — 서류 미징구, 재정입증 생략, 체류기간 상한 2년',
    languageIncentive: '인증대학 어학연수생 출석률 70% 이상 — 재정입증 생략 가능',
    scrutiny:
      '하위대학 재학생 중 평균 D학점(평점 1.0) 이하 — 사유서 징구 후 6개월 이내 연장, 개선 노력이 없으면 원칙적으로 연장 불허',
  },
  /** 학생들이 가장 많이 걸리는 함정 */
  leaveOfAbsence:
    '개인 사정이나 학점 미달로 인한 휴학은 체류기간 연장이 제한된다. 질병·사고 등 부득이한 사유만 예외로 인정되며 이 경우 해당 체류자격으로 변경 등의 조치를 받는다.',
  /** 신청 편의 */
  filing: '인증대학 재학생은 온라인 신청이 가능하고, 유학생 담당자가 최대 8명까지 일괄 신청할 수 있다.',
} as const;

/**
 * 비자정밀 심사대학이어도 막히지 않는 자격이 있다.
 * 학부 유학생만 제한 대상이고, 대학원·연구·교환은 예외다.
 */
export const RESTRICTED_UNIVERSITY_EXCEPTIONS = [
  '석사(D-2-3)',
  '박사(D-2-4)',
  '연구과정(D-2-5)',
  '교환학생(D-2-6)',
];

/** 학위·학력 서류의 공적 확인. 고시 21개국 출신은 셋 중 하나를 반드시 갖춰야 한다. */
export const DEGREE_VERIFICATION = {
  whoNeedsIt:
    '법무부장관 고시 21개국 출신이거나 그 국가 소재 대학에서 학위·학력을 취득한 사람',
  options: [
    '아포스티유(Apostille) 확인을 받은 학위·학력 입증서류',
    '출신학교가 속한 국가 주재 한국영사 또는 주한 공관 영사확인을 받은 서류',
    '중국교육부 학력학위인증센터 발행 인증보고서(중국 내 취득자에 한함)',
  ],
  exemption:
    '국내 대학에서 학위·학력을 취득한 경우에는 공적확인 없는 학위증 제출이 허용된다.',
  translation:
    '영어 이외의 외국어 서류는 번역자 확인서와 번역문을 첨부한다(공증은 필요 없다).',
} as const;
