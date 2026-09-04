import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from './routes';
import HaramChat from './components/chat/HaramChat';
import { useAuthStore } from './store/authStore';

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  // 업체 홈페이지 iframe(/embed/*) 안에서는 우리 상담 캐릭터를 띄우지 않는다. 그 화면의 손님은 업체의 손님이다.
  const embedded = useLocation().pathname.startsWith('/embed/');

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

  return (
    <>
      <AppRoutes />
      {!embedded && <HaramChat />}
    </>
  );
}
