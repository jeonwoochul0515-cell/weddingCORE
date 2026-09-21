// 광고 문구 점검 — 제12조에 걸리는 말을 발행 전에 잡는다
//
// 왜 제품이 이걸 하나. 처분 통계에서 제12조는 비중이 크고, 문구를 누가 썼든
// 처분받는 것은 업체다(제27조 양벌규정). 대행사가 써 준 블로그 글, 사장이 급히 올린
// 카페 글, 예전부터 쓰던 홈페이지 문장이 그대로 남아 있다가 걸린다.
//
// 조문은 네 갈래다.
//   ① 거짓·과장, 차별·편견 조장, 인신매매·인권 침해 우려 표시·광고 금지
//   ② 이용자에게 거짓된 정보 제공 금지 (광고가 아닌 상담도 포함)
//   ③ 광고에 국제결혼중개업 **등록번호**를 포함할 것 — 실무에서 가장 자주 빠진다
//   ④ 결혼중개업자가 아니면 결혼중개 광고 자체를 못 한다
// 위반은 3년 이하 징역 또는 3천만원 이하 벌금(제26조 ②)이고 영업정지가 함께 온다.
//
// ★ 기계가 잡을 수 있는 것과 없는 것을 가른다. 여기서 잡는 것은 **문구**다.
//   「실제로 그렇게 운영하는가」는 기계가 모른다 — 성혼을 정말 보장하고 계약서에
//   그렇게 적혀 있다면 쓸 수 있는 말이다. 그래서 걸린 문구마다 무엇을 확인해야
//   쓸 수 있는지를 같이 적는다. 무조건 지우라고 하지 않는다.
//
// 어휘표의 출처는 docs/marketing/홈페이지-제작-표준규칙.md(5. 쓰지 않는 표현)와
// 블로그-주제-달력.md다. 두 문서와 이 파일이 어긋나면 이 파일이 정본이다.

export type AdFinding = {
  /** block은 법 위반 소지, warn은 우리 운영 원칙이다. 근거 없는 겁주기를 하지 않는다 */
  severity: 'block' | 'warn';
  /** 원문에서 실제로 걸린 말 */
  phrase: string;
  /** 무엇이 문제인지 */
  reason: string;
  /** 어떻게 바꾸면 되는지 */
  suggestion: string;
  /** 근거. 우리 원칙이면 그렇게 적는다 */
  legalBasis: string;
};

export type AdCopyVerdict = {
  /** 발행해도 되는가. warn만 있으면 통과다 */
  ok: boolean;
  findings: AdFinding[];
};

type Rule = {
  pattern: RegExp;
  severity: AdFinding['severity'];
  reason: string;
  suggestion: string;
  legalBasis: string;
};

const ART12_1 = '결혼중개업법 제12조 ① (거짓·과장, 차별·편견, 인권침해 우려 표시·광고 금지)';
const ART12_1_HUMAN = '결혼중개업법 제12조 ① (인신매매·인권 침해 우려가 있는 내용)';

const RULES: Rule[] = [
  // ── 성사·결과 보장 ───────────────────────────────────────────
  {
    pattern: /성혼\s*(보장|100%|백퍼)|결혼\s*보장|성사\s*보장|100%\s*(성혼|성공|결혼)|실패\s*(없|제로)/g,
    severity: 'block',
    reason: '혼인 성사를 보장하는 표현입니다. 실제로 보장하고 계약서에 환불 조건까지 적혀 있지 않으면 과장 광고가 됩니다.',
    suggestion: '「지금까지 ○건을 진행했습니다」처럼 실제로 있었던 일만 적으세요.',
    legalBasis: ART12_1,
  },
  {
    pattern: /성사율\s*\d+|성혼율\s*\d+|\d+\s*%\s*(성사|성혼)/g,
    severity: 'block',
    reason: '성사율 수치는 산출 근거와 기간을 대지 못하면 과장 광고로 봅니다.',
    suggestion: '수치를 쓰려면 기간·모수·산식을 같은 화면에 적고 근거 자료를 보관하세요.',
    legalBasis: ART12_1,
  },
  // ── 최상급·순위 ─────────────────────────────────────────────
  {
    pattern: /업계\s*(최고|1위|일위)|국내\s*(최대|최고|1위)|최저가|최고의\s*(성혼|중개|업체)|1위\s*업체/g,
    severity: 'block',
    reason: '객관적 근거 없는 최상급·순위 표현입니다. 실증 자료가 없으면 과장 광고입니다.',
    suggestion: '공신력 있는 조사 결과가 있으면 조사기관·시점을 함께 적고, 없으면 빼세요.',
    legalBasis: ART12_1,
  },
  // ── 기간·비용 확정 ──────────────────────────────────────────
  {
    pattern: /\d+\s*(개월|달|주)\s*(이면|만에|안에)\s*(결혼|성혼|혼인|입국)/g,
    severity: 'block',
    reason: '기간을 확정해 말하고 있습니다. 비자 심사와 현지 절차는 업체가 정할 수 없습니다.',
    suggestion: '「대체로 ○개월쯤 걸립니다」처럼 실태조사 평균을 근거와 함께 적으세요.',
    legalBasis: ART12_1,
  },
  {
    pattern: /추가\s*비용\s*(0원|없음|없습니다|제로)|총\s*비용\s*확정|더\s*이상\s*비용\s*(없|안)/g,
    severity: 'block',
    reason: '추가 비용이 없다고 단정하고 있습니다. 현지 실비·번역·서류 비용이 실제로 전혀 없어야 쓸 수 있습니다.',
    suggestion: '계약서의 비용 항목과 같은 내용만 적고, 별도 실비가 있으면 그대로 밝히세요.',
    legalBasis: ART12_1,
  },
  // ── 사람을 물건처럼 말하는 어휘 ─────────────────────────────
  {
    pattern: /신붓감|신부\s*후보|처녀|순종적|어리고\s*예쁜|말\s*잘\s*듣는|데려온다|데려옵니다|사온다|사옵니다|고르[세시]|골라\s*보세요/g,
    severity: 'block',
    reason: '상대 여성을 상품처럼 부르는 표현입니다. 인신매매·인권 침해 우려가 있는 내용으로 봅니다.',
    suggestion: '「상대방」, 「후보자」, 「소개해 드립니다」처럼 사람을 사람으로 적으세요.',
    legalBasis: ART12_1_HUMAN,
  },
  {
    pattern: /(베트남|캄보디아|필리핀|우즈벡|우즈베키스탄|태국|중국)\s*여성은\s*(다|모두|대부분|원래)/g,
    severity: 'block',
    reason: '국가를 이유로 사람을 일반화하는 표현입니다. 차별·편견을 조장할 우려가 있는 내용입니다.',
    suggestion: '나라 이야기는 임금·물가·제도처럼 확인 가능한 사실로만 적으세요.',
    legalBasis: ART12_1,
  },
  // ── 미성년 암시 ─────────────────────────────────────────────
  {
    pattern: /미성년|10대\s*(신부|여성|상대)|어린\s*신부|나이\s*어린\s*여성/g,
    severity: 'block',
    reason: '18세 미만을 소개하는 것으로 읽힐 수 있는 표현입니다. 소개 자체가 금지된 행위입니다.',
    suggestion: '나이를 광고 문구로 쓰지 마세요. 후보의 나이·외모 묘사는 웹에 싣지 않습니다.',
    legalBasis: '결혼중개업법 제12조의2 ① 1호 (18세 미만 소개 금지), 제12조 ①',
  },
  // ── 확정적 법률 판단 ────────────────────────────────────────
  {
    pattern: /비자\s*(나옵니다|나와요|보장|100%)|무조건\s*(승인|통과)|무효입니다|틀림없이\s*됩니다/g,
    severity: 'block',
    reason: '법률·심사 결과를 단정하고 있습니다. 이용자에게 거짓된 정보를 제공한 것이 될 수 있습니다.',
    suggestion: '「○○에 해당할 수 있습니다」처럼 여지를 남기고, 판단은 변호사에게 넘기세요.',
    legalBasis: '결혼중개업법 제12조 ② (이용자에게 거짓된 정보 제공 금지)',
  },
  // ── 우리 운영 원칙 (법이 아니다) ────────────────────────────
  {
    pattern: /AI가\s*(씁니다|작성|상담)|챗봇이\s*상담|인공지능이\s*상담/g,
    severity: 'warn',
    reason: 'AI를 쓴다는 사실을 광고 문구로 내세우지 않습니다.',
    suggestion: '물어보면 사실대로 답하되, 광고에서 먼저 말하지 않습니다.',
    legalBasis: '우리 운영 원칙 (법에 근거한 요구가 아닙니다)',
  },
  {
    pattern: /도망|먹튀|위장결혼/g,
    severity: 'warn',
    reason: '사람을 의심의 대상으로 두는 말입니다. 사기 예방 글에서도 쓰지 않습니다.',
    suggestion: '「이탈 위험」, 「혼인의 진정성 확인」처럼 절차의 말로 바꾸세요.',
    legalBasis: '우리 운영 원칙 (여성가족부 가이드라인 취지)',
  },
];

/** 등록번호가 문구 안에 있는가. 띄어쓰기·하이픈은 무시한다 */
function mentionsRegistration(text: string, registrationNumber?: string | null): boolean {
  const flat = text.replace(/[\s-]/g, '');
  if (registrationNumber && registrationNumber.trim()) {
    return flat.includes(registrationNumber.replace(/[\s-]/g, ''));
  }
  return /등록번호|신고번호/.test(text);
}

/**
 * 광고 문구를 본다.
 *
 * @param text 발행하려는 문구 전체
 * @param registrationNumber 업체의 국제결혼중개업 등록번호. 넘기면 그 번호가 실제로
 *        문구 안에 있는지까지 본다. 안 넘기면 「등록번호」라는 말이라도 있는지만 본다.
 */
export function checkAdCopy(
  text: string,
  registrationNumber?: string | null,
): AdCopyVerdict {
  const findings: AdFinding[] = [];
  if (!text.trim()) return { ok: false, findings };

  for (const rule of RULES) {
    // 같은 표현이 여러 번 나와도 한 줄로만 말한다. 같은 말을 열 번 읽게 하지 않는다.
    const hits = [...new Set(text.match(rule.pattern) ?? [])];
    for (const phrase of hits) {
      findings.push({
        severity: rule.severity,
        phrase: phrase.trim(),
        reason: rule.reason,
        suggestion: rule.suggestion,
        legalBasis: rule.legalBasis,
      });
    }
  }

  // 등록번호는 「있어야 하는 것」이라 어휘 검사와 결이 다르다. 그래서 마지막에 따로 본다.
  if (!mentionsRegistration(text, registrationNumber)) {
    findings.push({
      severity: 'block',
      phrase: '(등록번호 없음)',
      reason: '광고에 국제결혼중개업 등록번호가 없습니다. 실무에서 가장 자주 빠지는 항목입니다.',
      suggestion: registrationNumber
        ? `문구 끝에 「국제결혼중개업 등록번호 ${registrationNumber}」를 넣으세요.`
        : '문구 끝에 「국제결혼중개업 등록번호 제○○호」를 넣으세요.',
      legalBasis: '결혼중개업법 제12조 ③ (표시·광고에 등록번호 포함)',
    });
  }

  return { ok: findings.every((f) => f.severity !== 'block'), findings };
}
