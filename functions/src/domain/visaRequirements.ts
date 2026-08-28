// 비자별 요건 체계 — 무엇을 보고, 무엇 때문에 거부되는가
//
// 판례·재결례를 모아만 두면 쓸 수 없다. 실무에서 필요한 것은 "이 사건이 어느 요건에
// 걸렸는가"이므로, 요건을 먼저 세우고 사례를 그 아래 붙인다.
//
// 지키는 선
//  - 확인된 것과 확인되지 않은 것을 반드시 구분한다(status). 추정을 기준처럼 쓰면
//    업체가 그대로 고객에게 안내하고, 틀리면 우리 책임이 된다.
//  - 수치 기준은 출처를 함께 적는다. 출처 없는 숫자는 넣지 않는다.
//  - status가 'confirmed'가 아닌 항목은 화면에서 "확인 필요"로 표시해야 한다.

export type TrackId = 'marriage' | 'study' | 'extension';

export type RequirementStatus =
  /** 공식 자료로 확인했고 변호사 검수를 마쳤다 */
  | 'confirmed'
  /** 공식 자료에 근거가 있으나 세부 기준은 사안별 판단이다 */
  | 'discretionary'
  /** 초안. 근거 확인과 변호사 검수 전이다 */
  | 'draft';

export type VisaRequirement = {
  key: string;
  label: string;
  tracks: TrackId[];
  visaTypes: string[];
  /** 근거 법령·고시. 조문까지 특정한다 */
  basis: string[];
  /** 무엇을 보는지 한 문장 */
  whatIsChecked: string;
  /** 수치 기준이 있으면 여기에. 없으면 null */
  threshold: string | null;
  /** 이 요건 때문에 거부되는 전형적 사유. 재결례·판례에서 확인된 것만 */
  denialPatterns: string[];
  /** 준비 단계에서 모아야 할 자료 */
  evidence: string[];
  status: RequirementStatus;
};

export const VISA_REQUIREMENTS: VisaRequirement[] = [
  // ── 결혼이민 (F-6)
  {
    key: 'f6_income',
    label: '초청인 소득요건',
    tracks: ['marriage'],
    visaTypes: ['F-6-1', 'F-6-2'],
    basis: ['출입국관리법 시행규칙 제9조의5', '외교부 재외공관 결혼이민사증 소득요건 안내(2026-01-05)'],
    whatIsChecked: '초청인의 최근 1년 소득이 가구원수별 기준을 넘는지, 재산으로 보완 가능한지',
    threshold:
      '2026년 기준 2인 25,195,752원 / 3인 32,154,216원 / 4인 38,968,428원 / 5인 45,340,314원 / 6인 51,335,712원 / 7인 57,090,900원 (8인 이상 1인당 5,755,188원 가산)',
    denialPatterns: [
      '소득이 기준에 미달하고 재산으로도 보완되지 않음',
      '소득 증빙이 최근 1년 실제 소득을 반영하지 못함',
    ],
    evidence: ['소득금액증명', '재직증명서', '건강보험 납부확인서', '재산 증빙(등기부·잔고)'],
    status: 'confirmed',
  },
  {
    key: 'f6_authenticity',
    label: '혼인의 진정성',
    tracks: ['marriage'],
    visaTypes: ['F-6-1'],
    basis: ['출입국관리법 제11조', '민법 제815조'],
    whatIsChecked: '혼인이 실제 부부공동생활을 목적으로 한 것인지, 교제 경위와 관계 지속성이 소명되는지',
    threshold: null,
    denialPatterns: [
      '교제 기간이 짧고 만난 횟수가 적어 관계 형성이 소명되지 않음',
      '진술이 서로 어긋나 부부로서 상대를 아는 정도가 부족함',
      '중개업체를 통한 단기 성혼으로 교제 경위 자료가 없음',
    ],
    evidence: ['교제 경위서', '사진·통화·메시지 기록', '방문 출입국 기록', '혼인신고 서류'],
    status: 'discretionary',
  },
  {
    key: 'f6_communication',
    label: '의사소통 요건',
    tracks: ['marriage'],
    visaTypes: ['F-6-1'],
    basis: ['출입국관리법 시행규칙 제9조의5'],
    whatIsChecked: '부부가 의사소통할 수 있는 공통 언어가 있는지(한국어 능력 또는 상대국 언어 능력)',
    threshold: null,
    denialPatterns: ['공통 언어가 없고 어느 쪽도 상대 언어 능력을 증명하지 못함'],
    evidence: ['TOPIK 성적', '지정 교육기관 이수증', '해당 언어권 체류·학위 증빙'],
    status: 'discretionary',
  },
  {
    key: 'f6_housing',
    label: '주거요건',
    tracks: ['marriage'],
    visaTypes: ['F-6-1'],
    basis: ['출입국관리법 시행규칙 제9조의5'],
    whatIsChecked: '부부가 함께 거주할 정상적인 주거공간이 확보되어 있는지',
    threshold: null,
    denialPatterns: ['거주지가 특정되지 않거나 실제 거주 가능 상태가 아님'],
    evidence: ['임대차계약서 또는 등기부등본', '거주지 사진'],
    status: 'discretionary',
  },
  {
    key: 'f6_invitation_limit',
    label: '초청 횟수 제한',
    tracks: ['marriage'],
    visaTypes: ['F-6-1'],
    basis: ['출입국관리법 시행규칙 제9조의5'],
    whatIsChecked: '과거 결혼이민 초청 이력이 제한 범위 안인지',
    threshold: null,
    denialPatterns: ['최근 기간 내 다른 배우자를 초청한 이력이 있음'],
    evidence: ['혼인관계증명서(상세)', '과거 초청 이력 확인'],
    status: 'draft',
  },
  {
    key: 'f6_guidance_program',
    label: '국제결혼 안내프로그램 이수',
    tracks: ['marriage'],
    visaTypes: ['F-6-1'],
    basis: ['출입국관리법 시행규칙 제9조의5'],
    whatIsChecked: '초청인이 법무부 지정 국제결혼 안내프로그램을 이수했는지',
    threshold: null,
    denialPatterns: ['이수 대상인데 이수하지 않음'],
    evidence: ['안내프로그램 이수증'],
    status: 'draft',
  },

  // ── 유학 (D-2 / D-4)
  //
  // 유학 요건에는 학생 단위의 수치 기준이 없다. 기준이 대학에 붙기 때문이다.
  // 그래서 아래 요건들보다 'study_university_tier'를 먼저 확인해야 한다.
  {
    key: 'study_university_tier',
    label: '대학의 비자 심사 등급',
    tracks: ['study'],
    visaTypes: ['D-2', 'D-4'],
    basis: [
      '교육부·법무부 「2025년 교육국제화역량 인증 심사 및 유학생 유치·관리 실태조사 결과」(2026-02-12)',
    ],
    whatIsChecked:
      '지원 대학이 인증대학인지, 미인증인지, 비자정밀 심사대학인지 — 이에 따라 요구 서류와 발급 가능성 자체가 달라진다',
    threshold:
      '우수 인증(39교)·인증(학위 181교/어학 123교) = 표준입학허가서만으로 심사 / 명단 외 = 재정능력 등 심사 / 비자정밀 심사대학(학위 16교·어학 4교) = 사증 발급 원칙적 금지',
    denialPatterns: [
      '비자정밀 심사대학이어서 사증 발급이 원칙적으로 금지됨',
      '컨설팅대학이어서 불법취업 가능성에 대한 면담·실태조사 등 정밀 심사를 받음',
    ],
    evidence: ['표준입학허가서', '대학 등급 확인(교육부·법무부 발표 명단)'],
    status: 'confirmed',
  },
  {
    key: 'study_finance',
    label: '재정능력',
    tracks: ['study'],
    visaTypes: ['D-2', 'D-4'],
    basis: [
      '출입국관리법 시행규칙 별표',
      '교육부·법무부 「2025년 교육국제화역량 인증 심사 결과」(2026-02-12)',
    ],
    whatIsChecked:
      '재정능력 심사를 받는 대상인지 먼저 가리고, 대상이면 학비와 체재비를 감당할 재정이 본인 또는 재정보증인 명의로 확인되는지',
    threshold:
      '인증대학이면 원칙적으로 제출 불요(단 법무부장관 고시국가·중점관리국가 출신은 제출). 명단 외 대학이면 심사 대상. 금액 기준은 공관·국가별로 달라 공개된 단일 기준이 없다.',
    denialPatterns: [
      '잔고 형성 시점이 신청 직전이어서 실제 보유로 보기 어려움',
      '명의자와 신청인의 관계가 소명되지 않음',
    ],
    evidence: ['잔고증명', '학비 납입증명', '재정보증서', '가족관계 증빙'],
    status: 'discretionary',
  },
  {
    key: 'study_admission',
    label: '입학 적격',
    tracks: ['study'],
    visaTypes: ['D-2', 'D-4'],
    basis: ['고등교육법', '출입국관리법 시행규칙 별표'],
    whatIsChecked: '학력이 지원 과정에 맞고 입학허가가 유효한지',
    threshold: null,
    denialPatterns: ['학력 서류의 진위·인증이 확인되지 않음', '입학허가 과정과 신청 자격이 불일치'],
    evidence: ['입학허가서', '최종학력 증명(아포스티유 또는 영사확인)'],
    status: 'draft',
  },
  {
    key: 'study_language',
    label: '어학능력',
    tracks: ['study'],
    visaTypes: ['D-2'],
    basis: ['출입국관리법 시행규칙 별표'],
    whatIsChecked: '수학이 가능한 수준의 한국어 또는 영어 능력이 증명되는지',
    threshold: null,
    denialPatterns: ['요구 수준에 못 미치고 대체 증빙도 없음'],
    evidence: ['TOPIK 성적', '영어시험 성적', '어학과정 이수증'],
    status: 'draft',
  },

  // ── 체류 연장·변경
  {
    key: 'extension_status_maintained',
    label: '체류 실태 유지',
    tracks: ['extension'],
    visaTypes: ['연장'],
    basis: ['출입국관리법 제25조'],
    whatIsChecked: '현재 체류자격의 활동을 실제로 유지하고 있는지',
    threshold: null,
    denialPatterns: [
      '체류자격에 맞는 활동을 하지 않음',
      '자격외활동 허가 없이 다른 활동을 함',
      '신고 의무를 이행하지 않아 위반 이력이 누적됨',
    ],
    evidence: ['재직·재학 증명', '거주지 신고 내역', '소득·납세 증빙'],
    status: 'discretionary',
  },
  {
    key: 'extension_change_eligibility',
    label: '자격변경 적격',
    tracks: ['extension'],
    visaTypes: ['자격변경'],
    basis: ['출입국관리법 제24조'],
    whatIsChecked: '목표 자격의 요건을 충족하고 현재 자격에서 변경이 허용되는지',
    threshold: null,
    denialPatterns: ['현재 자격에서 목표 자격으로의 변경이 제한됨', '목표 자격 요건 미충족'],
    evidence: ['목표 자격 요건 증빙', '현재 자격 활동 종료 사유'],
    status: 'draft',
  },
];

export const REQUIREMENTS_BY_TRACK = (track: TrackId) =>
  VISA_REQUIREMENTS.filter((r) => r.tracks.includes(track));

export const findRequirement = (key: string) =>
  VISA_REQUIREMENTS.find((r) => r.key === key) ?? null;

/**
 * 사건을 요건에 연결할 때 쓰는 실마리.
 * 재결례·판례 본문에 이 말이 나오면 그 요건과 관련 있을 가능성이 높다.
 * 자동 분류의 1차 후보를 좁히는 용도이며, 최종 판단은 사람이 한다.
 */
export const REQUIREMENT_HINTS: Record<string, string[]> = {
  f6_income: ['소득요건', '소득기준', '가구원수', '재산', '연간소득'],
  f6_authenticity: ['혼인의 진정성', '위장결혼', '부부공동생활', '교제', '혼인무효'],
  f6_communication: ['의사소통', '한국어', 'TOPIK', '언어'],
  f6_housing: ['주거', '거주요건', '임대차'],
  f6_invitation_limit: ['초청', '재초청', '초청 제한'],
  f6_guidance_program: ['국제결혼 안내프로그램', '안내프로그램'],
  study_university_tier: ['인증대학', '비자정밀', '교육국제화역량', '표준입학허가서', '유치·관리'],
  study_finance: ['재정능력', '잔고', '학비', '체재비', '재정보증'],
  study_admission: ['입학허가', '학력', '아포스티유', '학위'],
  study_language: ['어학', 'TOPIK', '한국어능력'],
  extension_status_maintained: ['체류자격', '자격외활동', '체류실태', '신고의무'],
  extension_change_eligibility: ['자격변경', '체류자격 변경'],
};
