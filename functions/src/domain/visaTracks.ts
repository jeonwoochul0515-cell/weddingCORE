// 비자 사업 종류(트랙)마다 다른 규칙을 한곳에 모은 정의
//
// [값을 정하는 기준] 행정사 보수와 같은 선에 맞춘다. 변호사가 본다고 더 받는 구조가 아니다.
// 공시된 행정사 요금표(출입국 민원)에서 우리 상품에 대응하는 값은 둘이다.
//   · 서류작성 1건  =  20,000원  → 서류 하나를 만들어 주는 것 (20캐럿)
//   · 신청지원      = 110,000원  → 신청 한 건을 통째로 준비해 주는 것 (110캐럿)
// 신청대행(30만~44만)은 접수까지 대신하는 것이라 우리 범위가 아니다.
// 값을 고칠 때는 화면(src/domain/visaTracks.ts)과 서버를 함께 고친다 — npm run check:tracks 가 대조한다.
//
// weddingCORE는 결혼중개 하나가 아니라 두 사업의 공통 엔진으로 쓴다.
//   1) 결혼중개 (F-6 결혼이민)
//   2) 비자 연장 (체류기간 연장·자격변경 — 같은 고객이 주기적으로 돌아온다)
//
// 유학생 비자(D-2·D-4)는 2026-08-28에 KoAdmit으로 넘겼다. 여기로 되돌리지 말 것.
//
// 고객 관리·기한 추적·서류 보관·변호사 검토·캐럿 과금은 두 사업이 똑같이 쓰므로
// 이 파일에 넣지 않는다. 여기에는 "사업마다 달라지는 것"만 둔다.
// 새 사업을 추가할 때는 아래 TRACKS에 항목 하나를 더하면 된다.

export type TrackId = 'marriage' | 'extension';

export type DocumentSpec = {
  /** 문서 식별자. Firestore에 저장되므로 한번 정하면 바꾸지 않는다. */
  key: string;
  label: string;
  /** 1캐럿 = 1,000원. 원가가 아니라 업무 가치 기준으로 정한다. */
  creditCost: number;
  instruction: string;
};

export type StageSpec = {
  id: string;
  label: string;
  description: string;
};

export type VisaTrack = {
  id: TrackId;
  label: string;
  description: string;
  visaTypes: string[];
  stages: StageSpec[];
  documents: DocumentSpec[];
  /** 업종별 법정의무 템플릿 참조 키. 실제 데이터 분리는 후속 작업. */
  obligationSet: string | null;
  /** 비자별 요건(소득·잔고 등) 규칙 참조 키. 실제 데이터 분리는 후속 작업. */
  requirementSet: string | null;
  /** 같은 고객이 주기적으로 재신청하는 사업인지. 연장 알림 대상 판단에 쓴다. */
  recurring: boolean;
};

/** 어느 트랙에서나 쓰는 공통 문서. 트랙마다 다시 적지 않는다. */
const SHARED_DOCUMENTS: DocumentSpec[] = [
  {
    key: 'privacy_third_party_consent',
    label: '개인정보 제3자 제공 동의서',
    creditCost: 20,
    instruction:
      '법률사무소·번역업체 등 제공받는 자, 이용 목적, 제공 항목, 보유기간, 동의 거부권을 분명히 구분한 동의서 초안을 작성한다.',
  },
  {
    key: 'immigration_supplement_response',
    label: '출입국 보완요청 대응서',
    creditCost: 110,
    instruction:
      '보완요청 내용을 사실관계와 증빙별로 구조화하고, 확인되지 않은 사실을 만들지 않은 대응서 초안을 작성한다.',
  },
];

export const TRACKS: Record<TrackId, VisaTrack> = {
  marriage: {
    id: 'marriage',
    label: '국제결혼 중개',
    description: '결혼중개업체의 고객 상담부터 F-6 결혼이민 비자 준비까지',
    visaTypes: ['F-6-1', 'F-6-2', 'F-6-3'],
    obligationSet: 'marriage_brokerage_act',
    requirementSet: 'f6_income',
    recurring: false,
    stages: [
      { id: 'intake', label: '상담 접수', description: '신청인·초청인 기본정보 확인' },
      { id: 'documents', label: '서류 준비', description: '필수서류 수집과 누락 점검' },
      { id: 'legal_review', label: '전문가 검토', description: '진술·계약·위험요소 검토' },
      { id: 'submitted', label: '접수 완료', description: '공관·출입국 접수번호 관리' },
      { id: 'supplement', label: '보완 대응', description: '보완요청 기한과 답변 관리' },
      { id: 'approved', label: '허가 완료', description: '발급·입국 후속 절차 안내' },
    ],
    documents: [
      {
        key: 'f6_application_package',
        label: 'F-6 신청 패키지',
        creditCost: 110,
        instruction:
          'F-6 신청용 사건 요약, 초청 경위, 소득·주거·혼인 진정성 입증 구조와 누락서류 목록을 작성한다. 발급 가능성을 보장하지 않는다.',
      },
      {
        key: 'brokerage_contract_review',
        label: '국제결혼중개 계약 검토',
        creditCost: 20,
        instruction:
          '국제결혼중개 총비용, 납입시기, 제휴업체, 환불, 비자·입국수속 범위를 중심으로 계약 검토표와 수정문구 초안을 작성한다.',
      },
      {
        key: 'premarital_property_agreement',
        label: '혼인 전 재산약정',
        creditCost: 20,
        instruction:
          '혼인 전 보유재산, 채무, 생활비, 송금, 혼인 중 취득재산을 정리한 부부재산약정 초안을 작성한다. 양 당사자 이해충돌과 혼인 전 등기 검토를 필수 경고한다.',
      },
      ...SHARED_DOCUMENTS,
    ],
  },

  extension: {
    id: 'extension',
    label: '체류 연장·변경',
    description: '체류기간 연장과 체류자격 변경. 같은 고객이 주기적으로 다시 찾는 업무',
    visaTypes: ['연장', '자격변경', '자격외활동'],
    obligationSet: null,
    requirementSet: null,
    recurring: true,
    stages: [
      { id: 'intake', label: '만료 확인', description: '체류만료일과 신청 가능 시점 확인' },
      { id: 'eligibility', label: '자격 점검', description: '연장·변경 요건 충족 여부 확인' },
      { id: 'documents', label: '서류 준비', description: '소득·재직·거주 증빙 수집' },
      { id: 'submitted', label: '접수 완료', description: '출입국 방문예약과 접수 관리' },
      { id: 'approved', label: '허가 완료', description: '허가 확인과 다음 만료일 등록' },
    ],
    documents: [
      {
        key: 'extension_application_package',
        label: '체류기간 연장 패키지',
        creditCost: 110,
        instruction:
          '연장 신청용 체류 이력 요약, 연장 사유, 생계·거주 유지 입증 구조와 누락서류 목록을 작성한다. 허가를 보장하지 않는다.',
      },
      {
        key: 'status_change_review',
        label: '체류자격 변경 검토',
        creditCost: 20,
        instruction:
          '현재 자격에서 목표 자격으로의 변경 가능성, 요건 충족 여부, 사전 준비사항을 점검표로 정리한다. 불확실한 부분은 변호사 확인 항목으로 남긴다.',
      },
      ...SHARED_DOCUMENTS,
    ],
  },
};

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];

/** 모든 트랙의 문서를 키로 찾을 수 있게 펼친 표. 같은 키는 트랙 간 정의가 동일하다. */
export const DOCUMENT_BY_KEY: Record<string, DocumentSpec & { trackIds: TrackId[] }> = (() => {
  const table: Record<string, DocumentSpec & { trackIds: TrackId[] }> = {};
  for (const track of Object.values(TRACKS)) {
    for (const doc of track.documents) {
      const existing = table[doc.key];
      if (existing) {
        existing.trackIds.push(track.id);
        continue;
      }
      table[doc.key] = { ...doc, trackIds: [track.id] };
    }
  }
  return table;
})();

export function findDocument(key: string) {
  return DOCUMENT_BY_KEY[key] ?? null;
}
