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

export type RegulatoryDelta = {
  statuteId: string;
  articleNumber: string;
  changeType: 'amended' | 'new' | 'repealed';
  oldHash: string | null;
  newHash: string;
  diffSummary: string;
  sourceUrl: string;
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
  | 'entry_date';

export type Client = {
  clientId: string;
  agencyId: string;
  koreanClient: {
    name: string;
    birthDate: Timestamp;
    gender: 'M' | 'F';
    nationalIdMasked: string;
    phone: string;
    address: string;
    maritalHistory: string;
    incomeAnnual: number;
    occupation: string;
  };
  profile: ClientProfile | null;
  birthInfo: BirthInfo | null;
  assignedStaffUid: string;
  currentStage: 1 | 2 | 3 | 4 | 5 | 6;
  overallProgress: number;
  status: 'active' | 'completed' | 'cancelled';
  anchors?: Partial<Record<AnchorKey, Timestamp>>;
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
