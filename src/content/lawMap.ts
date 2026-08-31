// 결혼중개업법 조문 지도 — 이 법이 무엇을 요구하고, 우리 시스템 어디서 관리하는가
//
// 조문 원문을 그대로 옮기지 않는다. 법제처가 정본이고 개정도 그쪽이 빠르다.
// 여기서 하는 일은 조문마다 "무엇을 요구하는 조항인지" 한 줄로 알려주고,
// 우리 시스템의 어느 기능과 어느 해설로 이어지는지 연결하는 것이다.
//
// 출처: 법제처 국가법령정보센터, 결혼중개업의 관리에 관한 법률
//       (법령일련번호 281951, 2026-07-01 시행, 성평등가족부 소관)
//
// 지키는 선
//  - 조문의 요지를 옮기되 해석을 덧붙이지 않는다. 판단이 필요한 것은 해설(/guides)로 넘긴다.
//  - 벌칙이 있는 조항은 그 사실을 밝힌다. 겁을 주려는 것이 아니라 무게를 알리기 위해서다.
//  - 조문마다 법제처 원문 링크를 건다. 개정 여부는 그쪽에서 확인해야 한다.

export type LawArticle = {
  /** 제10조의2 형태 */
  no: string;
  title: string;
  /** 무엇을 요구하는 조항인지 한 줄. 없으면 제목으로 갈음한다 */
  gist?: string;
  /** 어기면 어떻게 되는지 (벌칙·처분이 붙는 조항만) */
  consequence?: string;
  /** 우리 시스템에서 관리하는 곳 */
  feature?: { label: string; to: string };
  /** 관련 해설 (/guides/<slug>) */
  guides?: string[];
  /** 실무에서 특히 자주 문제되는 조항 */
  hot?: boolean;
};

export const LAW_NAME = '결혼중개업의 관리에 관한 법률';
export const LAW_ENFORCED_ON = '2026-07-01';
export const LAW_MINISTRY = '성평등가족부';
export const LAW_SOURCE_URL =
  'https://www.law.go.kr/법령/결혼중개업의관리에관한법률';

export const LAW_ARTICLES: LawArticle[] = [
  { no: '제1조', title: '목적', gist: '결혼중개업을 지도·관리하고 이용자 피해를 예방하는 것이 이 법의 목적이다.' },
  { no: '제2조', title: '정의', gist: '결혼중개·국내결혼중개업·국제결혼중개업 등 용어를 정한다.' },
  { no: '제2조의2', title: '실태조사', gist: '결혼중개업 실태를 조사한다. 조사 결과가 정책과 지도점검의 근거가 된다.' },
  {
    no: '제3조',
    title: '국내결혼중개업의 신고',
    gist: '국내결혼중개업은 시장·군수·구청장에게 신고하고 영업한다.',
    feature: { label: '업체 정보 · 사무소', to: '/agency/office' },
    guides: ['multiple-branches-same-district'],
  },
  {
    no: '제4조',
    title: '국제결혼중개업의 등록',
    gist: '국제결혼중개업은 등록해야 한다. 신고보다 요건이 무겁다.',
    feature: { label: '업체 정보 · 사무소', to: '/agency/office' },
    guides: ['registration-transfer', 'capital-per-office'],
  },
  { no: '제4조의2', title: '결혼중개업체의 공시', gist: '등록·신고한 업체 정보가 공시된다. 이용자가 확인할 수 있다.' },
  {
    no: '제4조의3',
    title: '지도점검',
    gist: '관청이 업체를 지도·점검한다. 매년 지자체 합동점검이 이뤄진다.',
    hot: true,
  },
  { no: '제5조', title: '휴업·폐업 및 재개의 신고', gist: '영업을 쉬거나 접거나 다시 열 때 신고한다.' },
  {
    no: '제6조',
    title: '결격사유',
    gist: '일정한 형을 받은 사람은 결혼중개업을 운영하거나 그 업무에 종사할 수 없다.',
    consequence: '해당하면 등록취소 또는 영업정지 대상이 된다.',
    feature: { label: '업체 정보 · 결격사유 점검', to: '/agency/office' },
    guides: ['disqualification-suspension', 'criminal-fine-registration-cancel'],
    hot: true,
  },
  { no: '제7조', title: '겸업금지', gist: '함께 할 수 없는 영업이 정해져 있다.' },
  { no: '제8조', title: '신고필증 등의 게시', gist: '신고필증·등록증 등을 영업소에 게시한다.' },
  { no: '제9조', title: '명의 대여의 금지', gist: '자기 명의로 남이 영업하게 하면 안 된다.' },
  {
    no: '제10조',
    title: '결혼중개계약서의 작성 등',
    gist: '계약은 서면으로 하고 정해진 사항을 담아야 한다. 환불조건도 여기 들어간다.',
    feature: { label: '고객 관리 · 컴플라이언스', to: '/agency/clients' },
  },
  {
    no: '제10조의2',
    title: '신상정보 제공',
    gist: '이용자와 상대방의 신상정보를 공증인 인증을 받아 서면으로 서로에게 제공한다. 만남 이전에 이행해야 한다.',
    consequence: '위반 시 3년 이하 징역 또는 3천만원 이하 벌금. 영업정지 사유 중 가장 많이 나온다.',
    feature: { label: '신상정보 · 제공 기록', to: '/agency/clients' },
    guides: ['personal-info-criminal', 'personal-info-disclosure-cases', 'notarization-abroad'],
    hot: true,
  },
  {
    no: '제10조의3',
    title: '통역·번역서비스의 제공',
    gist: '이용자와 상대방이 이해할 수 있도록 통역·번역을 제공한다.',
    feature: { label: '업체 정보 · 통역자', to: '/agency/office' },
  },
  {
    no: '제10조의4',
    title: '기록보존',
    gist: '계약과 신상정보 관련 기록을 정해진 기간 보존한다.',
    feature: { label: '서류 보관', to: '/agency/clients' },
  },
  { no: '제10조의5', title: '부정한 방법의 모집·알선 등의 금지', gist: '부정한 방법으로 이용자나 상대방을 모집·알선하면 안 된다.' },
  {
    no: '제11조',
    title: '외국 현지법령 준수 등',
    gist: '국제결혼중개는 상대국 법령을 지켜야 한다.',
    feature: { label: '업체 정보 · 현지 파트너', to: '/agency/office' },
    guides: ['foreign-partner-banned-country'],
  },
  { no: '제11조의2', title: '홍보영상의 제작·배포·송출', gist: '홍보영상에 관한 사항을 정한다.' },
  {
    no: '제12조',
    title: '거짓·과장된 표시·광고의 금지 등',
    gist: '거짓이거나 과장된 표시·광고를 하면 안 된다.',
    consequence: '벌칙이 있고 양벌규정으로 법인도 처벌될 수 있다. 최근 3년 행정처분에서 비중이 크다.',
    guides: ['advertising-liability'],
    hot: true,
  },
  {
    no: '제12조의2',
    title: '미성년자 소개 금지 등',
    gist: '18세 미만 소개, 같은 시간에 2명 이상 소개, 같은 날 같은 장소에서 2명 이상에게 2명 이상 소개, 2명 이상 외국인 기숙이 금지된다.',
    consequence: '영업정지 처분이 실제로 이뤄졌고 형사 처벌이 함께 이뤄진 사건도 있다.',
    guides: ['prohibited-brokerage-acts', 'local-partner-contract-name'],
    hot: true,
  },
  { no: '제13조', title: '개인정보의 보호', gist: '수집한 개인정보를 보호한다.' },
  { no: '제14조', title: '장부 등의 비치', gist: '장부와 서류를 갖춰 둔다.' },
  {
    no: '제14조의2',
    title: '국제결혼중개업자의 업무제휴',
    gist: '외국 현지 업체와 제휴할 때는 서면으로 계약한다.',
    consequence: '그 나라에서 결혼중개업이 금지돼 있으면 서면계약을 해도 제휴 대상이 아니라는 해석이 있다.',
    feature: { label: '업체 정보 · 현지 파트너', to: '/agency/office' },
    guides: ['foreign-partner-banned-country'],
    hot: true,
  },
  { no: '제15조', title: '보고 및 검사 등', gist: '관청이 보고를 받거나 검사할 수 있다.' },
  { no: '제16조', title: '관계 기관의 협조', gist: '관계 기관에 협조를 요청할 수 있다.' },
  { no: '제17조', title: '시정 명령', gist: '위반이 확인되면 시정을 명할 수 있다.' },
  {
    no: '제18조',
    title: '영업정지 등',
    gist: '등록취소나 영업정지를 할 수 있는 사유와 절차를 정한다.',
    consequence: '위반 횟수에 따라 처분 수위가 올라간다. 다툰 사건 대부분이 이 조항이다.',
    feature: { label: '업체 정보 · 처분 이력', to: '/agency/office' },
    guides: ['suspension-overturned-cases', 'administrative-guidance-remedy'],
    hot: true,
  },
  { no: '제19조', title: '폐쇄조치 등', gist: '무신고·무등록 영업 등에 대한 폐쇄조치를 정한다.' },
  { no: '제20조', title: '청문', gist: '등록취소 등을 하기 전에 청문을 거친다. 의견을 낼 기회다.' },
  {
    no: '제21조',
    title: '행정처분의 승계 등',
    gist: '영업을 양수하거나 합병했거나 폐업 후 1년 안에 다시 열면 이전 처분의 효과가 이어진다. 다만 몰랐음을 증명하면 예외다.',
    feature: { label: '업체 정보 · 처분 이력', to: '/agency/office' },
    guides: ['penalty-count-carryover'],
    hot: true,
  },
  { no: '제22조', title: '수수료', gist: '신고·등록에 드는 수수료를 정한다.' },
  { no: '제24조', title: '교육', gist: '결혼중개업자와 종사자가 받아야 할 교육을 정한다.' },
  { no: '제24조의2', title: '결혼중개업 이용자의 피해 예방을 위한 교육', gist: '이용자 대상 피해 예방 교육에 관한 사항이다.' },
  {
    no: '제24조의3',
    title: '자본금',
    gist: '국제결혼중개업 등록에 필요한 자본금을 정한다.',
    consequence: '자본금 1억원은 법인 전체가 아니라 사무소마다 갖춰야 한다는 해석이 있다.',
    feature: { label: '업체 정보 · 사무소', to: '/agency/office' },
    guides: ['capital-per-office'],
    hot: true,
  },
  { no: '제25조', title: '손해배상책임의 보장', gist: '이용자 피해에 대비한 보험 가입 등 배상 능력을 갖춘다.' },
  {
    no: '제26조',
    title: '벌칙',
    gist: '어떤 위반이 형사처벌 대상인지 정한다.',
    consequence: '무등록 영업은 5년 이하 징역 또는 5천만원 이하 벌금, 신상정보 미제공·거짓광고는 3년 이하 징역 또는 3천만원 이하 벌금이다.',
    guides: ['personal-info-criminal'],
    hot: true,
  },
  {
    no: '제27조',
    title: '양벌규정',
    gist: '종업원 등이 위반하면 행위자를 벌하는 외에 법인이나 개인에게도 벌금형을 과한다.',
    consequence: '직원이 한 일이라도 법인이 함께 처벌될 수 있다. 다만 위반을 막기 위해 상당한 주의와 감독을 게을리하지 않았다면 처벌하지 않는다는 단서가 있다.',
    guides: ['advertising-liability'],
    hot: true,
  },
  { no: '제28조', title: '과태료', gist: '형사처벌까지 가지 않는 위반에 부과하는 과태료를 정한다.' },
];

export const HOT_COUNT = LAW_ARTICLES.filter((a) => a.hot).length;

/**
 * 해석집의 참조 문자열("같은 법 제3조(국내결혼중개업의 신고)")로 조문 지도 항목을 찾는다.
 *
 * 상세 페이지(lawArticles.ts)가 없는 조문도 지도에는 요약이 있다. 상세가 없다고
 * 조문 이름만 덩그러니 두면 읽는 사람이 그 조문이 무슨 내용인지 알 길이 없다.
 */
export function matchLawMapEntry(reference: string) {
  const m = reference.match(/제\s?\d+조(?:의\s?\d+)?/);
  if (!m) return null;
  const no = m[0].replace(/\s/g, '');
  return LAW_ARTICLES.find((a) => a.no === no) ?? null;
}
