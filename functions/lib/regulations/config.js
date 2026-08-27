/**
 * 비자 실무에서 근거로 삼는 법령 목록.
 * 조문은 regulations/{statuteId}/articles 에 저장되고, 문서 생성 시 근거로 주입한다.
 * 판례·해석례·재결례는 별도 컬렉션으로 수집한다 (docs/LEGAL_ENGINE.md 참조).
 */
export const MONITORED_STATUTES = [
    // ── 세 사업 공통 (체류자격·사증 일반)
    {
        statuteId: 'immigration-control-act',
        lawName: '출입국관리법',
        priority: 'critical',
        tracks: ['marriage', 'study', 'extension'],
    },
    {
        statuteId: 'immigration-control-act-enforcement-decree',
        lawName: '출입국관리법 시행령',
        priority: 'critical',
        tracks: ['marriage', 'study', 'extension'],
    },
    {
        statuteId: 'immigration-control-act-enforcement-rule',
        lawName: '출입국관리법 시행규칙',
        priority: 'critical',
        tracks: ['marriage', 'study', 'extension'],
    },
    {
        statuteId: 'nationality-act',
        lawName: '국적법',
        priority: 'medium',
        tracks: ['marriage', 'extension'],
    },
    // ── 결혼중개
    {
        statuteId: 'marriage-brokerage-act',
        lawName: '결혼중개업의 관리에 관한 법률',
        priority: 'critical',
        tracks: ['marriage'],
    },
    {
        statuteId: 'marriage-brokerage-act-enforcement-decree',
        lawName: '결혼중개업의 관리에 관한 법률 시행령',
        priority: 'high',
        tracks: ['marriage'],
    },
    {
        statuteId: 'marriage-brokerage-act-enforcement-rule',
        lawName: '결혼중개업의 관리에 관한 법률 시행규칙',
        priority: 'high',
        tracks: ['marriage'],
    },
    {
        statuteId: 'multicultural-families-support-act',
        lawName: '다문화가족지원법',
        priority: 'high',
        tracks: ['marriage'],
    },
    {
        statuteId: 'international-private-law',
        lawName: '국제사법',
        priority: 'medium',
        tracks: ['marriage'],
    },
    {
        statuteId: 'civil-act',
        lawName: '민법',
        priority: 'medium',
        tracks: ['marriage'],
    },
    // ── 유학
    {
        statuteId: 'higher-education-act',
        lawName: '고등교육법',
        priority: 'medium',
        tracks: ['study'],
    },
];
/** 판례·해석례·재결례 수집 대상. 사증 거부와 체류 불허 쟁점을 우선한다. */
export const LEGAL_SOURCES = {
    precedent: {
        target: 'prec',
        queries: [
            '사증발급거부처분취소',
            '체류기간연장불허가처분취소',
            '혼인무효',
            '결혼중개업',
            '체류자격변경불허가',
        ],
    },
    interpretation: {
        target: 'expc',
        queries: ['출입국관리법', '결혼중개업', '체류자격'],
    },
};
export const LAW_GO_KR_BASE = 'https://www.law.go.kr/DRF';
