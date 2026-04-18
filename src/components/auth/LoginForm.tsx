import { useState } from 'react';
import { signInEmail, signInGoogle, signUpEmail } from '@/lib/auth';

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
    <div className="mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-center text-xl font-semibold text-slate-900">
        weddingCORE {mode === 'login' ? '로그인' : '회원가입'}
      </h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {mode === 'login' ? '로그인' : '가입하기'}
        </button>
      </form>
      <button
        onClick={onGoogle}
        disabled={loading}
        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        Google로 계속하기
      </button>
      <div className="mt-4 text-center text-xs text-slate-500">
        {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="font-medium text-slate-900 underline"
        >
          {mode === 'login' ? '가입하기' : '로그인'}
        </button>
      </div>
    </div>
  );
}
