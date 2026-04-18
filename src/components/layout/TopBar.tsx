import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500">
        {user?.agencyId ? `업체 ID: ${user.agencyId}` : '가입 승인 대기 중'}
      </div>
      <div className="flex items-center gap-2 text-sm">
        {user?.agencyId && <NotificationBell />}
        <span className="text-slate-700">{user?.displayName ?? user?.email}</span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </header>
  );
}
