import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

type Props = {
  /** 이 역할 중 하나여야 접근 가능. 미지정 시 로그인만 요구. */
  allowedRoles?: string[];
};

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        불러오는 중…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 업체 가입 직후 agencyId는 있지만 role/Custom Claims가 아직 주입되지 않은 상태
  if (!user.role) {
    // 업체 정보 미제출 → 가입 페이지
    if (!user.agencyId) {
      return <Navigate to="/signup/agency" replace />;
    }
    // 제출 후 승인 대기
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
