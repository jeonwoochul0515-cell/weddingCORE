// 국제결혼 성향 진단이 무엇을 보는지 설명하는 정적 영역
//
// 진단 자체는 자바스크립트로 그려지는 문항이라 검색로봇과 AI가 읽을 내용이 없었다
// (로봇이 받는 글자 수 234자). 검색으로 들어온 사람이 문항을 풀지 않고도
// "이게 무엇을 보는 것인지" 알 수 있도록 글로 적는다.

import { Link } from 'react-router-dom';
import { QUESTIONS } from './questions';

const AXES = [
  ['혼자 쉬는가, 같이 있어야 힘이 나는가', '집에 있는 시간과 사람을 만나는 시간의 비중이 다르면 결혼 후 주말마다 부딪칩니다. 어느 쪽이 맞고 틀린 게 아니라 서로 다르다는 걸 미리 아는 것이 목적입니다.'],
  ['지금 눈앞의 것을 보는가, 앞일을 그리는가', '살림을 꾸리는 방식이 갈리는 지점입니다. 한 사람은 이번 달 생활비를 보고 다른 사람은 5년 뒤를 봅니다.'],
  ['판단할 때 따지는가, 마음을 먼저 보는가', '갈등이 생겼을 때 무엇으로 푸는지가 달라집니다. 국제결혼에서는 말이 완전히 통하지 않는 상태에서 이 차이가 더 크게 느껴집니다.'],
  ['정해두고 움직이는가, 그때그때 맞추는가', '약속 시간, 돈 쓰는 방식, 집안일 분담에서 매일 드러나는 차이입니다.'],
];

export const TEST_FAQ = [
  {
    q: '국제결혼 성향 진단은 무엇을 보는 것인가',
    a: `두 사람의 생활 방식과 소통 방식이 어디서 갈리는지를 봅니다. 문항 ${QUESTIONS.length}개로 네 가지 축(혼자/함께, 현재/미래, 논리/감정, 계획/즉흥)을 확인합니다. 궁합 점수를 매기는 것이 아니라 대화가 필요한 지점을 찾는 것이 목적입니다.`,
  },
  {
    q: '결과가 좋으면 잘 맞는 사이인가',
    a: '아닙니다. 성향이 같다고 잘 살고 다르다고 못 사는 것이 아닙니다. 이 진단은 어디서 부딪칠 수 있는지를 미리 알아 두자는 것이고, 상담에서 무엇을 물어볼지 정하는 데 씁니다.',
  },
  {
    q: '왜 국제결혼에서 성향을 따로 보나',
    a: '말이 완전히 통하지 않는 상태에서는 성향 차이가 오해로 이어지기 쉽습니다. 같은 행동을 두고 한쪽은 배려라고 보고 다른 쪽은 무관심이라고 느낍니다. 통역이 있어도 이 부분은 잘 전달되지 않습니다.',
  },
];

export default function AboutTest() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-6">
      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">
          {TEST_FAQ[0]!.q}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">{TEST_FAQ[0]!.a}</p>

        <ul className="mt-5 space-y-2 text-sm leading-6">
          {AXES.map(([q, a]) => (
            <li key={q} className="rounded-xl bg-slate-50 px-4 py-3">
              <strong className="font-semibold text-slate-900">{q}</strong>
              <span className="mt-0.5 block text-slate-600">{a}</span>
            </li>
          ))}
        </ul>

        {TEST_FAQ.slice(1).map(({ q, a }) => (
          <div key={q}>
            <h2 className="mt-10 text-xl font-bold tracking-[-0.03em] text-[#102621] sm:text-2xl">{q}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">{a}</p>
          </div>
        ))}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
          <Link to="/visa-simulator" className="secondary-button !px-4 !py-2.5 text-sm">
            F-6 비자 준비도 점검하기
          </Link>
          <Link to="/guides" className="secondary-button !px-4 !py-2.5 text-sm">
            결혼중개업법 해석 사례 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
