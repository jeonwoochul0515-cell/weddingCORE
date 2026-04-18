/**
 * 결혼중개업 법적 의무 42개 템플릿 (v0.2)
 *
 * 작성 관점: 국제결혼 분쟁(혼인무효·사기결혼·손해배상·F-6 불허) 실무 변호사
 *
 * 법적 근거 체계:
 * - 결혼중개업의 관리에 관한 법률 / 시행령 / 시행규칙
 * - 민법 (혼인 §807~§828, 불법행위 §750)
 * - 국제사법 (§63 혼인 성립, §64 혼인 방식, §66 이혼 준거법)
 * - 출입국관리법 / 시행규칙 (F-6 체류자격 3종: F-6-1, F-6-2, F-6-3)
 * - 가족관계의 등록 등에 관한 법률 (§20 혼인신고)
 * - 아동복지법 §29의3 (아동학대관련범죄전력 공개)
 * - 소비자기본법, 약관의 규제에 관한 법률, 소비자분쟁해결기준
 * - 여성가족부 결혼중개업 행정처분기준 고시
 *
 * 실무 판례 참조:
 * - 대법원 2020므15896 전원합의체 (혼인무효 사유 확장)
 * - 수원지법 평택지원 손해배상 8,000만원 판결 (업체 신상정보 미제공)
 * - 광주지법 월 30건 혼인무효 인용례 (사기결혼 입증 기준)
 * - 수원지법 안산지원 (사기결혼 형사처벌 - 형법 §347 + §228)
 *
 * ⚠ 본 초안의 최종 법률 검수는 창희 변호사(법률사무소 청송)가 수행해야 하며,
 *   개별 사안 적용 시 각 항목의 법조문 번호·제재 수위를 재확인해야 합니다.
 */
export const OBLIGATION_TEMPLATES = [
    // ===== Stage 1: 계약 전 (5) =====
    {
        code: 'REG_VALID_CHECK',
        stage: 1, category: 'pre_contract',
        title: '국제결혼중개업 등록증 유효성 확인',
        description: '결혼중개업법 제3조에 따라 국내/국제가 구분 등록. 국제결혼중개업은 자본금 1억원 이상, ' +
            '보증보험 가입, 교육이수 등 요건 충족 필수. 등록 관할은 특별자치시·시·군·구청.',
        legalBasis: '결혼중개업법 제3조, 제4조, 시행령 제3조 (국제결혼중개업 등록요건)',
        penaltyRange: '미등록 영업: 3년 이하 징역 또는 3천만원 이하 벌금 (§26). ' +
            '등록요건 미달: 영업정지 → 등록취소 (§18).',
        disputeRisk: '무등록 상태에서 체결된 중개계약은 민법 §103(반사회질서) 또는 §746(불법원인급여) ' +
            '쟁점으로 전액 반환 불능 리스크. 고객 측은 부당이득 반환청구 가능.',
        dueDateRule: { type: 'relative', anchor: 'client_created', offsetDays: 0 },
        requiredEvidence: ['결혼중개업 등록증 사본 (발급일 및 유효기간 확인)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'critical', order: 101,
    },
    {
        code: 'REG_CHANGE_REPORT',
        stage: 1, category: 'pre_contract',
        title: '등록사항 변경 신고 (상호·대표·소재지)',
        description: '변경 사유 발생일로부터 14일 이내 관할 지자체에 변경신고. ' +
            '대표자 변경 시 결격사유(§6) 부재 증명 서류 추가 제출.',
        legalBasis: '결혼중개업법 제5조, 시행규칙 제4조',
        penaltyRange: '미신고: 과태료 200만원 이하 (§27). 허위신고: §18에 따른 영업정지.',
        disputeRisk: '변경신고 미이행 상태에서 체결된 계약은 적법성 다툼 가능. ' +
            '특히 소재지 변경 미신고는 행정처분 통지 송달 누락으로 방어 기회 상실.',
        dueDateRule: { type: 'relative', anchor: 'client_created', offsetDays: 0 },
        requiredEvidence: ['변경신고 수리통지 (해당 시)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 102,
    },
    {
        code: 'AD_COMPLIANCE',
        stage: 1, category: 'pre_contract',
        title: '광고 적법성 심사 (§12)',
        description: '금지 광고 유형: (1) 특정 성·국적·인종·장애 차별, (2) 혼인 성사 보장 과장, ' +
            '(3) 성매매 유인 표현, (4) 미성년 배우자 중개 암시, (5) 허위 후기. ' +
            '오프라인·온라인(블로그·유튜브·카페·중고거래 플랫폼) 모두 적용.',
        legalBasis: '결혼중개업법 제12조 (거짓·과장광고 금지), 시행령 제4조',
        penaltyRange: '행정처분기준(여가부 고시): 1차 경고 → 2차 영업정지 1개월 → 3차 영업정지 3개월 → 4차 등록취소. ' +
            '형사: 2년 이하 징역 또는 2천만원 이하 벌금 (§25의2).',
        disputeRisk: '"보장" "100% 성사" 문구는 민사상 채무불이행 책임 근거로 활용. ' +
            '국적 특정 광고("베트남 미녀" 등)는 인권위 진정 및 형사고발 선례 존재.',
        dueDateRule: { type: 'relative', anchor: 'client_created', offsetDays: 0 },
        requiredEvidence: ['모든 광고물 사본 (발행일·매체 기록)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 103,
    },
    {
        code: 'NOTICE_POSTED',
        stage: 1, category: 'pre_contract',
        title: '영업소 필수 게시물 확인',
        description: '등록증, 대표자 사진, 표준약관, 요금표(회비·수수료 상세), 손해배상책임보험 가입확인서, ' +
            '고객 고충처리 안내문을 영업소에 상시 게시.',
        legalBasis: '결혼중개업법 제8조, 시행규칙 제6조',
        penaltyRange: '1차 시정명령 → 2차 영업정지 15일 → 반복 시 가중.',
        disputeRisk: '요금표 미게시 상태 수수료 청구는 "계약 성립 쟁점" 발생 → 업체 입증책임.',
        dueDateRule: { type: 'relative', anchor: 'client_created', offsetDays: 0 },
        requiredEvidence: ['게시물 사진 (날짜 메타데이터 포함)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 104,
    },
    {
        code: 'INSURANCE_CHECK',
        stage: 1, category: 'pre_contract',
        title: '손해배상책임보험 1억원 이상 가입',
        description: '국제결혼중개업자는 1억원 이상 보증보험 의무 가입. 보험기간 단절 시 신규 계약 체결 금지. ' +
            '보험사: 서울보증보험 등 금융위 인가 보증보험사.',
        legalBasis: '결혼중개업법 제24조의2, 시행령 제3조의2',
        penaltyRange: '미가입·중단: 과태료 500만원 이하 + 영업정지 3개월 → 등록취소.',
        disputeRisk: '보험 미가입 상태에서 고객 피해 발생 시 업체 파산 시 실질 배상 불능. ' +
            '대표자 개인책임(법인격 부인) 청구 실무 사례 증가.',
        dueDateRule: { type: 'relative', anchor: 'client_created', offsetDays: 0 },
        requiredEvidence: ['보증보험 가입증명서 (보험기간 유효)'],
        checkRule: { type: 'document_uploaded', params: { docType: 'insurance_cert' } },
        severity: 'critical', order: 105,
    },
    // ===== Stage 2: 계약 체결 (7) =====
    {
        code: 'CONTRACT_WRITTEN',
        stage: 2, category: 'contract',
        title: '서면계약 체결 (§10)',
        description: '계약 체결 시 반드시 서면. 필수 기재사항 11개: 중개범위, 회원자격, 수수료 금액·지급시기, ' +
            '환불조건(단계별), 계약기간·갱신, 손해배상 책임, 중개인 정보, 양측 서명·날인, ' +
            '계약일자, 특약사항, 분쟁해결 방법.',
        legalBasis: '결혼중개업법 제10조 ①, 시행규칙 제7조 별지 서식',
        penaltyRange: '1차 영업정지 1개월 → 2차 3개월 → 3차 6개월 → 4차 등록취소. 반복·상습 시 형사 §25.',
        disputeRisk: '서면계약 부존재는 소비자 주장대로 사실인정(민사소송법 §288 입증책임). ' +
            '구두 약정만 존재 시 환불 소송에서 업체 거의 전패. 실무상 최고빈도 분쟁 유형.',
        dueDateRule: { type: 'relative', anchor: 'client_created', offsetDays: 7 },
        requiredEvidence: ['양측 서명·날인 계약서 원본 스캔본', '계약서 교부 확인서'],
        checkRule: { type: 'document_uploaded', params: { docType: 'contract' } },
        severity: 'critical', order: 201,
    },
    {
        code: 'CONTRACT_FEE_PROHIBITED',
        stage: 2, category: 'contract',
        title: '금지행위 조항 부재 확인 (§11)',
        description: '계약서에 다음 금지행위 요소가 없는지 확인: (1) 미성년자·피성년후견인 중개, ' +
            '(2) 본인 동의 없는 신상정보 제3자 제공, (3) 강박·기망에 의한 혼인 유도, ' +
            '(4) 선불 고액 회비만 받고 중개 실적 없이 계약 종료, (5) 해외 현지 체류 강요.',
        legalBasis: '결혼중개업법 제11조 (결혼중개업자 등의 금지행위)',
        penaltyRange: '§11 위반: 3년 이하 징역 또는 3천만원 이하 벌금 (§25 1호). 등록취소 병과.',
        disputeRisk: '§11 위반 사실 적발 시 등록취소 + 형사처벌 + 손해배상 + 수수료 반환 4중 책임. ' +
            '업체 존립 가장 위협적 조항.',
        dueDateRule: { type: 'relative', anchor: 'contract_signed', offsetDays: 0 },
        requiredEvidence: ['§11 금지행위 체크리스트 확인서'],
        checkRule: { type: 'manual', params: {} },
        severity: 'critical', order: 202,
    },
    {
        code: 'CONTRACT_REFUND_TERMS',
        stage: 2, category: 'contract',
        title: '단계별 환불조건 명시',
        description: '소비자분쟁해결기준(공정위 고시 제2024-X호) 국제결혼중개업: ' +
            '계약 후 14일 이내 해제: 총액 환급 / 상대방 소개 전: 총액의 80% / ' +
            '1회 맞선 후: 60% / 2회 이상 맞선 후: 40% / 혼인신고 전 단절: 20% / 혼인신고 후: 환급불가.',
        legalBasis: '결혼중개업법 제10조 ① 4호, 소비자분쟁해결기준 (공정위)',
        penaltyRange: '불공정약관: 공정위 시정명령 + 약관법 §17 시정권고. ' +
            '소비자분쟁조정위원회 조정 신청 대응 필수.',
        disputeRisk: '환불조건이 소비자분쟁해결기준보다 불리한 경우 약관법 §6(신의성실원칙)으로 무효. ' +
            '"환불불가" 일방 조항은 예외없이 무효 판단.',
        dueDateRule: { type: 'relative', anchor: 'contract_signed', offsetDays: 0 },
        requiredEvidence: ['단계별 환급률 명시 계약서'],
        checkRule: { type: 'field_filled', params: { field: 'refundTerms' } },
        severity: 'high', order: 203,
    },
    {
        code: 'CONTRACT_LIABILITY',
        stage: 2, category: 'contract',
        title: '손해배상 책임 조항 명시',
        description: '업체의 고의·중과실(허위 신상정보 제공, 사후관리 불이행 등)로 인한 손해 발생 시 ' +
            '배상 범위·산정기준 명시. 정액 상한을 두더라도 민법 §103 한계 내.',
        legalBasis: '결혼중개업법 제10조 ① 7호, 제24조의2, 민법 §750',
        penaltyRange: '§24의2 위반: 영업정지. 실제 분쟁은 민사소송으로 진행.',
        disputeRisk: '손해배상 상한을 "계약금의 2배"로 두는 관행이 많으나, 판례(대법 2018다248401 등)는 ' +
            '업체 귀책이 중대한 경우 상한 무효화. 평택지원 판결 8,000만원은 상한 없는 사례.',
        dueDateRule: { type: 'relative', anchor: 'contract_signed', offsetDays: 0 },
        requiredEvidence: ['배상책임 조항 포함 계약서'],
        checkRule: { type: 'field_filled', params: { field: 'liabilityTerms' } },
        severity: 'high', order: 204,
    },
    {
        code: 'CONTRACT_SCOPE',
        stage: 2, category: 'contract',
        title: '계약기간·중개범위·성혼 정의',
        description: '"성혼" 정의를 명확히 (혼인신고 완료? 맞선 성사? 입국? F-6 취득?). ' +
            '계약기간은 통상 2년, 성혼 미완성 시 연장·환불 조건 명시.',
        legalBasis: '결혼중개업법 제10조 ① 2호, 3호',
        penaltyRange: '시정명령',
        disputeRisk: '"성혼" 정의 모호는 분쟁 1위 원인. "맞선 3회 = 성혼"으로 주장하는 업체 vs ' +
            '"혼인신고 완료 = 성혼"으로 주장하는 고객 사이 다툼 빈번.',
        dueDateRule: { type: 'relative', anchor: 'contract_signed', offsetDays: 0 },
        requiredEvidence: ['계약서 범위·기간 조항'],
        checkRule: { type: 'field_filled', params: { field: 'scopeTerms' } },
        severity: 'medium', order: 205,
    },
    {
        code: 'CONTRACT_UNFAIR_CLAUSE',
        stage: 2, category: 'contract',
        title: '불공정 약관 제거 (약관법 §6~§14)',
        description: '자주 적발되는 불공정 조항: (1) 업체 면책 포괄조항, (2) 일방적 계약해지권, ' +
            '(3) 과도한 위약금(총액의 50% 이상), (4) 개인정보 무제한 이용 동의 강제, ' +
            '(5) 분쟁 전속관할을 업체 소재지로 고정, (6) 해외 에이전트 책임 전가.',
        legalBasis: '약관의 규제에 관한 법률 제6조 내지 제14조',
        penaltyRange: '공정위 시정명령 → 과태료 → 형사 (§32의2).',
        disputeRisk: '약관법 §6 무효 판단 시 해당 조항만 무효(§16 일부무효) → 업체에 불리한 표준해석 적용.',
        dueDateRule: { type: 'relative', anchor: 'contract_signed', offsetDays: 0 },
        requiredEvidence: ['AI 약관 분석 리포트', '변호사 검토 의견 (선택)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 206,
    },
    {
        code: 'CONTRACT_TRANSLATION',
        stage: 2, category: 'contract',
        title: '계약서 모국어 번역 교부',
        description: '외국인 배우자가 이해할 수 있는 모국어(베트남어·크메르어·중국어·우즈벡어 등) ' +
            '완역본 교부. "요약본"은 의무 불이행으로 판단. 번역 주체는 자격 있는 번역사 권장.',
        legalBasis: '결혼중개업법 제10조의2 ③ (준용), 대법원 2019다256399 참조',
        penaltyRange: '시정명령 → 영업정지 1개월.',
        disputeRisk: '모국어 번역 미교부 상태에서 이혼·혼인무효 분쟁 발생 시 ' +
            '외국인 배우자의 "의사표시 하자"(민법 §109 착오) 주장으로 계약·혼인 무효 리스크.',
        dueDateRule: { type: 'relative', anchor: 'contract_signed', offsetDays: 7 },
        requiredEvidence: ['모국어 번역 계약서', '번역자 서명', '외국인 배우자 수령확인서'],
        checkRule: { type: 'translation_completed', params: { docType: 'contract' } },
        severity: 'high', order: 207,
    },
    // ===== Stage 3: 맞선 준비 (10) — 행정처분 최다 단계 =====
    {
        code: 'BG_KOR_MARITAL_HISTORY',
        stage: 3, category: 'pre_meeting',
        title: '한국인 측 혼인경력 서면제공',
        description: '혼인경력(미혼·이혼·사별)과 횟수, 자녀 유무·양육권 서면 제공. ' +
            '허위 기재 시 혼인무효 사유(민법 §815 4호 "사기로 인한 혼인").',
        legalBasis: '결혼중개업법 제10조의2 ① 1호',
        penaltyRange: '1차 영업정지 1개월 → 2차 3개월 → 3차 등록취소 (여가부 고시 기준).',
        disputeRisk: '"혼인경력 허위" 사기결혼 형사고소(형법 §347) 다수 사례. ' +
            '업체가 확인 불이행 시 공동 민사책임. 대법 2018다248401 참조.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['혼인관계증명서(상세) 3개월 이내 발급본'],
        checkRule: { type: 'document_uploaded', params: { docType: 'marital_cert', subject: 'korean' } },
        severity: 'critical', order: 301,
    },
    {
        code: 'BG_KOR_HEALTH',
        stage: 3, category: 'pre_meeting',
        title: '한국인 측 건강상태 서면제공',
        description: '중대 질병, 장애, 정신질환, 전염병(HIV 등), 약물·알코올 의존 이력. ' +
            '미고지는 혼인취소 사유(민법 §816 2호 "악질 기타 중대사유") 성립 가능.',
        legalBasis: '결혼중개업법 제10조의2 ① 2호',
        penaltyRange: '1차 영업정지 1개월 → 3개월 → 등록취소.',
        disputeRisk: '조현병·중증 우울증·간질 등 미고지로 입국 후 발견 사례 빈번. ' +
            '외국인 배우자의 혼인취소 청구 시 업체는 신상정보 확인 의무 해태로 공동책임.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['건강진단서(6개월 이내)', '정신건강 관련 진단서 (해당 시)'],
        checkRule: { type: 'document_uploaded', params: { docType: 'health_cert', subject: 'korean' } },
        severity: 'critical', order: 302,
    },
    {
        code: 'BG_KOR_CRIMINAL',
        stage: 3, category: 'pre_meeting',
        title: '한국인 측 범죄경력 + 아동학대 이력 공개',
        description: '성범죄·가정폭력·아동학대관련범죄는 별도 공개 의무. ' +
            '아동학대전력자는 아동복지법 §29의3에 따라 결혼중개 단계에서 공개 필수.',
        legalBasis: '결혼중개업법 제10조의2 ① 3호, 아동복지법 §29의3, 성폭력특별법, ' +
            '아동·청소년의 성보호에 관한 법률 §56',
        penaltyRange: '1차 영업정지 3개월 → 2차 등록취소. 형사: §25.',
        disputeRisk: '아동학대·가정폭력 전력 미공개는 F-6 비자 취소 사유. ' +
            '입국 후 폭력 재발 시 외국인 배우자 쉼터 입소 → 혼인무효·이혼 + 손해배상 + 업체 귀책.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['범죄경력회보서(관할 경찰서)', '아동학대관련범죄전력 조회결과'],
        checkRule: { type: 'document_uploaded', params: { docType: 'criminal_record', subject: 'korean' } },
        severity: 'critical', order: 303,
    },
    {
        code: 'BG_KOR_INCOME',
        stage: 3, category: 'pre_meeting',
        title: '한국인 측 직업·소득·재산 서면제공',
        description: '직업·연소득(최근 3년)·재산·채무 서면 제공. F-6 비자 소득요건 연계. ' +
            '가구원수별 기준: 2인 기준 약 2,000만원, 3인 약 2,600만원(연도별 갱신).',
        legalBasis: '결혼중개업법 제10조의2 ① 4호, 출입국관리법 §10조의2',
        penaltyRange: '1차 영업정지 1개월 → 3개월 → 등록취소.',
        disputeRisk: '소득 허위 과장은 F-6 불허 원인이자 외국인 배우자 입장에서 "경제 기망" 주장 근거. ' +
            '혼인무효 인용 확률 상승.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['재직증명서', '소득금액증명원(세무서)', '부채증명(희망)'],
        checkRule: { type: 'document_uploaded', params: { docType: 'income_proof', subject: 'korean' } },
        severity: 'high', order: 304,
    },
    {
        code: 'BG_PARTNER_MARITAL_HISTORY',
        stage: 3, category: 'pre_meeting',
        title: '외국인 측 혼인경력 확인',
        description: '본국 혼인관계증명(베트남: 결혼상황확인서, 캄보디아: 독신증명서, 중국: 무혼인기록증명). ' +
            '아포스티유 또는 영사확인 필수. 자녀 유무·양육권 포함.',
        legalBasis: '결혼중개업법 제10조의2 ① 1호, ②, 국제사법 §63',
        penaltyRange: '1차 영업정지 1개월 → 3개월 → 등록취소.',
        disputeRisk: '본국 이혼 미정리 상태의 재혼은 중혼으로 혼인 무효(§815 1호). ' +
            '베트남 호치민 지역 인증서류 위조 사례 다수, 현지 에이전트 검증 필수.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['본국 혼인관계 증명 (아포스티유/영사확인)', '번역 공증본'],
        checkRule: { type: 'document_uploaded', params: { docType: 'marital_cert', subject: 'partner' } },
        severity: 'critical', order: 305,
    },
    {
        code: 'BG_PARTNER_HEALTH',
        stage: 3, category: 'pre_meeting',
        title: '외국인 측 건강상태 확인',
        description: '본국 공인 의료기관 발급 건강진단서. HIV·결핵·B형간염·임신여부 포함. ' +
            'F-6 비자 심사 시 별도 제출 서류와 동일 기관 기준 권장.',
        legalBasis: '결혼중개업법 제10조의2 ① 2호, ②',
        penaltyRange: '1차 영업정지 1개월 → 3개월 → 등록취소.',
        disputeRisk: '임신 사실 미고지 후 입국 사례에서 혼인취소 청구 패턴. ' +
            '업체는 확인 의무 해태로 공동책임.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['본국 건강진단서(6개월 이내)', '임신검사 결과(여성 필수)'],
        checkRule: { type: 'document_uploaded', params: { docType: 'health_cert', subject: 'partner' } },
        severity: 'critical', order: 306,
    },
    {
        code: 'BG_PARTNER_CRIMINAL',
        stage: 3, category: 'pre_meeting',
        title: '외국인 측 범죄경력 확인',
        description: '본국 경찰 발급 범죄경력증명. 아포스티유 또는 한국 영사확인. ' +
            '통상 6개월 이내 발급본만 유효. 불법체류·출국정지 이력 병행 확인.',
        legalBasis: '결혼중개업법 제10조의2 ① 3호, ②',
        penaltyRange: '1차 영업정지 3개월 → 등록취소.',
        disputeRisk: '전과 미공개 상태의 매매혼·위장결혼은 출입국 사기죄로 업체 공동정범 리스크.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -7 },
        requiredEvidence: ['본국 범죄경력 증명(아포스티유/영사확인)', '번역 공증본'],
        checkRule: { type: 'document_uploaded', params: { docType: 'criminal_record', subject: 'partner' } },
        severity: 'critical', order: 307,
    },
    {
        code: 'BG_TRANSLATION',
        stage: 3, category: 'pre_meeting',
        title: '신상정보 모국어 전문 번역',
        description: '양측 신상정보 전체를 상대방 모국어로 전문 번역. 요약·발췌본 불가. ' +
            '번역 주체는 자격 번역사 또는 검증된 번역 AI + 검수자 이중검토.',
        legalBasis: '결혼중개업법 제10조의2 ③, 시행규칙 별지 제2호서식',
        penaltyRange: '1차 영업정지 1개월 → 3개월 → 등록취소.',
        disputeRisk: '번역 부정확·누락은 외국인 배우자의 착오·기망 주장 근거. ' +
            '혼인무효 인용 사례에서 "모국어 이해 불가"가 핵심 쟁점.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -3 },
        requiredEvidence: ['번역본 원문 대조 기록', '번역자 성명·자격증'],
        checkRule: {
            type: 'translation_completed',
            params: { docTypes: ['background_info', 'marital_cert', 'criminal_record', 'health_cert'] },
        },
        severity: 'critical', order: 308,
    },
    {
        code: 'BG_MUTUAL_DELIVERY',
        stage: 3, category: 'pre_meeting',
        title: '상호 서면제공 + 수령확인 + 설명',
        description: '양측이 상대방 신상정보를 서면으로 수령, 내용 설명을 듣고, 이해 확인 서명. ' +
            '통역 입회 + 타임스탬프 기록 필수. 제공 주체·일시·장소·방법 기록.',
        legalBasis: '결혼중개업법 제10조의2 ①, ④, 시행규칙 §8의2',
        penaltyRange: '1차 영업정지 1개월 → 3개월 → 등록취소.',
        disputeRisk: '"받았지만 설명 못 들었다" 주장 빈번. 설명 영상 녹화 또는 3자 입회 기록이 핵심.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: -1 },
        requiredEvidence: ['양측 서명·날인 수령확인서', '설명 영상 또는 녹취', '통역자 입회 기록'],
        checkRule: { type: 'manual', params: {} },
        severity: 'critical', order: 309,
    },
    {
        code: 'BG_CERTIFICATE',
        stage: 3, category: 'pre_meeting',
        title: '신상정보 교환완료 증명서 발급 및 3년 보관',
        description: '결혼중개업법 §10의2 이행 완료를 입증하는 증명서 발급. 3년간 의무 보관. ' +
            '행정처분·소송 시 결정적 증거.',
        legalBasis: '결혼중개업법 제10조의2 ④, 시행규칙 제8조 (보관의무 3년)',
        penaltyRange: '미보관: 과태료 500만원 이하. 허위보관: 형사 §25.',
        disputeRisk: '업체가 가장 많이 분실하는 서류. 행정처분 방어·민사 항변의 핵심 증거이므로 ' +
            '반드시 전자 보관(해시·타임스탬프) 권장.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: 0 },
        requiredEvidence: ['교환완료 증명서 (해시 기록 포함)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'critical', order: 310,
    },
    // ===== Stage 4: 맞선·혼인 (6) =====
    {
        code: 'MEETING_RECORD',
        stage: 4, category: 'meeting',
        title: '맞선 일정·장소·참석자 기록',
        description: '맞선 일시, 장소, 참석자(양측+통역자+중개사), 진행 내용 요지 기록. ' +
            '양측 의사소통 가능 여부·분위기 등 특이사항 포함.',
        legalBasis: '결혼중개업법 제10조의3, 시행규칙 §8의3',
        penaltyRange: '시정명령 → 영업정지 15일.',
        disputeRisk: '맞선 기록 부재 시 업체가 "실제 중개 수행" 입증 불가 → 수수료 반환 소송 패소.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: 0 },
        requiredEvidence: ['맞선 기록부', '사진(동의 시)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 401,
    },
    {
        code: 'MEETING_INTERPRETER',
        stage: 4, category: 'meeting',
        title: '자격 통역자 배치 (이해관계인 배제)',
        description: '업체 대표·직원·가족 등 이해관계인은 통역 금지. ' +
            '중립 자격 통역자(한국어능력시험 + 해당국 언어 공인 자격 또는 공인번역사) 배치.',
        legalBasis: '결혼중개업법 제10조의2 ③, 시행규칙 §8의2',
        penaltyRange: '시정명령 → 영업정지 1개월.',
        disputeRisk: '이해관계인 통역은 "공정성 결여" 사유로 혼인무효 쟁점화. ' +
            '실제 판례에서 업체 사장 가족이 통역한 사안이 다수 패소.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: 0 },
        requiredEvidence: ['통역자 이력·자격증', '이해관계 없음 확인서'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 402,
    },
    {
        code: 'MARRIAGE_LOCAL_LAW',
        stage: 4, category: 'meeting',
        title: '국제사법상 혼인요건 확인',
        description: '국제사법 §63: 혼인 성립요건은 각 당사자 본국법. ' +
            '예: 베트남 혼인법 최저연령(여 18세·남 20세), 캄보디아(18세), 한국(18세). ' +
            '동의능력·중혼금지·근친혼 제한 병행 확인.',
        legalBasis: '국제사법 제63조 (혼인의 성립), 제64조 (혼인의 방식)',
        penaltyRange: '요건 미충족 시 혼인 자체가 무효·취소 사유.',
        disputeRisk: '본국법 최저연령 위반은 한국에서도 혼인 무효. F-6 비자 불허 직결.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: 7 },
        requiredEvidence: ['본국법 혼인요건 확인서', '외국 변호사·공증인 의견(고위험 시)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 403,
    },
    {
        code: 'MARRIAGE_REG_GUIDANCE',
        stage: 4, category: 'meeting',
        title: '혼인신고 절차 모국어 안내',
        description: '한국 혼인신고 필요서류: 혼인신고서, 양측 혼인관계증명, 외국인 여권, ' +
            '본국 혼인요건 증명서, 번역 공증본. 주소지 또는 본적지 구청 접수.',
        legalBasis: '가족관계의 등록 등에 관한 법률 제20조, 결혼중개업법 §10의3',
        penaltyRange: '시정명령',
        disputeRisk: '서류 누락으로 혼인신고 반려 → 체류 기한 임박 → 외국인 재입국 강제 사례.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: 14 },
        requiredEvidence: ['모국어 안내문 교부 기록'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 404,
    },
    {
        code: 'MARRIAGE_REG_COMPLETE',
        stage: 4, category: 'meeting',
        title: '혼인신고 완료 증빙 확보',
        description: '혼인신고 수리증명서 또는 신혼 혼인관계증명서 확보. ' +
            'F-6 비자 신청의 필수 선행조건.',
        legalBasis: '가족관계의 등록 등에 관한 법률, 출입국관리법 §10의2',
        penaltyRange: '—',
        disputeRisk: '혼인신고 완료 없이 F-6 신청 시 자동 반려. 업체 중개 실패로 인정.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 30 },
        requiredEvidence: ['혼인관계증명서 (혼인 후 발급)', '외국인 등록 완료증'],
        checkRule: { type: 'document_uploaded', params: { docType: 'marital_cert' } },
        severity: 'high', order: 405,
    },
    {
        code: 'MARRIAGE_INTENT',
        stage: 4, category: 'meeting',
        title: '양측 결혼 진정의사 확인 (민법 §815)',
        description: '혼인의사 없는 혼인은 무효(민법 §815 1호). ' +
            '한국 입국·취업 목적만으로 결혼 동의한 경우 혼인무효 사유. ' +
            '양측의 공동생활 의사·한국 정착 의사 서면 확인.',
        legalBasis: '민법 제815조 (혼인의 무효), 대법원 2020므15896 전원합의체',
        penaltyRange: '혼인무효 인용 시 업체 중개수수료 반환 책임.',
        disputeRisk: '2020므15896 판결 이후 "혼인의사 부재" 혼인무효 인용 확대. ' +
            '업체는 진정의사 확인 의무 해태로 공동책임.',
        dueDateRule: { type: 'relative', anchor: 'meeting_scheduled', offsetDays: 14 },
        requiredEvidence: ['양측 진정의사 확인서', '상호 교제·연락 기록'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 406,
    },
    // ===== Stage 5: F-6 비자 (8) =====
    {
        code: 'VISA_INCOME_CHECK',
        stage: 5, category: 'visa',
        title: 'F-6 소득요건 충족 확인 (GNI 연동)',
        description: '초청인 가구원수별 연소득 기준: 전년도 GNI × 계수. ' +
            '재산 환산: 순자산 × 5% ÷ 12 (월 환산 후 연소득에 합산). ' +
            '동거 직계가족 소득 합산 가능. 2024년 기준 2인 약 2,000만원, 3인 약 2,600만원.',
        legalBasis: '출입국관리법 시행규칙 별표 1의2, 외국국적 배우자 체류관리 지침 (법무부)',
        penaltyRange: '소득요건 미달: F-6 불허. 재신청은 요건 충족 시 가능.',
        disputeRisk: '소득요건 미달이 가장 흔한 불허 사유. 사전 시뮬레이터 필수. ' +
            '불허 후 이의신청(§92의2) 또는 행정소송 가능하나 실익 낮음.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 30 },
        requiredEvidence: ['소득금액증명원', '재산 증명(부동산등기·예금잔액)', '가구원 소득 증명'],
        checkRule: { type: 'document_uploaded', params: { docType: 'income_proof', subject: 'korean' } },
        severity: 'critical', order: 501,
    },
    {
        code: 'VISA_HOUSING_CHECK',
        stage: 5, category: 'visa',
        title: '주거요건 확인',
        description: '배우자와 거주 가능한 주거지 확인 (자가·전세·월세 가능). ' +
            '원룸·고시원·무주택자 상태는 실질 심사에서 감점. 부모 동거 시 동의서 필요.',
        legalBasis: 'F-6 심사지침 (법무부 출입국·외국인정책본부)',
        penaltyRange: '주거 부적합: 불허 사유.',
        disputeRisk: '무주택자·비정상 주거 상태는 "혼인 진정성 의심" 근거로 사용됨.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 30 },
        requiredEvidence: ['주민등록등본', '임대차계약서 또는 등기부등본', '주거사진'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 502,
    },
    {
        code: 'VISA_SINCERITY_EVIDENCE',
        stage: 5, category: 'visa',
        title: '혼인 진정성 증빙 포트폴리오',
        description: '필수 증빙: (1) 교제 사진 20장 이상(양측·시간대별), (2) 메시지·영상통화 기록, ' +
            '(3) 상호 방문 항공권·숙박, (4) 상호 선물·송금 기록, ' +
            '(5) 양가 인사 사진, (6) 의사소통 언어 능력 증빙(기본 대화 수준).',
        legalBasis: '출입국관리법 제10조의2, F-6 심사지침',
        penaltyRange: '진정성 부족: 불허. 6개월 후 재신청.',
        disputeRisk: '의사소통 언어 부재가 2순위 불허 사유. 사전에 한국어·모국어 기초교육 필요.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 45 },
        requiredEvidence: ['진정성 포트폴리오 (PDF 자동생성)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'critical', order: 503,
    },
    {
        code: 'VISA_PROGRAM_COMPLETED',
        stage: 5, category: 'visa',
        title: '결혼이민사전안내프로그램 이수 (초청인)',
        description: '한국인 초청인 의무 이수. 온라인(IOM·법무부)·오프라인 가능. ' +
            '미이수 시 F-6 접수 자체 불가. 이수증 1년 유효.',
        legalBasis: '출입국관리법 제79조의2, 시행규칙 §9의6',
        penaltyRange: '미이수: 비자 접수 자체 거절.',
        disputeRisk: '가장 단순하나 누락 빈번. 업체 체크리스트 상위 배치 필수.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 30 },
        requiredEvidence: ['사전안내프로그램 이수증'],
        checkRule: { type: 'document_uploaded', params: { docType: 'other' } },
        severity: 'critical', order: 504,
    },
    {
        code: 'VISA_DOC_VALIDITY',
        stage: 5, category: 'visa',
        title: 'F-6 서류 20종 유효기간 일괄 점검',
        description: '신청 접수 시점 기준 모든 서류 유효. 범죄경력·건강진단 6개월, ' +
            '혼인관계·소득 3개월, 주민등록등본 1개월, 여권 6개월 이상 잔여.',
        legalBasis: '출입국관리법 시행규칙 제76조',
        penaltyRange: '반려 + 재접수 지연 (2-3개월).',
        disputeRisk: '한 서류만 만료되어도 전체 반려. 업체 실수로 가장 많이 발생.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 60 },
        requiredEvidence: ['20종 서류 유효기간 체크리스트'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 505,
    },
    {
        code: 'VISA_APPLIED',
        stage: 5, category: 'visa',
        title: 'F-6 비자 신청 접수',
        description: '재외공관(현지) 신청 또는 국내 체류자격 변경. ' +
            '재외공관 접수 소요 30-90일, 체류자격 변경 14일.',
        legalBasis: '출입국관리법 제7조, 제24조',
        penaltyRange: '—',
        disputeRisk: '접수번호 미보관 시 진행상황 추적 불가.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 90 },
        requiredEvidence: ['비자 접수증', '접수번호'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 506,
    },
    {
        code: 'VISA_DENIAL_RESPONSE',
        stage: 5, category: 'visa',
        title: '불허 대응 (이의신청·행정소송)',
        description: '불허통지 수령 후 90일 이내 이의신청(§92의2) 또는 행정소송. ' +
            '이의신청 인용률 20-30%. 행정소송은 소득요건 미달 사안에서 실익 낮음.',
        legalBasis: '출입국관리법 제92조의2, 행정소송법',
        penaltyRange: '—',
        disputeRisk: '불허 사유가 "진정성 부족"인 경우 추가 증거 확보 후 6개월 후 재신청 권장. ' +
            '"중대 범죄 전력"인 경우 이의신청 실익 없음.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 180 },
        requiredEvidence: ['불허통지서', '이의신청서 (해당 시)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 507,
    },
    {
        code: 'VISA_REAPPLY_PREP',
        stage: 5, category: 'visa',
        title: '재신청 전 보완 조치 확인',
        description: '불허 사유별 보완: 소득 → 재산 환산/직장 증명 강화, ' +
            '진정성 → 추가 방문·의사소통 증빙 보강, ' +
            '건강 → 치료 완료 진단서, 범죄 → 관련 없는 전과는 시간 경과 기다림.',
        legalBasis: 'F-6 심사지침',
        penaltyRange: '—',
        disputeRisk: '재신청 실패 시 외국인 배우자 귀국 → 실질적 혼인 유지 불가.',
        dueDateRule: { type: 'relative', anchor: 'marriage_registered', offsetDays: 180 },
        requiredEvidence: ['보완 사항 체크리스트', '사유별 추가 서류'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 508,
    },
    // ===== Stage 6: 사후관리 (6) =====
    {
        code: 'AFTERCARE_1M',
        stage: 6, category: 'aftercare',
        title: '입국 후 1개월 사후관리',
        description: '안부 확인, 외국인등록(90일 이내 의무) 진행상황 점검, ' +
            '언어·문화 충격·시댁 갈등 초기 신호 감지.',
        legalBasis: '결혼중개업법 제10조의4, 다문화가족지원법 §6',
        penaltyRange: '시정명령 → 영업정지 15일.',
        disputeRisk: '1개월 내 "도주"가 사기결혼 의심 시점. 이 시점 기록이 업체 방어의 핵심.',
        dueDateRule: { type: 'relative', anchor: 'entry_date', offsetDays: 30 },
        requiredEvidence: ['사후관리 체크 기록', '대화 녹취/문자(동의 시)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 601,
    },
    {
        code: 'AFTERCARE_3M',
        stage: 6, category: 'aftercare',
        title: '입국 후 3개월 사후관리',
        description: '의사소통·시댁 갈등·경제 지원 문제 점검. ' +
            '가출·연락두절 위험 신호 포착 시 다문화센터·변호사 즉시 연계.',
        legalBasis: '결혼중개업법 제10조의4',
        penaltyRange: '시정명령.',
        disputeRisk: '"3개월 안에 가출" 사례가 통계상 가장 많은 분쟁 유형. ' +
            '이 시점 기록 부재 시 업체 책임 가중.',
        dueDateRule: { type: 'relative', anchor: 'entry_date', offsetDays: 90 },
        requiredEvidence: ['사후관리 체크 기록'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 602,
    },
    {
        code: 'AFTERCARE_6M',
        stage: 6, category: 'aftercare',
        title: '입국 후 6개월 사후관리',
        description: '임신·출산 여부, 경제생활, 취업 희망 등 생활 안정도 점검.',
        legalBasis: '결혼중개업법 제10조의4',
        penaltyRange: '시정명령.',
        disputeRisk: '임신 중 가출은 양육권·국적·체류 복합 분쟁. 사전 관리로 예방.',
        dueDateRule: { type: 'relative', anchor: 'entry_date', offsetDays: 180 },
        requiredEvidence: ['사후관리 체크 기록'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 603,
    },
    {
        code: 'AFTERCARE_12M',
        stage: 6, category: 'aftercare',
        title: '입국 후 12개월 사후관리 (최종)',
        description: '결혼 후 1년 종합 점검. F-5(영주) 또는 F-6-2(자녀양육) 자격 전환 안내. ' +
            '국적취득(특별귀화 §7) 요건 충족 여부.',
        legalBasis: '결혼중개업법 제10조의4, 국적법 제7조',
        penaltyRange: '시정명령 → 영업정지.',
        disputeRisk: '12개월 시점 기록으로 "정상 혼인생활" 객관적 입증 가능.',
        dueDateRule: { type: 'relative', anchor: 'entry_date', offsetDays: 365 },
        requiredEvidence: ['사후관리 최종 보고서', '외국인 배우자 자필 소감(선택)'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 604,
    },
    {
        code: 'AFTERCARE_CENTER_LINK',
        stage: 6, category: 'aftercare',
        title: '다문화가족지원센터 연계',
        description: '관할 지역 다문화가족지원센터 프로그램(한국어·취업·육아·법률상담) 안내. ' +
            '1366 여성긴급전화, 다누리콜센터(1577-1366) 모국어 연결.',
        legalBasis: '다문화가족지원법 제6조, 제12조, 제12조의2',
        penaltyRange: '—',
        disputeRisk: '위기 상황에서 센터 연계 기록이 업체의 적극적 보호 의무 이행 증빙.',
        dueDateRule: { type: 'relative', anchor: 'entry_date', offsetDays: 30 },
        requiredEvidence: ['센터 연계 안내 기록', '모국어 안내자료 교부'],
        checkRule: { type: 'manual', params: {} },
        severity: 'medium', order: 605,
    },
    {
        code: 'AFTERCARE_ARCHIVE',
        stage: 6, category: 'aftercare',
        title: '전 단계 서류 3년 보관 (감사대비)',
        description: '계약서·신상정보·번역본·수령확인서·사후관리 기록 전부 3년 이상 보관. ' +
            '전자 보관 시 해시·타임스탬프로 무결성 입증 가능해야 함.',
        legalBasis: '결혼중개업법 제10조의5, 시행규칙 제8조',
        penaltyRange: '미보관·허위보관: 과태료 500만원 + 영업정지.',
        disputeRisk: '3년 이내 제기된 모든 분쟁의 1차 증거. 보관 실패는 업체 패소 직결.',
        dueDateRule: { type: 'relative', anchor: 'entry_date', offsetDays: 365 },
        requiredEvidence: ['전체 서류 아카이브 완료 확인'],
        checkRule: { type: 'manual', params: {} },
        severity: 'high', order: 606,
    },
];
