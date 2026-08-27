// 화면에서 쓰는 비자 사업(트랙)별 규칙 정의
//
// 서버(functions/src/domain/visaTracks.ts)와 문서 키·캐럿 비용이 반드시 같아야 한다.
// 어긋나면 화면에 표시한 가격과 실제 차감액이 달라지므로 `npm run check:tracks`로 검사한다.
//
// 세 사업이 같은 엔진을 쓴다. 사업마다 달라지는 것만 여기에 둔다.
//   1) marriage  — 결혼중개 (F-6)
//   2) study     — 유학생 비자 (D-2, D-4)
//   3) extension — 체류 연장·변경 (같은 고객이 주기적으로 재신청)

export type TrackId = 'marriage' | 'study' | 'extension';

export type DocumentSpec = {
  key: string;
  label: string;
  creditCost: number;
  /** 화면 카드에 보여줄 한 줄 설명 */
  description: string;
};

export type StageSpec = {
  id: string;
  label: string;
  description: string;
  /** 진행 뱃지 색상 */
  tone: string;
};

export type VisaTrack = {
  id: TrackId;
  label: string;
  description: string;
  visaTypes: string[];
  stages: StageSpec[];
  documents: DocumentSpec[];
  recurring: boolean;
};

const SHARED_DOCUMENTS: DocumentSpec[] = [
  {
    key: 'privacy_third_party_consent',
    label: '개인정보 제3자 제공 동의서',
    creditCost: 5,
    description: '법률사무소 제공 범위 초안',
  },
  {
    key: 'immigration_supplement_response',
    label: '출입국 보완요청 답변서',
    creditCost: 40,
    description: '사실·증빙별 대응 구조 초안',
  },
];

export const TRACKS: Record<TrackId, VisaTrack> = {
  marriage: {
    id: 'marriage',
    label: '국제결혼 중개',
    description: '상담부터 F-6 결혼이민 비자 준비까지',
    visaTypes: ['F-6-1', 'F-6-2', 'F-6-3'],
    recurring: false,
    stages: [
      { id: 'intake', label: '상담 접수', description: '신청인·초청인 기본정보 확인', tone: 'bg-slate-100 text-slate-700' },
      { id: 'documents', label: '서류 준비', description: '필수서류 수집과 누락 점검', tone: 'bg-blue-50 text-blue-700' },
      { id: 'legal_review', label: '전문가 검토', description: '진술·계약·위험요소 검토', tone: 'bg-violet-50 text-violet-700' },
      { id: 'submitted', label: '접수 완료', description: '공관·출입국 접수번호 관리', tone: 'bg-amber-50 text-amber-800' },
      { id: 'supplement', label: '보완 대응', description: '보완요청 기한과 답변 관리', tone: 'bg-rose-50 text-rose-700' },
      { id: 'approved', label: '허가 완료', description: '발급·입국 후속 절차 안내', tone: 'bg-emerald-50 text-emerald-700' },
    ],
    documents: [
      { key: 'f6_application_package', label: 'F-6 신청 패키지', creditCost: 30, description: '요건·입증구조·누락서류 초안' },
      { key: 'brokerage_contract_review', label: '국제결혼중개 계약 검토', creditCost: 15, description: '환불·제휴·업무범위 위험 점검' },
      { key: 'premarital_property_agreement', label: '혼인 전 재산약정', creditCost: 30, description: '재산·채무·생활비 조항 초안' },
      ...SHARED_DOCUMENTS,
    ],
  },

  study: {
    id: 'study',
    label: '유학생 비자',
    description: '입학 절차부터 D-2·D-4 사증 발급까지',
    visaTypes: ['D-2', 'D-4'],
    recurring: false,
    stages: [
      { id: 'intake', label: '상담 접수', description: '지원자 학력·어학 수준 확인', tone: 'bg-slate-100 text-slate-700' },
      { id: 'admission', label: '입학 절차', description: '학교 지원과 입학허가서 수령', tone: 'bg-blue-50 text-blue-700' },
      { id: 'finance', label: '재정 확인', description: '학비·체재비 잔고 증명 준비', tone: 'bg-cyan-50 text-cyan-700' },
      { id: 'documents', label: '서류 준비', description: '학력·경력 서류 인증과 번역', tone: 'bg-violet-50 text-violet-700' },
      { id: 'submitted', label: '접수 완료', description: '공관 사증 신청 접수', tone: 'bg-amber-50 text-amber-800' },
      { id: 'approved', label: '발급 완료', description: '사증 발급과 입국 후 등록 안내', tone: 'bg-emerald-50 text-emerald-700' },
    ],
    documents: [
      { key: 'study_application_package', label: '유학 사증 신청 패키지', creditCost: 30, description: '학업동기·재정능력 입증 초안' },
      { key: 'study_purpose_statement', label: '학업계획서 초안', creditCost: 20, description: '전공 선택 이유와 졸업 후 계획' },
      { key: 'admission_document_review', label: '입학허가·재정증명 검토', creditCost: 15, description: '명의·금액·기간 요건 점검표' },
      ...SHARED_DOCUMENTS,
    ],
  },

  extension: {
    id: 'extension',
    label: '체류 연장·변경',
    description: '체류기간 연장과 자격변경. 같은 고객이 주기적으로 다시 찾습니다',
    visaTypes: ['연장', '자격변경', '자격외활동'],
    recurring: true,
    stages: [
      { id: 'intake', label: '만료 확인', description: '체류만료일과 신청 가능 시점 확인', tone: 'bg-slate-100 text-slate-700' },
      { id: 'eligibility', label: '자격 점검', description: '연장·변경 요건 충족 여부 확인', tone: 'bg-blue-50 text-blue-700' },
      { id: 'documents', label: '서류 준비', description: '소득·재직·거주 증빙 수집', tone: 'bg-violet-50 text-violet-700' },
      { id: 'submitted', label: '접수 완료', description: '출입국 방문예약과 접수 관리', tone: 'bg-amber-50 text-amber-800' },
      { id: 'approved', label: '허가 완료', description: '허가 확인과 다음 만료일 등록', tone: 'bg-emerald-50 text-emerald-700' },
    ],
    documents: [
      { key: 'extension_application_package', label: '체류기간 연장 패키지', creditCost: 20, description: '연장 사유·생계유지 입증 초안' },
      { key: 'status_change_review', label: '체류자격 변경 검토', creditCost: 25, description: '변경 가능성과 요건 점검표' },
      ...SHARED_DOCUMENTS,
    ],
  },
};

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];
export const TRACK_LIST = TRACK_IDS.map((id) => TRACKS[id]);

/** 트랙 구분 없이 문서를 키로 찾는다. 같은 키는 어느 트랙에서나 같은 정의다. */
export const DOCUMENT_BY_KEY: Record<string, DocumentSpec> = Object.fromEntries(
  TRACK_LIST.flatMap((track) => track.documents.map((doc) => [doc.key, doc])),
);

/** 진행 단계를 트랙 구분 없이 찾는다. 사건 목록에서 뱃지를 그릴 때 쓴다. */
export const STAGE_BY_ID: Record<string, StageSpec> = Object.fromEntries(
  TRACK_LIST.flatMap((track) => track.stages.map((stage) => [stage.id, stage])),
);

/** 트랙의 기본 문서. 트랙에 문서가 하나도 없으면 정의가 잘못된 것이다. */
export function firstDocument(track: VisaTrack): DocumentSpec {
  const doc = track.documents[0];
  if (!doc) throw new Error(`트랙 ${track.id}에 문서 정의가 없습니다.`);
  return doc;
}

export const won = (carats: number) => `${(carats * 1000).toLocaleString()}원`;
