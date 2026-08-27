import { useState } from 'react';
import { signInEmail, signInGoogle, signUpEmail } from '@/lib/auth';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

export default function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') await signInEmail(email, password);
      else await signUpEmail(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInGoogle();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[420px] animate-rise">
      <div className="mb-8">
        <div className="eyebrow">Welcome to weddingCORE</div>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#102621]">{mode === 'login' ? '다시 만나서 반갑습니다' : '새 워크스페이스 만들기'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'login' ? '안전한 업무공간에 로그인하세요.' : '이메일 계정 생성 후 업체정보를 등록합니다.'}</p>
      </div>
      <div className="app-surface rounded-[26px] p-5 sm:p-7">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">이메일</span><span className="relative block"><Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="field-control !pl-10" /></span></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">비밀번호</span><span className="relative block"><LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상 입력" className="field-control !pl-10" /></span></label>
        {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">로그인 정보를 확인해 주세요. {error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="primary-button !mt-5 w-full !py-3"
        >
          {loading ? '처리 중…' : mode === 'login' ? '로그인' : '무료로 가입하기'} {!loading && <ArrowRight size={16} />}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-[10px] font-semibold tracking-wider text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">또는</div>
      <button
        onClick={onGoogle}
        disabled={loading}
        className="secondary-button w-full !py-3"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-blue-600 shadow-sm ring-1 ring-slate-200">G</span>Google 계정으로 계속하기
      </button>
      <div className="mt-5 text-center text-xs text-slate-500">
        {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="font-bold text-emerald-700 hover:text-emerald-800"
        >
          {mode === 'login' ? '가입하기' : '로그인'}
        </button>
      </div>
      </div>
      <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">계속하면 개인정보처리방침과 서비스 이용약관에 동의하는 것으로 간주됩니다.</p>
    </div>
  );
}
