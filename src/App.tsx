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
    // 초대장 확인은 한 번만. 초대가 없는 사람이 화면을 옮길 때마다 서버를 부르면 안 된다.
    let inviteChecked = false;
    void import('./lib/auth').then(({ subscribeToAuth }) => {
      if (cancelled) return;
      unsubscribe = subscribeToAuth((user) => {
        setUser(user);
        // 로그인은 했는데 아직 어느 업체에도 속하지 않은 사람. 초대장이 와 있으면 직원으로 붙는다.
        // 업체를 직접 만든 대표는 이미 소속이 있어 여기 오지 않는다.
        if (user && !user.agencyId && !inviteChecked) {
          inviteChecked = true;
          void import('./features/office/useStaff')
            .then(({ claimStaffInvite }) => claimStaffInvite())
            .then((res) => {
              // 붙었으면 새 클레임이 담긴 토큰을 받아야 화면이 열린다.
              if (res.data?.joined) window.location.reload();
            })
            .catch(() => undefined);   // 초대가 없으면 조용히 넘어간다. 가입 화면으로 가면 된다.
        }
      });
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
