// 지금 이 고객 단계에서 자주 문제되는 것 — 사례를 미리 보여준다
//
// 「거부 사례」 화면은 업체가 직접 찾아 들어가야 한다. 그런데 정작 필요한 순간은
// 고객을 앞에 두고 서류를 준비할 때다. 그래서 고객의 현재 단계에 맞는 해설을
// 고객 상세에서 바로 띄운다.
//
// 단계별로 실제 처분이 몰리는 지점이 다르다. 맞선 준비 단계에서는 신상정보 제공이,
// 비자 신청 단계에서는 소득·주거 요건이 문제된다.

import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';

type StageGuide = { slug: string; title: string; why: string };

/** 고객 단계(1~6)별로 미리 알아두면 좋은 해설 */
const BY_STAGE: Record<number, StageGuide[]> = {
  1: [
    {
      slug: 'capital-per-office',
      title: '사무소를 두 곳 두면 자본금도 두 배',
      why: '등록 요건은 사무소 단위로 판단됩니다',
    },
    {
      slug: 'disqualification-suspension',
      title: '대표가 결격사유에 걸리면',
      why: '채용·계약 전에 확인해야 하는 항목입니다',
    },
  ],
  2: [
    {
      slug: 'foreign-partner-banned-country',
      title: '결혼중개 금지 국가의 업체와 제휴',
      why: '현지 파트너를 정하기 전에 확인할 것',
    },
    {
      slug: 'local-partner-contract-name',
      title: '현지 업체 이름으로 계약하면',
      why: '계약 명의를 돌려도 실질로 판단됩니다',
    },
  ],
  3: [
    {
      slug: 'personal-info-criminal',
      title: '신상정보는 만남 이전에',
      why: '맞선을 잡기 전에 끝내야 하는 의무입니다',
    },
    {
      slug: 'personal-info-disclosure-cases',
      title: '신상정보를 늦게 준 업체는 어떻게 됐나',
      why: '영업정지가 가장 많이 나온 사유입니다',
    },
    {
      slug: 'notarization-abroad',
      title: '공증에서 말하는 "외국"의 뜻',
      why: '현지 공증 서류를 쓸 때 헷갈리는 지점',
    },
  ],
  4: [
    {
      slug: 'prohibited-brokerage-acts',
      title: '해서는 안 되는 중개 행위',
      why: '18세 미만·2명 이상 소개가 금지됩니다',
    },
    {
      slug: 'advertising-liability',
      title: '직원이 낸 광고인데 회사도 처벌받나',
      why: '성혼 사례를 홍보할 때 함께 볼 것',
    },
  ],
  5: [
    {
      slug: 'suspension-overturned-cases',
      title: '영업정지가 뒤집힌 경우',
      why: '처분을 받았다면 날짜부터 확인하세요',
    },
  ],
  6: [
    {
      slug: 'criminal-fine-registration-cancel',
      title: '벌금형을 받으면 등록이 취소되나',
      why: '형사 절차가 등록에 미치는 영향',
    },
  ],
};

export default function StageGuideCard({ stage }: { stage: number }) {
  const guides = BY_STAGE[stage] ?? [];
  if (guides.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-[#102621]">
        <BookOpen size={16} className="text-slate-400" />이 단계에서 자주 문제되는 것
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        실제로 처분이나 판결이 나온 사례입니다. 미리 보면 준비 방향이 잡힙니다.
      </p>
      <ul className="space-y-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              to={`/guides/${g.slug}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-300"
            >
              <div>
                <p className="text-sm font-semibold text-[#102621]">{g.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{g.why}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/law"
        className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline"
      >
        결혼중개업법 조문 지도 보기
      </Link>
    </div>
  );
}
