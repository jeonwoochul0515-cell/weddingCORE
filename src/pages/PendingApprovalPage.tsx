import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '@/lib/firebase';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

export default function PendingApprovalPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.agencyId && user.role) navigate('/agency', { replace: true });
  }, [user, navigate]);

  async function startNow() {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const agencyId = `ag_${uid.slice(0, 12)}`;
    setWorking(true);
    setError(null);
    try {
      const functions = getFunctions(app, 'asia-northeast3');
      await httpsCallable(functions, 'selfProvisionAgency')({ agencyId });
      const token = await auth.currentUser.getIdTokenResult(true);
      setUser({
        uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        agencyId: (token.claims.agencyId as string | undefined) ?? null,
        role: (token.claims.role as string | undefined) ?? null,
      });
      navigate('/agency');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">지금 바로 시작</h1>
        <p className="mb-6 text-sm text-slate-600">
          제출하신 등록번호로 즉시 계정이 활성화됩니다.
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex flex-col gap-2">
          <button
            onClick={startNow}
            disabled={working}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {working ? '활성화 중…' : '바로 시작하기'}
          </button>
          <button
            onClick={() => signOut()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
