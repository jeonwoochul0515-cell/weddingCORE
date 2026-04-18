import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Radio, FileCheck2, Heart } from 'lucide-react';

const links = [
  { to: '/agency', label: '대시보드', icon: LayoutDashboard },
  { to: '/agency/clients', label: '고객 관리', icon: Users },
  { to: '/agency/matching', label: '매칭 관리', icon: Heart },
  { to: '/agency/regulatory', label: '규제 레이더', icon: Radio },
  { to: '/agency/documents', label: '서류 관리', icon: FileCheck2 },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-5 py-5 text-lg font-semibold text-slate-900">weddingCORE</div>
      <nav className="px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
