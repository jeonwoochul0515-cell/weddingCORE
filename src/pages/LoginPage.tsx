import { Navigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandMark from '@/components/brand/BrandMark';

export default function LoginPage() {
  const { user, initialized } = useAuthStore();

  if (!initialized) return null;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/agencies" replace />;
    if (user.role === 'lawyer') return <Navigate to="/lawyer/reviews" replace />;
    if (!user.agencyId) return <Navigate to="/signup/agency" replace />;
    if (!user.role) return <Navigate to="/pending-approval" replace />;
    return <Navigate to="/agency" replace />;
  }

  return (
    <div className="grid min-h-screen bg-[#f6f7f3] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#102621] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-28 top-1/4 h-96 w-96 rounded-full bg-emerald-400/20 blur-[100px]" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-teal-300/10 blur-[100px]" />
        <div className="relative"><BrandMark inverse /></div>
        <div className="relative my-auto max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-emerald-200"><Sparkles size={14} />국제결혼중개업 AI 운영체제</div>
          <h1 className="text-5xl font-bold leading-[1.14] tracking-[-0.045em]">반복업무는 줄이고,<br /><span className="text-emerald-300">고객에게 집중하세요.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">서류·기한·법정의무·변호사 검토를 하나의 안전한 워크스페이스에서 관리합니다.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {['AI 문서 초안 크레딧', '변호사 승인 워크플로', '개인정보 동의 게이트', '업체별 데이터 완전 분리'].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-300" />{item}</div>)}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="text-emerald-400" />Firebase App Check · 역할 기반 접근제어 적용</div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <Link to="/" className="absolute left-5 top-5 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 sm:left-8 sm:top-8"><ArrowLeft size={15} />홈으로</Link>
        <div className="absolute right-5 top-5 lg:hidden"><BrandMark /></div>
        <LoginForm />
      </section>
    </div>
  );
}
