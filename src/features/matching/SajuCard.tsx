import { getSajuCompat, ELEMENT_STYLE } from './sajuCompat';

type Props = {
  dateA: string | null; // 'YYYY-MM-DD'
  dateB: string | null;
  nameA: string;
  nameB: string;
};

export default function SajuCard({ dateA, dateB, nameA, nameB }: Props) {
  if (!dateA || !dateB) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
        <p className="text-sm text-slate-500">양측 생년월일을 입력하면 궁합을 확인할 수 있습니다.</p>
      </div>
    );
  }

  const result = getSajuCompat(dateA, dateB);
  const elA = ELEMENT_STYLE[result.elements.a];
  const elB = ELEMENT_STYLE[result.elements.b];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">사주 궁합</h3>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">재미로 보기</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${elA.bg}`}>
            <span className="text-lg">{elA.emoji}</span>
          </div>
          <div className={`mt-1 text-sm font-bold ${elA.color}`}>{result.elements.a}</div>
          <div className="text-xs text-slate-500">{nameA}</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900">{result.score}<span className="text-lg text-slate-400">점</span></div>
          <div className={`text-sm font-semibold ${result.gradeColor}`}>{result.grade}</div>
        </div>

        <div className="text-center">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${elB.bg}`}>
            <span className="text-lg">{elB.emoji}</span>
          </div>
          <div className={`mt-1 text-sm font-bold ${elB.color}`}>{result.elements.b}</div>
          <div className="text-xs text-slate-500">{nameB}</div>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-slate-50 p-3">
        <p className="text-sm text-slate-700">{result.description}</p>
      </div>

      {/* 점수 바 */}
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${result.score}%`,
              backgroundColor: result.score >= 85 ? '#e11d48' : result.score >= 70 ? '#2563eb' : result.score >= 55 ? '#64748b' : '#d97706',
            }}
          />
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400">{result.disclaimer}</p>
    </div>
  );
}
