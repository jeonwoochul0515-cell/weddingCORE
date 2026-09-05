import type { Timestamp } from 'firebase/firestore';

// ===== 공유 마스터 =====

export type Article = {
  statuteId: string;
  articleNumber: string;
  title: string;
  content: string;
  contentHash: string;
  effectiveFrom: Timestamp;
  effectiveTo: Timestamp | null;
  status: 'active' | 'amended' | 'repealed';
  history: Array<{ version: string; changedAt: Timestamp; diffSummary: string }>;
  lastCrawledAt: Timestamp;
};

/**
 * 법제처 개정 공시에서 감지한 변경.
 * 법률뿐 아니라 고시·훈령 같은 행정규칙(하위법령)도 담는다.
 */
export type RegulatoryDelta = {
  /** law = 법률·시행령·시행규칙, admrul = 고시·훈령·예규 */
  kind: 'law' | 'admrul';
  name: string;
  /** 우리가 추적하는 법령이면 그 ID. 행정규칙은 null */
  statuteId: string | null;
  /** 어떤 감시 대상·키워드에 걸렸는지 */
  matchedBy: string;
  priority: 'critical' | 'high' | 'medium';
  tracks: string[];
  /** 공포일(법령) 또는 발령일(행정규칙). YYYYMMDD */
  promulgatedOn: string;
  enforcedOn: string | null;
  /** 시행 전이면 미리 대비할 수 있다 */
  enforcementStatus: 'upcoming' | 'in_effect' | 'unknown';
  revisionType: string | null;
  ministry: string | null;
  sourceUrl: string;
  /** 조문 대조 결과 요약. 행정규칙은 null */
  articleSummary: string | null;
  detectedAt: Timestamp;
  notifiedAgencies: string[];
};

export type ObligationTemplate = {
  code: string;
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  category: 'pre_contract' | 'contract' | 'pre_meeting' | 'meeting' | 'visa' | 'aftercare';
  title: string;
  description: string;
  legalBasis: string;
  penaltyRange: string;
  disputeRisk: string;
  dueDateRule: {
    type: 'relative' | 'absolute';
    anchor: 'client_created' | 'meeting_scheduled' | 'contract_signed';
    offsetDays: number;
  };
  requiredEvidence: string[];
  checkRule: {
    type: 'manual' | 'document_uploaded' | 'field_filled' | 'translation_completed';
    params: Record<string, unknown>;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  order: number;
  updatedBy: string;
  updatedAt: Timestamp;
};

export type VisaRule = {
  category: 'income' | 'housing' | 'sincerity' | 'program' | 'document';
  key: string;
  value: number | string | Record<string, unknown>;
  description: string;
  legalBasis: string;
  effectiveFrom: Timestamp;
  effectiveTo: Timestamp | null;
};

export type LegalTerm = {
  termId: string;
  ko: { term: string; definition: string };
  vi: { term: string; definition: string };
  km: { term: string; definition: string };
  zh: { term: string; definition: string };
  uz: { term: string; definition: string };
  domain: 'family_law' | 'immigration' | 'contract';
  verifiedBy: string;
  updatedAt: Timestamp;
};

// ===== 사용자 =====

export type UserRole = 'agency_owner' | 'agency_staff' | 'lawyer' | 'admin';

export type User = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  agencyId: string | null;
  lawyerId: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
};

export type Lawyer = {
  lawyerId: string;
  name: string;
  firm: string;
  barNumber: string;
  specialties: string[];
  isActive: boolean;
  verifiedAt: Timestamp;
};

// ===== 업체 (테넌트) =====

export type AgencyPublicProfile = {
  linkedAt: Timestamp;
  entrpsNm: string;           // 공시상 업체명 (정규화 매칭 키)
  rprsvNm: string;            // 공시상 대표자명
  region: string;             // "시도 시군구"
  mrbrkRegYmd: string | null; // YYYYMMDD
  operYn: boolean;
  hasSanctions: boolean;
  location: { lat: number; lng: number } | null;
  lastSyncAt: Timestamp;
  discloseSanctions?: boolean; // 처분 이력 공개 동의 (단계 2에서 사용)
  sanctions?: Array<{ ymd: string; content: string }>;
  badgeToken?: string;         // /verify/:agencyId 공개 접근 토큰 (단계 2)
};

export type Agency = {
  agencyId: string;
  businessNumber: string;
  registrationNumber: string;
  name: string;
  ownerUid: string;
  phone: string;
  address?: string | null;
  ownerName?: string | null;
  subscription: {
    plan: 'trial' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'expired' | 'cancelled';
    startedAt: Timestamp;
    renewsAt: Timestamp;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt: Timestamp | null;
  settings: {
    defaultPartnerLanguages: string[];
    notificationChannels: ('email' | 'fcm' | 'kakao')[];
  };
  publicProfile?: AgencyPublicProfile; // 단계 1: 공시 DB 매칭된 업체만
  createdAt: Timestamp;
};

export type AgencyMember = {
  uid: string;
  role: 'owner' | 'manager' | 'staff' | 'readonly';
  invitedAt: Timestamp;
  joinedAt: Timestamp | null;
};

export type MbtiType =
  | 'ISTJ' | 'ISFJ' | 'INFJ' | 'INTJ'
  | 'ISTP' | 'ISFP' | 'INFP' | 'INTP'
  | 'ESTP' | 'ESFP' | 'ENFP' | 'ENTP'
  | 'ESTJ' | 'ESFJ' | 'ENFJ' | 'ENTJ';

export type ClientProfile = {
  mbti: MbtiType | null;
  height: number | null;
  weight: number | null;
  education: '중졸' | '고졸' | '전문대졸' | '대졸' | '석사' | '박사' | null;
  religion: '무교' | '기독교' | '천주교' | '불교' | '기타' | null;
  region: string | null;
  smoking: boolean | null;
  drinking: '안함' | '가끔' | '자주' | null;
  hobbies: string[];
  idealType: {
    ageRange: [number, number] | null;
    mbtiPrefer: MbtiType[];
    regionPrefer: string[];
    educationMin: ClientProfile['education'] | null;
    religionPrefer: ClientProfile['religion'][];
  } | null;
};

export type BirthInfo = {
  solarDate: string; // 'YYYY-MM-DD'
  lunarDate: string | null;
  birthTime: '자시' | '축시' | '인시' | '묘시' | '진시' | '사시'
    | '오시' | '미시' | '신시' | '유시' | '술시' | '해시' | null;
};

export type AnchorKey =
  | 'client_created'
  | 'contract_signed'
  | 'meeting_scheduled'
  | 'marriage_registered'
  | 'entry_date'
  /**
   * 체류만료일. 다른 앵커와 달리 한 번 찍고 끝나는 시점이 아니라
   * 연장할 때마다 새 만료일로 갱신하는 값이다. 갱신하면 연장 기한이 다시 계산된다.
   */
  | 'stay_expiry';

/** 홈페이지 점검 위젯·업체 사이트에서 들어온 상담 접수의 처리 상태. 접수 → 전화했음 → 상담 중 → 고객 등록 / 종료 */
export type LeadStatus = 'new' | 'contacted' | 'consulting' | 'converted' | 'closed';

export type LeadCloseReason = 'no_response' | 'not_eligible' | 'other_agency' | 'hold' | 'other';

/** agencies/{aid}/leads/{leadId}. 서버(Admin SDK)가 만들고 업체는 처리 상태와 메모만 바꾼다. */
export type Lead = {
  agencyId: string;
  /** 'quick_check'(weddingCORE 점검 위젯) 또는 'woori_site'처럼 사이트 식별 문자열 */
  source: string;
  name: string;
  phone: string;
  /** 요건 점검 판정 */
  level: 'ok' | 'check' | 'stop' | 'unknown' | string;
  /** 점검 결과·상담 요약 원문. 화면은 parseLeadSummary로 읽어 보고서로 보여 준다 */
  summary: string;
  page: string;
  status: LeadStatus;
  memo: string;
  contactedAt?: Timestamp | null;
  nextActionAt?: Timestamp | null;
  closedAt?: Timestamp | null;
  closeReason?: LeadCloseReason | null;
  clientId?: string | null;
  convertedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** 접수에서 고객으로 넘어올 때 함께 따라오는 기록. 같은 질문을 두 번 하지 않기 위해 둔다. */
export type ClientIntake = {
  leadId: string;
  source: string;
  level: string;
  summary: string;
  receivedAt: Timestamp;
};

export type Client = {
  clientId: string;
  agencyId: string;
  /** 어디서 온 고객인가. 없으면 직접 등록(manual)으로 본다 */
  source?: { type: 'lead' | 'manual' | 'referral'; leadId?: string; via?: string };
  intake?: ClientIntake | null;
  koreanClient: {
    name: string;
    birthDate: Timestamp;
    gender: 'M' | 'F';
    nationalIdMasked: string;
    phone: string;
    address: string;
    maritalHistory: string;
    /** 계약 때 모르는 경우가 많아 비워 둘 수 있다. 0으로 채워 넣지 않는다 */
    incomeAnnual: number | null;
    occupation: string;
  };
  profile: ClientProfile | null;
  birthInfo: BirthInfo | null;
  assignedStaffUid: string;
  currentStage: 1 | 2 | 3 | 4 | 5 | 6;
  overallProgress: number;
  status: 'active' | 'completed' | 'cancelled';
  /** 종료(완료·취소) 처리한 때와 사유. 진행 중이면 비어 있다 */
  closedAt?: Timestamp | null;
  closeReason?: string | null;
  anchors?: Partial<Record<AnchorKey, Timestamp>>;
  automationConsents?: {
    aiProcessing: boolean;
    legalReviewSharing: boolean;
    evidenceReference: string;
    policyVersion: string;
    recordedAt: Timestamp;
    recordedBy: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Partner = {
  partnerId: string;
  name: string;
  birthDate: Timestamp;
  gender: 'M' | 'F';
  nationality: string;
  preferredLanguage: string;
  passportNumber: string;
  occupation: string;
  maritalHistory: string;
  isSelected: boolean;
  introducedAt: Timestamp;
  profile: ClientProfile | null;
  birthInfo: BirthInfo | null;
};

// ===== Phase 1.5: 매칭 =====

export type MatchResult = '수락' | '거절_A' | '거절_B' | '양측거절' | '보류';

export type Match = {
  matchId: string;
  agencyId: string;
  clientId: string;
  partnerId: string;
  clientName: string;
  partnerName: string;
  type: '맞선' | '프로필교환' | '화상상담';
  date: Timestamp;
  result: MatchResult | null;
  memo: string;
  mbtiScore: number | null;
  sajuScore: number | null;
  createdBy: string;
  createdAt: Timestamp;
};

export type ClientDocument = {
  docId: string;
  agencyId: string;
  type:
    | 'contract'
    | 'background_info'
    | 'rights_notice'
    | 'criminal_record'
    | 'health_cert'
    | 'income_proof'
    | 'marital_cert'
    | 'passport'
    | 'other';
  subject: 'korean' | 'partner' | 'both';
  storageUrl: string;
  /** Storage 안의 경로. 지울 때 쓴다. 예전 기록에는 없을 수 있다 */
  storagePath?: string;
  fileName: string;
  mimeType: string;
  issuedAt: Timestamp | null;
  validUntil: Timestamp | null;
  ocrExtracted: Record<string, unknown> | null;
  uploadedBy: string;
  uploadedAt: Timestamp;
  replaces: string | null;
};

export type Translation = {
  lang: 'ko' | 'vi' | 'km' | 'zh' | 'uz';
  content: string;
  fields: Record<string, string>;
  translatedBy: 'ai' | 'human';
  translationQuality: 'draft' | 'reviewed' | 'certified';
  signedAt: Timestamp | null;
  signedBy: string | null;
  translatedAt: Timestamp;
};

export type TimelineItemStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'warning'
  | 'violated'
  | 'blocked';

export type TimelineCheckRule = {
  type: 'manual' | 'document_uploaded' | 'field_filled' | 'translation_completed';
  params: Record<string, unknown>;
};

export type TimelineDueDateRule = {
  type: 'relative' | 'absolute';
  anchor: AnchorKey;
  offsetDays: number;
};

export type TimelineItem = {
  itemId: string;
  agencyId: string; // collectionGroup 쿼리를 위한 비정규화
  clientId: string;
  templateCode: string;
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  legalBasis: string;
  status: TimelineItemStatus;
  dueDate: Timestamp;
  completedAt: Timestamp | null;
  completedBy: string | null;
  evidence: Array<{ docId: string; addedAt: Timestamp }>;
  blockedReason: string | null;
  warningReason: string | null;
  notes: string;
  dueDateRule?: TimelineDueDateRule;
  checkRule?: TimelineCheckRule;
  updatedAt: Timestamp;
};

export type Violation = {
  violationId: string;
  timelineItemId: string;
  severity: 'minor' | 'moderate' | 'critical';
  legalBasis: string;
  penaltyEstimate: string;
  detectedAt: Timestamp;
  resolvedAt: Timestamp | null;
  resolution: string | null;
};

export type AgencyNotification = {
  notifId: string;
  type: 'doc_expiring' | 'timeline_due' | 'regulatory_change' | 'violation_detected';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  link: string;
  targetUids: string[];
  readBy: Record<string, Timestamp>;
  createdAt: Timestamp;
};

// ===== 소비자 (Phase 1: 비자 시뮬레이터 익명 세션) =====

export type VisaSimulation = {
  sessionId: string;
  inputs: {
    householdSize: number;
    annualIncome: number;
    hasRealEstate: boolean;
    realEstateValue: number;
    maritalHistory: string;
    koreanLevel: string;
    partnerKoreanExperience: string;
  };
  result: {
    eligible: boolean;
    incomeScore: number;
    sincerityScore: number;
    missingDocuments: string[];
    estimatedProbability: number;
    recommendations: string[];
  };
  year: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

// ===== AI 업무 자동화 / 변호사 검토 =====

/**
 * 문서 종류 키. 실제 목록은 트랙 정의(src/domain/visaTracks.ts)가 단일 출처다.
 * 사업(결혼중개·유학·체류연장)마다 문서가 달라 유니온으로 고정하지 않는다.
 */
export type AutomationDocumentType = string;

export type AutomationJobStatus =
  | 'generating'
  | 'awaiting_review'
  | 'changes_requested'
  | 'approved'
  | 'failed';

export type AutomationJob = {
  jobId: string;
  agencyId: string;
  clientId: string;
  clientName: string;
  documentType: AutomationDocumentType;
  status: AutomationJobStatus;
  title: string;
  generatedContent: string;
  riskFlags: string[];
  missingInformation: string[];
  lawyerChecklist: string[];
  requestNote: string;
  creditCost: number;
  modelTokenUsage: { input: number; output: number } | null;
  version: number;
  generatedBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedAt: Timestamp | null;
};

export type AgencyAiCredits = {
  monthlyAllowance: number;
  used: number;
  resetAt: Timestamp | null;
  purchased?: number; // 충전분. 월초에 소멸하지 않는다.
};

export type CaratOrder = {
  agencyId: string;
  packId: 'pack_110' | 'pack_330' | 'pack_550';
  carats: number;
  price: number;
  status: 'requested' | 'granted' | 'cancelled';
  requestedBy: string;
  createdAt: Timestamp;
};

// ===== 시스템 =====

export type AuditLog = {
  logId: string;
  actorUid: string;
  agencyId: string | null;
  action: string;
  targetPath: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string;
  userAgent: string;
  createdAt: Timestamp;
};
