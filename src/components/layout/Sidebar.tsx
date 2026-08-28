import { NavLink } from 'react-router-dom';
import { Bot, Building2, Gavel, Heart, Landmark, LayoutDashboard, Megaphone, Radio, Scale, Users } from 'lucide-react';
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
  { to: '/agency/regulatory', label: '규제 레이더', shortLabel: '규제', icon: Radio },
];

const lawyerLinks = [
  { to: '/lawyer/reviews', label: '문서 검토', shortLabel: '검토', icon: Gavel },
];

const adminLinks = [
  { to: '/admin/agencies', label: '업체 승인', shortLabel: '업체', icon: Building2 },
  { to: '/lawyer/reviews', label: '문서 검토', shortLabel: '검토', icon: Gavel },
];

export default function Sidebar() {
  const role = useAuthStore((state) => state.user?.role);
  const links = role === 'lawyer' ? lawyerLinks : role === 'admin' ? adminLinks : agencyLinks;

  return (
    <>
      <aside className="hidden w-[268px] shrink-0 flex-col bg-[#102621] text-white lg:flex">
        <div className="px-6 pb-8 pt-6"><BrandMark inverse /></div>
        <div className="px-6 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/45">
          {role === 'lawyer' ? 'Legal workspace' : role === 'admin' ? 'Administration' : 'Agency workspace'}
        </div>
        <nav className="space-y-1 px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium ${isActive ? 'bg-white/[0.11] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-emerald-300 group-hover:bg-emerald-400/10"><Icon size={17} /></span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)]" />보안 연결됨</div>
            <p className="text-[11px] leading-5 text-slate-400">고객정보와 업무문서는 역할별 권한에 따라 분리됩니다.</p>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center overflow-x-auto rounded-2xl border border-white/10 bg-[#102621]/95 p-1.5 shadow-[0_16px_50px_rgba(16,38,33,.32)] backdrop-blur-xl lg:hidden">
        {links.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium ${isActive ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
            <Icon size={17} /><span className="whitespace-nowrap">{shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
