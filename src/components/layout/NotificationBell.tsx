import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAgencyNotifications } from '@/features/regulatoryRadar/useAgencyNotifications';
import { useAuthStore } from '@/store/authStore';

const SEVERITY_DOT = {
  info: 'bg-slate-400',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
} as const;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const items = useAgencyNotifications(10);
  const uid = useAuthStore((s) => s.user?.uid);

  const unread = items.filter((n) => !uid || !n.readBy?.[uid]).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 hover:bg-slate-100"
        aria-label="알림"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 px-4 py-2 text-sm font-medium text-slate-900">
            알림 {items.length > 0 && `(${items.length})`}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">새 알림이 없습니다.</p>
            )}
            {items.map((n) => (
              <Link
                key={n.notifId}
                to={n.link || '#'}
                onClick={() => setOpen(false)}
                className="flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[n.severity]}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{n.title}</div>
                  <div className="text-xs text-slate-600">{n.message}</div>
                  {n.createdAt && (
                    <div className="mt-1 text-xs text-slate-400">
                      {n.createdAt.toDate().toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
