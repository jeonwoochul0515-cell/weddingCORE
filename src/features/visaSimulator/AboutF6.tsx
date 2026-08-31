// F-6 결혼이민 비자 요건을 글로 설명하는 정적 영역
//
// 왜 두는가. 위쪽 점검 도구는 자바스크립트로 그려지는 폼이라 검색로봇과 AI가 읽을
// 내용이 사실상 없었다(로봇이 받는 글자 수 211자). 도구를 쓰지 않고 검색으로 들어온
// 사람에게도 답이 되도록, 실제 기준을 질문-답 형태로 적는다.
//
// 지키는 선. 요건은 사실 그대로 적되 심사 결과나 승인 가능성을 단정하지 않는다.
// 숫자는 rules.ts에서 그대로 읽어 화면과 계산이 어긋나지 않게 한다.

import { Link } from 'react-router-dom';
import {
  CURRENT_RULE_YEAR,
  INCOME_THRESHOLDS,
  HOUSEHOLD_INCREMENT_OVER_SEVEN,
  PROPERTY_TO_INCOME_RATE,
  RULE_SOURCE_URL,
} from './rules';

const won = (n: number) => `${n.toLocaleString()}원`;

const T = INCOME_THRESHOLDS[CURRENT_RULE_YEAR];
const amountFor = (size: number) => T[size] ?? 0;

/**
 * 아래 화면의 질문(h2)과 답을 그대로 옮긴 것. FAQPage 스키마가 이 배열을 쓴다.
 * 화면 문구를 고치면 여기도 같이 고친다 — 어긋나면 스팸으로 처리된다.
 */
export const F6_FAQ = [
  {
    q: 'F-6 결혼이민 비자를 받으려면 소득이 얼마나 있어야 하나',
    a: `한국인 배우자(초청인)의 연간 소득이 가구원 수별 기준 금액 이상이어야 합니다. ${CURRENT_RULE_YEAR}년 기준으로 2인 가구는 ${won(amountFor(2))}, 4인 가구는 ${won(amountFor(4))}입니다. 신청일 기준 최근 1년치 세전 금액으로 봅니다.`,
  },
  {
    q: '소득이 기준에 모자라면 방법이 없나',
    a: `두 가지를 함께 볼 수 있습니다. 재산을 연 ${(PROPERTY_TO_INCOME_RATE * 100).toFixed(0)}%로 환산해 소득에 더하거나, 같이 사는 가족의 소득을 합산합니다. 두 방법 모두 증빙이 필요하고 공관에 따라 인정 범위가 다를 수 있습니다.`,
  },
  {
    q: '소득 말고 또 무엇을 보나',
    a: '결혼이 진짜인지를 봅니다. 두 사람이 통역 없이 말이 통하는지, 직접 만난 횟수와 교제 기간이 충분한지, 배우자 본국법상 혼인할 수 있는 나이인지, 이전 혼인이 정리되었는지, 초청인에게 아동학대·성범죄 같은 결격 사유가 없는지, 결혼이민 사전안내 프로그램을 이수했는지를 확인합니다.',
  },
  {
    q: '이 점검을 통과하면 비자가 나오나',
    a: '아닙니다. 이 도구는 서류와 요건이 어디까지 준비됐는지 스스로 확인해 보는 것이고 심사 결과를 예측하지 않습니다. 실제 판단은 담당 공관과 법무부가 하며 같은 조건이라도 결과가 다를 수 있습니다.',
  },
];

export default function AboutF6() {
  const rows = Object.entries(T).map(([size, amount]) => [Number(size), amount] as const);
  const at = amountFor;

  return (
    <section className="mx-auto max-w-3xl px-5 pb-16 print:hidden sm:px-6">
      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">
          F-6 결혼이민 비자를 받으려면 소득이 얼마나 있어야 하나
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          한국인 배우자(초청인)의 연간 소득이 가구원 수별 기준 금액 이상이어야 합니다.{' '}
          {CURRENT_RULE_YEAR}년 기준으로 2인 가구는 {won(at(2))}, 4인 가구는 {won(at(4))}입니다.
          신청일 기준 최근 1년치 세전 금액으로 봅니다.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <caption className="sr-only">
              {CURRENT_RULE_YEAR}년 결혼이민 비자 가구원 수별 소득 요건
            </caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th scope="col" className="py-2 pr-4 font-semibold">가구원 수</th>
                <th scope="col" className="py-2 font-semibold">필요한 연간 소득</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([size, amount]) => (
                <tr key={size} className="border-b border-slate-100">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">{size}인</th>
                  <td className="py-2 font-semibold text-slate-900">{won(amount)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-600">8인 이상</th>
                <td className="py-2 text-slate-700">
                  7인 기준에서 한 명 늘 때마다 {won(HOUSEHOLD_INCREMENT_OVER_SEVEN)}씩 더합니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          출처.{' '}
          <a href={RULE_SOURCE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            외교부 재외공관 {CURRENT_RULE_YEAR} 결혼이민비자 소득요건 안내
          </a>
          . 기준은 해마다 바뀌므로 신청 전에 담당 공관 공지를 다시 확인해야 합니다.
        </p>

        <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">
          소득이 기준에 모자라면 방법이 없나
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          두 가지를 함께 볼 수 있습니다. 재산을 연 {(PROPERTY_TO_INCOME_RATE * 100).toFixed(0)}%로 환산해
          소득에 더하거나, 같이 사는 가족의 소득을 합산합니다. 두 방법 모두 증빙이 필요하고 공관에 따라
          인정 범위가 다를 수 있습니다. 예를 들어 1억원의 재산은{' '}
          {won(100_000_000 * PROPERTY_TO_INCOME_RATE)}의 소득으로 봅니다.
        </p>

        <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">
          소득 말고 또 무엇을 보나
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          결혼이 진짜인지를 봅니다. 구체적으로는 아래를 확인합니다.
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {[
            ['두 사람이 말이 통하는가', '통역 없이는 대화가 안 되는 경우 혼인의 진정성을 의심받습니다. 한국어 능력이나 배우자 언어 학습 이력을 함께 냅니다.'],
            ['만난 적이 있고 교제 기간이 충분한가', '직접 만난 횟수와 교제 기간, 사진·대화 기록 같은 증빙을 봅니다.'],
            ['배우자 본국법상 혼인할 수 있는 나이인가', '나라마다 다릅니다. 베트남은 남성 20세·여성 18세, 중국은 남성 22세·여성 20세입니다.'],
            ['이전 혼인이 정리되었는가', '배우자 본국에서 이혼이 확정되지 않았다면 혼인 자체가 성립하지 않습니다.'],
            ['초청인에게 결격 사유가 없는가', '아동학대·성범죄 전력 등이 있으면 초청이 제한됩니다.'],
            ['결혼이민 사전안내 프로그램을 이수했는가', '국제결혼 안내프로그램 이수증이 필요한 경우가 있습니다.'],
          ].map(([q, a]) => (
            <li key={q} className="rounded-xl bg-slate-50 px-4 py-3">
              <strong className="font-semibold text-slate-900">{q}</strong>
              <span className="mt-0.5 block text-slate-600">{a}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">
          이 점검을 통과하면 비자가 나오나
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          아닙니다. 이 도구는 서류와 요건이 어디까지 준비됐는지 스스로 확인해 보는 것이고,
          심사 결과를 예측하지 않습니다. 실제 판단은 담당 공관과 법무부가 하며, 같은 조건이라도
          결과가 다를 수 있습니다. 개별 사안의 법률 판단이 필요하면 변호사에게 확인하십시오.
        </p>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
          <Link to="/guides" className="secondary-button !px-4 !py-2.5 text-sm">
            결혼중개업법 해석 사례 보기
          </Link>
          <Link to="/law" className="secondary-button !px-4 !py-2.5 text-sm">
            조문 지도에서 의무 확인하기
          </Link>
        </div>
      </div>
    </section>
  );
}
