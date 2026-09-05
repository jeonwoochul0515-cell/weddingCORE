// 상단 알림 종 — 열면 읽음 처리하고, 항목을 누르면 해당 화면으로 간다
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { markNotificationsRead, useAgencyNotifications } from '@/features/regulatoryRadar/useAgencyNotifications';
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
  const agencyId = useAuthStore((s) => s.user?.agencyId);

  const unreadItems = items.filter((n) => !uid || !n.readBy?.[uid]);
  const unread = unreadItems.length;

  function toggle() {
    const next = !open;
    setOpen(next);
    // 열어서 봤으면 읽은 것이다. 실패해도 화면은 그대로 두고 다음에 다시 시도한다.
    if (next && agencyId && uid && unreadItems.length > 0) {
      void markNotificationsRead(agencyId, uid, unreadItems.map((n) => n.id)).catch(() => {});
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        aria-label={unread > 0 ? `알림 ${unread}건 안 읽음` : '알림'}
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
        <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(16,38,33,.18)]">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">
            알림 {items.length > 0 && `(${items.length})`}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">새 알림이 없습니다.</p>
            )}
            {items.map((n) => {
              const isUnread = !uid || !n.readBy?.[uid];
              return (
                <Link
                  key={n.id}
                  to={n.link || '/agency'}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 ${isUnread ? 'bg-emerald-50/40' : ''}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[n.severity] ?? SEVERITY_DOT.info}`} />
                  <div className="flex-1">
                    <div className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-slate-900`}>{n.title}</div>
                    <div className="text-xs text-slate-600">{n.message}</div>
                    {n.createdAt && (
                      <div className="mt-1 text-xs text-slate-400">
                        {n.createdAt.toDate().toLocaleString('ko-KR')}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
