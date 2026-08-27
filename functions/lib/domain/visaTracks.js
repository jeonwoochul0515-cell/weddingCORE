// 비자 사업 종류(트랙)마다 다른 규칙을 한곳에 모은 정의
//
// weddingCORE는 결혼중개 하나가 아니라 세 사업의 공통 엔진으로 쓴다.
//   1) 결혼중개 (F-6 결혼이민)
//   2) 유학생 비자 (D-2 유학, D-4 어학연수)
//   3) 비자 연장 (체류기간 연장·자격변경 — 같은 고객이 주기적으로 돌아온다)
//
// 고객 관리·기한 추적·서류 보관·변호사 검토·캐럿 과금은 세 사업이 똑같이 쓰므로
// 이 파일에 넣지 않는다. 여기에는 "사업마다 달라지는 것"만 둔다.
// 새 사업을 추가할 때는 아래 TRACKS에 항목 하나를 더하면 된다.
/** 어느 트랙에서나 쓰는 공통 문서. 트랙마다 다시 적지 않는다. */
const SHARED_DOCUMENTS = [
    {
        key: 'privacy_third_party_consent',
        label: '개인정보 제3자 제공 동의서',
        creditCost: 5,
        instruction: '법률사무소·번역업체 등 제공받는 자, 이용 목적, 제공 항목, 보유기간, 동의 거부권을 분명히 구분한 동의서 초안을 작성한다.',
    },
    {
        key: 'immigration_supplement_response',
        label: '출입국 보완요청 대응서',
        creditCost: 40,
        instruction: '보완요청 내용을 사실관계와 증빙별로 구조화하고, 확인되지 않은 사실을 만들지 않은 대응서 초안을 작성한다.',
    },
];
export const TRACKS = {
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
                creditCost: 30,
                instruction: 'F-6 신청용 사건 요약, 초청 경위, 소득·주거·혼인 진정성 입증 구조와 누락서류 목록을 작성한다. 발급 가능성을 보장하지 않는다.',
            },
            {
                key: 'brokerage_contract_review',
                label: '국제결혼중개 계약 검토',
                creditCost: 15,
                instruction: '국제결혼중개 총비용, 납입시기, 제휴업체, 환불, 비자·입국수속 범위를 중심으로 계약 검토표와 수정문구 초안을 작성한다.',
            },
            {
                key: 'premarital_property_agreement',
                label: '혼인 전 재산약정',
                creditCost: 30,
                instruction: '혼인 전 보유재산, 채무, 생활비, 송금, 혼인 중 취득재산을 정리한 부부재산약정 초안을 작성한다. 양 당사자 이해충돌과 혼인 전 등기 검토를 필수 경고한다.',
            },
            ...SHARED_DOCUMENTS,
        ],
    },
    study: {
        id: 'study',
        label: '유학생 비자',
        description: '어학연수·학위과정 입학부터 D-2·D-4 사증 발급까지',
        visaTypes: ['D-2', 'D-4'],
        obligationSet: null,
        requirementSet: 'study_finance',
        recurring: false,
        stages: [
            { id: 'intake', label: '상담 접수', description: '지원자 학력·어학 수준 확인' },
            { id: 'admission', label: '입학 절차', description: '학교 지원과 입학허가서 수령' },
            { id: 'finance', label: '재정 확인', description: '학비·체재비 잔고 증명 준비' },
            { id: 'documents', label: '서류 준비', description: '학력·경력 서류 인증과 번역' },
            { id: 'submitted', label: '접수 완료', description: '공관 사증 신청 접수' },
            { id: 'approved', label: '발급 완료', description: '사증 발급과 입국 후 등록 안내' },
        ],
        documents: [
            {
                key: 'study_application_package',
                label: '유학 사증 신청 패키지',
                creditCost: 30,
                instruction: '유학 사증 신청용 지원자 요약, 학업 동기, 재정능력과 귀국 의사 입증 구조, 누락서류 목록을 작성한다. 발급 가능성을 보장하지 않는다.',
            },
            {
                key: 'study_purpose_statement',
                label: '학업계획서 초안',
                creditCost: 20,
                instruction: '지원 학교·전공 선택 이유, 학업 계획, 졸업 후 계획을 사실 자료에 근거해 구성한다. 확인되지 않은 경력이나 성적을 만들지 않는다.',
            },
            {
                key: 'admission_document_review',
                label: '입학허가·재정증명 검토',
                creditCost: 15,
                instruction: '입학허가서, 잔고증명, 학비 납입증명의 명의·금액·기간이 사증 요건과 맞는지 점검표를 작성하고 부족한 부분을 지적한다.',
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
                creditCost: 20,
                instruction: '연장 신청용 체류 이력 요약, 연장 사유, 생계·거주 유지 입증 구조와 누락서류 목록을 작성한다. 허가를 보장하지 않는다.',
            },
            {
                key: 'status_change_review',
                label: '체류자격 변경 검토',
                creditCost: 25,
                instruction: '현재 자격에서 목표 자격으로의 변경 가능성, 요건 충족 여부, 사전 준비사항을 점검표로 정리한다. 불확실한 부분은 변호사 확인 항목으로 남긴다.',
            },
            ...SHARED_DOCUMENTS,
        ],
    },
};
export const TRACK_IDS = Object.keys(TRACKS);
/** 모든 트랙의 문서를 키로 찾을 수 있게 펼친 표. 같은 키는 트랙 간 정의가 동일하다. */
export const DOCUMENT_BY_KEY = (() => {
    const table = {};
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
export function findDocument(key) {
    return DOCUMENT_BY_KEY[key] ?? null;
}
