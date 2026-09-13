// 빠른 요건 점검 7문항 — 손님이 이름을 밝히기 전에 "나도 되나"를 스스로 확인하는 질문과 판정 규칙
//
// 정밀 점검(/visa-simulator, 23문항)은 첫 접촉에는 무겁다. 손님의 첫 질문은 "나 같은 사람도
// 되나"이고, 그 답은 익명으로 2분 안에 나와야 한다. 여기서는 걸리는 점이 있는지만 가른다.
// 결과는 "가능성"까지만 말하고, 최종 판단은 업체와 심사기관이 한다.
//
// 숫자는 시뮬레이터 규칙(rules.ts)에서 그대로 읽어 화면과 계산이 어긋나지 않게 한다.

import {
  COUNTRY_SPONSOR_RULES,
  CURRENT_RULE_YEAR,
  INCOME_THRESHOLDS,
  USD_KRW_REFERENCE,
} from '@/features/visaSimulator/rules';

export type Verdict = 'ok' | 'check' | 'stop';

export type Option = {
  value: string;
  label: string;
  verdict: Verdict;
  note?: string;
};

export type Question = {
  key: string;
  title: string;
  why: string;
  options: Option[];
};

/** 100만 원 단위로 반올림해 "약 4,200만 원"처럼 읽히게 한다. */
const roughWon = (n: number) => `약 ${(Math.round(n / 1_000_000) * 100).toLocaleString()}만 원`;

const TWO_PERSON = INCOME_THRESHOLDS[CURRENT_RULE_YEAR][2]!;
const KH = COUNTRY_SPONSOR_RULES.KH!;
const KH_ANNUAL = KH.minMonthlyIncomeUsd * 12 * USD_KRW_REFERENCE;

export const QUESTIONS: Question[] = [
  {
    key: 'marital',
    title: '지금 혼인 상태는 어떻게 되세요?',
    why: '법적으로 혼인 중이면 진행할 수 없습니다. 이혼은 신고나 판결까지 끝나 있어야 합니다.',
    options: [
      { value: '미혼', label: '미혼', verdict: 'ok' },
      { value: '이혼 확정', label: '이혼 (신고·판결까지 끝남)', verdict: 'ok' },
      { value: '사별', label: '사별', verdict: 'ok' },
      { value: '이혼 진행 중', label: '이혼 절차 진행 중', verdict: 'stop', note: '이혼이 확정된 뒤에 진행할 수 있습니다. 상담은 미리 받아 두셔도 됩니다.' },
      { value: '혼인 중', label: '혼인 중', verdict: 'stop', note: '법적으로 혼인 중인 상태에서는 진행할 수 없습니다.' },
    ],
  },
  {
    key: 'age',
    title: '나이대는 어떻게 되세요?',
    why: '나이 자체로 막히지는 않습니다. 캄보디아에 있던 만 50세 제한도 2021년에 폐지됐습니다. 다만 나이 차가 크면 혼인의 진정성 심사가 더 꼼꼼해집니다.',
    options: [
      { value: '20대', label: '20대', verdict: 'ok' },
      { value: '30대', label: '30대', verdict: 'ok' },
      { value: '40대', label: '40대', verdict: 'ok' },
      { value: '50대', label: '50대', verdict: 'ok' },
      { value: '60대 이상', label: '60대 이상', verdict: 'ok' },
    ],
  },
  {
    key: 'income',
    title: '증빙할 수 있는 연소득은 어느 정도세요?',
    why: `결혼이민(F-6) 비자는 ${CURRENT_RULE_YEAR}년 기준 2인 가구 연 ${TWO_PERSON.toLocaleString()}원 이상이 필요합니다. 세전, 최근 1년, 증빙 가능한 금액으로 봅니다.`,
    options: [
      { value: 'high', label: `연 ${roughWon(KH_ANNUAL)} 이상`, verdict: 'ok' },
      { value: 'mid', label: `연 ${roughWon(TWO_PERSON)}~${roughWon(KH_ANNUAL)}`, verdict: 'ok' },
      { value: 'low', label: `연 ${roughWon(TWO_PERSON)} 미만`, verdict: 'check', note: '2인 가구 기준에 못 미칩니다. 재산(연 5% 환산)이나 같이 사는 가족의 소득을 합산할 수 있는지 상담에서 확인합니다.' },
      { value: 'unproven', label: '소득은 있지만 증빙이 어렵다', verdict: 'check', note: '증빙 가능한 소득만 인정됩니다. 어떤 서류로 보일 수 있는지 상담에서 확인합니다.' },
      { value: 'unknown', label: '잘 모르겠다', verdict: 'check', note: '소득금액증명원 기준으로 상담에서 함께 확인합니다.' },
    ],
  },
  {
    key: 'housing',
    title: '결혼 후 함께 살 집은요?',
    why: '비자 신청 때 주거지를 봅니다. 자가·전세·월세 어느 것이든 되고, 가족과 함께 사는 것도 가능합니다.',
    options: [
      { value: '본인 명의', label: '본인 명의 (자가·전세·월세 계약)', verdict: 'ok' },
      { value: '가족 명의', label: '가족 명의 집에 함께 산다', verdict: 'ok' },
      { value: '없음', label: '아직 없다', verdict: 'check', note: '비자 신청 전까지 주거지를 확보해야 합니다. 시점을 상담에서 잡습니다.' },
    ],
  },
  {
    key: 'criminal',
    title: '범죄경력이 있으세요?',
    why: '내용에 따라 초청이 제한되는 항목이 있고, 상대에게 서면으로 알려야 하는 항목도 있습니다. 예·아니오만 답하셔도 됩니다.',
    options: [
      { value: '없음', label: '없다', verdict: 'ok' },
      { value: '있음', label: '있다', verdict: 'check', note: '내용에 따라 초청이 제한될 수 있습니다. 서류를 보고 정확히 안내받으세요. 숨기면 나중에 더 큰 문제가 됩니다.' },
      { value: '답변 안 함', label: '지금은 답하지 않겠다', verdict: 'check', note: '상담에서 확인합니다.' },
    ],
  },
  {
    key: 'invited',
    title: '전에 외국인 배우자를 초청한 적이 있으세요?',
    why: '초청 시기와 횟수에 따라 제한 여부가 달라집니다.',
    options: [
      { value: '없음', label: '없다', verdict: 'ok' },
      { value: '있음', label: '있다', verdict: 'check', note: '초청 시기와 횟수에 따라 제한 여부가 달라집니다. 상담에서 확인합니다.' },
    ],
  },
  {
    key: 'country',
    title: '진행을 생각하는 나라가 있으세요?',
    why: '나라마다 초청인 조건과 절차가 다릅니다. 아직 정하지 않으셨어도 됩니다.',
    options: [
      { value: 'VN', label: '베트남', verdict: 'ok' },
      { value: 'KH', label: '캄보디아', verdict: 'ok' },
      { value: 'UZ', label: '우즈베키스탄', verdict: 'ok' },
      { value: 'MN', label: '몽골', verdict: 'ok' },
      { value: 'PH', label: '필리핀', verdict: 'ok' },
      { value: 'CN', label: '중국', verdict: 'ok' },
      { value: 'TH', label: '태국', verdict: 'ok' },
      { value: 'undecided', label: '아직 정하지 않았다', verdict: 'ok' },
    ],
  },
];

export type Row = { q: Question; opt: Option | undefined };

export type Evaluation = {
  rows: Row[];
  /** 문항 사이를 가로지르는 규칙에서 나온 항목 (나라별 초청인 조건 등) */
  cross: Array<{ verdict: Verdict; title: string; note: string }>;
  stops: number;
  checks: number;
  level: Verdict;
};

export function evaluate(answers: Record<string, string>): Evaluation {
  const rows: Row[] = QUESTIONS.map((q) => ({ q, opt: q.options.find((o) => o.value === answers[q.key]) }));
  const cross: Evaluation['cross'] = [];

  const income = answers.income;
  const country = answers.country;

  // 캄보디아 — 외국인 배우자 월 소득 USD 2,500 이상(주캄보디아 대사관). 만 50세 나이 제한은 2021년 폐지.
  // F-6 이전에 현지 혼인등록에서 걸린다.
  if (country === 'KH' && income && income !== 'high') {
    cross.push({
      verdict: 'check',
      title: '캄보디아 초청인 소득 규정',
      note: `캄보디아 정부 규정상 외국인 배우자는 월 소득 ${KH.minMonthlyIncomeUsd.toLocaleString()}달러(연 ${roughWon(KH_ANNUAL)}, 참고 환율) 이상을 증명해야 현지 혼인등록이 됩니다. 재산·가족 소득 합산이 안 될 수 있으니 증빙 방식을 상담에서 확인합니다.`,
    });
  }

  const verdicts = [...rows.map((r) => r.opt?.verdict), ...cross.map((c) => c.verdict)];
  const stops = verdicts.filter((v) => v === 'stop').length;
  const checks = verdicts.filter((v) => v === 'check').length;
  const level: Verdict = stops ? 'stop' : checks ? 'check' : 'ok';
  return { rows, cross, stops, checks, level };
}

export const LEVEL_LABEL: Record<Verdict, string> = {
  ok: '답하신 범위에서는 걸리는 점이 없습니다',
  check: '확인이 필요한 항목이 있습니다',
  stop: '진행 전에 정리할 것이 있습니다',
};

/** 접수 문자와 업체 화면에 붙이는 요약. 답하지 않은 항목은 "미응답"으로 남긴다. */
export function summarize(ev: Evaluation): string {
  // 답 옆에 그 답의 판정을 같이 적는다. 예전에는 답만 보냈더니, 업체 화면의 보고서가
  // 「혼인 중」·「연 2,500만원 미만」을 확인된 값(초록)으로 읽고 「걸리는 항목이 없습니다」
  // 라고 했다. 낱말만 보고 판단하던 쪽을 고치는 대신, 판정을 실어 보낸다(점검 07-1).
  const lines = ev.rows.map((r) => {
    const mark = r.opt?.verdict === 'stop' ? ' [진행 불가]' : r.opt?.verdict === 'check' ? ' [확인 필요]' : '';
    return `${r.q.title.replace(/\?$/, '')}: ${r.opt?.label ?? '미응답'}${mark}`;
  });
  ev.cross.forEach((c) => lines.push(`${c.title}: ${c.verdict === 'stop' ? '진행 불가' : '확인 필요'}`));
  lines.push(`판정: ${LEVEL_LABEL[ev.level]}${ev.checks ? ` (확인 ${ev.checks}건)` : ''}`);
  return lines.join('\n');
}
