// 로그인·가입·비밀번호 찾기를 한 카드에서 처리하는 폼
import { useState } from 'react';
import { authErrorMessage, sendPasswordReset, signInEmail, signInGoogle, signUpEmail } from '@/lib/auth';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

type Mode = 'login' | 'signup' | 'reset';

const COPY: Record<Mode, { eyebrow: string; title: string; lead: string; submit: string }> = {
  login: { eyebrow: '업체 로그인', title: '다시 만나서 반갑습니다', lead: '이메일과 비밀번호로 로그인하세요.', submit: '로그인' },
  signup: { eyebrow: '업체 가입', title: '계정 만들기', lead: '계정을 만든 뒤 사업자등록증으로 업체 정보를 등록합니다.', submit: '무료로 가입하기' },
  reset: { eyebrow: '비밀번호 찾기', title: '비밀번호를 다시 정합니다', lead: '가입한 이메일을 적으면 비밀번호를 새로 정할 수 있는 메일을 보냅니다.', submit: '재설정 메일 보내기' },
};

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setPasswordConfirm('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup' && password !== passwordConfirm) {
      setError('비밀번호 두 개가 서로 다릅니다. 같은 비밀번호를 두 번 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') await signInEmail(email, password);
      else if (mode === 'signup') await signUpEmail(email, password);
      else {
        await sendPasswordReset(email);
        setNotice(`${email} 로 비밀번호 재설정 메일을 보냈습니다. 메일이 안 보이면 스팸함을 확인해 주세요.`);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await signInGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const copy = COPY[mode];

  return (
    <div className="mx-auto w-full max-w-[420px] animate-rise">
      <div className="mb-8">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#102621]">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{copy.lead}</p>
      </div>
      <div className="app-surface rounded-[26px] p-5 sm:p-7">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">이메일</span><span className="relative block"><Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="field-control !pl-10" /></span></label>
        {mode !== 'reset' && (
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">비밀번호</span><span className="relative block"><LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상 입력" className="field-control !pl-10" /></span></label>
        )}
        {mode === 'signup' && (
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">비밀번호 한 번 더</span><span className="relative block"><LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" autoComplete="new-password" required minLength={6} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="같은 비밀번호를 다시 입력" className="field-control !pl-10" /></span></label>
        )}
        {mode === 'login' && (
          <div className="text-right">
            <button type="button" onClick={() => switchMode('reset')} className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-emerald-700">비밀번호를 잊으셨나요?</button>
          </div>
        )}
        {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800">{notice}</p>}
        <button
          type="submit"
          disabled={loading}
          className="primary-button !mt-5 w-full !py-3"
        >
          {loading ? '처리 중…' : copy.submit} {!loading && <ArrowRight size={16} />}
        </button>
      </form>
      {mode !== 'reset' && (
        <>
          <div className="my-5 flex items-center gap-3 text-[10px] font-semibold tracking-wider text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200">또는</div>
          <button
            onClick={onGoogle}
            disabled={loading}
            className="secondary-button w-full !py-3"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-blue-600 shadow-sm ring-1 ring-slate-200">G</span>Google 계정으로 계속하기
          </button>
        </>
      )}
      <div className="mt-5 text-center text-xs text-slate-500">
        {mode === 'login' && <>계정이 없으신가요? <button onClick={() => switchMode('signup')} className="font-bold text-emerald-700 hover:text-emerald-800">가입하기</button></>}
        {mode === 'signup' && <>이미 계정이 있으신가요? <button onClick={() => switchMode('login')} className="font-bold text-emerald-700 hover:text-emerald-800">로그인</button></>}
        {mode === 'reset' && <>비밀번호가 기억나셨나요? <button onClick={() => switchMode('login')} className="font-bold text-emerald-700 hover:text-emerald-800">로그인으로 돌아가기</button></>}
      </div>
      </div>
      <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">계속하면 개인정보처리방침과 서비스 이용약관에 동의하는 것으로 간주됩니다.</p>
    </div>
  );
}
