import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/auth';
import NotificationBell from './NotificationBell';
import BrandMark from '@/components/brand/BrandMark';
import { useAgencyName } from '@/features/agency/useAgencyName';

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const agencyName = useAgencyName();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  const workspaceLabel = user?.role === 'admin'
    ? '관리자 콘솔'
    : user?.role === 'lawyer'
      ? '변호사 검토 콘솔'
      : user?.agencyId
        // 내부 ID(ag_…)는 사장에게 아무 뜻이 없다. 상호를 보여 주고, 아직 못 읽었으면 빈칸 대신 일반 이름을 쓴다.
        ? (agencyName || '우리 업체')
        : '가입 승인 대기 중';

  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden"><BrandMark /></div>
        <div className="hidden min-w-0 sm:block">
          <div className="text-[10px] font-bold tracking-[0.14em] text-emerald-700">업무 공간</div>
          <div className="truncate text-xs font-medium text-slate-500">{workspaceLabel}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm sm:gap-3">
        {user?.agencyId && <NotificationBell />}
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="hidden items-center gap-2 sm:flex">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
            {(user?.displayName ?? user?.email ?? 'U').slice(0, 1).toUpperCase()}
          </span>
          <span className="max-w-32 truncate text-xs font-semibold text-slate-700">{user?.displayName ?? user?.email}</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
          aria-label="로그아웃"
        >
          <LogOut size={16} />
          <span>{signingOut ? '로그아웃 중' : '로그아웃'}</span>
        </button>
      </div>
    </header>
  );
}
