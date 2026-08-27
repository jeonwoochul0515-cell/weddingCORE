import { useEffect } from 'react';
import AppRoutes from './routes';
import { useAuthStore } from './store/authStore';

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Firebase는 첫 화면 렌더를 막지 않도록 늦게 불러온다. 인증 결과가 도착하기
    // 전까지 ProtectedRoute가 initialized=false 상태로 대기하므로 안전하다.
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void import('./lib/auth').then(({ subscribeToAuth }) => {
      if (cancelled) return;
      unsubscribe = subscribeToAuth((user) => setUser(user));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [setUser]);

  return <AppRoutes />;
}
