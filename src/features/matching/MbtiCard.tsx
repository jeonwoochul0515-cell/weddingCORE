import { Link } from 'react-router-dom';
import type { MbtiType } from '@/types/schema';
import { getMbtiCompat } from './mbtiCompat';

type Props = {
  mbtiA: MbtiType | null;
  mbtiB: MbtiType | null;
  nameA: string;
  nameB: string;
};

export default function MbtiCard({ mbtiA, mbtiB, nameA, nameB }: Props) {
  if (!mbtiA || !mbtiB) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
        <p className="text-sm text-slate-500">양측 MBTI를 입력하면 궁합을 확인할 수 있습니다.</p>
        <Link
          to="/mbti-test"
          target="_blank"
          className="mt-2 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
        >
          MBTI 모르면? 간단 테스트 하기
        </Link>
      </div>
    );
  }

  const result = getMbtiCompat(mbtiA, mbtiB);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">MBTI 궁합</h3>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{mbtiA}</div>
          <div className="text-xs text-slate-500">{nameA}</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900">{result.score}<span className="text-lg text-slate-400">점</span></div>
          <div className={`text-sm font-semibold ${result.gradeColor}`}>{result.grade}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{mbtiB}</div>
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
              backgroundColor: result.score >= 90 ? '#e11d48' : result.score >= 75 ? '#2563eb' : result.score >= 60 ? '#64748b' : '#d97706',
            }}
          />
        </div>
      </div>
    </div>
  );
}
