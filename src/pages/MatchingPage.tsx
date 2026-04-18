import { Heart } from 'lucide-react';
import MatchHistory from '@/features/matching/MatchHistory';

export default function MatchingPage() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Heart size={20} className="text-rose-500" />
        <h1 className="text-2xl font-semibold text-slate-900">매칭 관리</h1>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        전체 매칭 기록을 확인하고 결과를 기록할 수 있습니다.
        고객 상세 페이지에서 프로필 입력 후 MBTI·사주 궁합을 확인하세요.
      </p>

      <MatchHistory />
    </div>
  );
}
