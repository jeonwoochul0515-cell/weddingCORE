// 왼쪽 메뉴(PC)와 하단 메뉴(휴대폰). 휴대폰은 자주 쓰는 4개만 두고 나머지는 「더보기」로 접는다
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bot, Building2, Gavel, Heart, Landmark, LayoutDashboard, LayoutGrid, Megaphone, Radio, Scale, Users, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import BrandMark from '@/components/brand/BrandMark';

const agencyLinks = [
  { to: '/agency', label: '대시보드', shortLabel: '홈', icon: LayoutDashboard },
  { to: '/agency/clients', label: '고객 관리', shortLabel: '고객', icon: Users },
  { to: '/agency/matching', label: '매칭 관리', shortLabel: '매칭', icon: Heart },
  { to: '/agency/visa', label: '비자업무 센터', shortLabel: '비자', icon: Landmark },
  { to: '/agency/marketing', label: '마케팅 센터', shortLabel: '마케팅', icon: Megaphone },
  { to: '/agency/automation', label: 'AI 업무 자동화', shortLabel: 'AI', icon: Bot },
  { to: '/agency/precedents', label: '거부 사례', shortLabel: '사례', icon: Scale },
  { to: '/agency/office', label: '업체 정보', shortLabel: '업체', icon: Building2 },
  { to: '/agency/regulatory', label: '규제 레이더', shortLabel: '규제', icon: Radio },
];

const lawyerLinks = [
  { to: '/lawyer/reviews', label: '문서 검토', shortLabel: '검토', icon: Gavel },
];

const adminLinks = [
  { to: '/admin/agencies', label: '업체 승인', shortLabel: '업체', icon: Building2 },
  { to: '/lawyer/reviews', label: '문서 검토', shortLabel: '검토', icon: Gavel },
];

/** 대시보드(/agency)만 정확히 일치할 때 켜고, 나머지는 하위 화면(고객 상세 등)에서도 켜 둔다 */
const isRootLink = (to: string) => to === '/agency';

export default function Sidebar() {
  const role = useAuthStore((state) => state.user?.role);
  const links = role === 'lawyer' ? lawyerLinks : role === 'admin' ? adminLinks : agencyLinks;
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // 휴대폰 하단에는 4개까지만 놓는다. 9개를 늘어놓으면 옆으로 밀려 뒤쪽 메뉴가 보이지 않는다.
  const primary = links.slice(0, 4);
  const rest = links.slice(4);
  const restActive = rest.some((l) => location.pathname === l.to || location.pathname.startsWith(l.to + '/'));

  return (
    <>
      <aside className="hidden w-[268px] shrink-0 flex-col bg-[#102621] text-white lg:flex">
        <div className="px-6 pb-8 pt-6"><BrandMark inverse /></div>
        <div className="px-6 pb-3 text-[10px] font-bold tracking-[0.16em] text-emerald-200/45">
          {role === 'lawyer' ? '변호사 검토' : role === 'admin' ? '관리자' : '업체 업무'}
        </div>
        <nav className="space-y-1 px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={isRootLink(to)}
              className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium ${isActive ? 'bg-white/[0.11] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-emerald-300 group-hover:bg-emerald-400/10"><Icon size={17} /></span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-[11px] leading-5 text-slate-400">고객정보와 업무문서는 역할별 권한에 따라 분리됩니다.</p>
          </div>
        </div>
      </aside>

      {moreOpen && (
        <>
          <button type="button" aria-label="메뉴 닫기" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />
          <div className="fixed inset-x-3 bottom-[4.75rem] z-40 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#102621]/95 p-2 shadow-[0_16px_50px_rgba(16,38,33,.32)] backdrop-blur-xl lg:hidden">
            {rest.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) => `flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-medium ${isActive ? 'bg-white/10 text-white' : 'text-slate-300'}`}
              >
                <Icon size={18} /><span className="whitespace-nowrap">{label}</span>
              </NavLink>
            ))}
          </div>
        </>
      )}

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center rounded-2xl border border-white/10 bg-[#102621]/95 p-1.5 shadow-[0_16px_50px_rgba(16,38,33,.32)] backdrop-blur-xl lg:hidden">
        {primary.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={isRootLink(to)}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium ${isActive ? 'bg-white/10 text-white' : 'text-slate-400'}`}
          >
            <Icon size={17} /><span className="whitespace-nowrap">{shortLabel}</span>
          </NavLink>
        ))}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium ${moreOpen || restActive ? 'bg-white/10 text-white' : 'text-slate-400'}`}
          >
            {moreOpen ? <X size={17} /> : <LayoutGrid size={17} />}<span className="whitespace-nowrap">더보기</span>
          </button>
        )}
      </nav>
    </>
  );
}
