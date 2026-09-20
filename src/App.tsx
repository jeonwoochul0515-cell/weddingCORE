import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from './routes';
import HaramChat from './components/chat/HaramChat';
import EmailVerifyNotice from './components/auth/EmailVerifyNotice';
import { useAuthStore } from './store/authStore';

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  // 초대장은 있는데 메일 인증이 안 끝난 사람. 이 사실을 알려주지 않으면 영영 못 들어온다.
  const [inviteBlocked, setInviteBlocked] = useState(false);
  // 상담 캐릭터를 띄우지 않는 화면.
  //  - /embed/* : 업체 홈페이지 iframe 안. 그 화면의 손님은 업체의 손님이다.
  //  - /call/*  : 화상맞선 통화방. 맞선을 보는 중에 옆에서 말을 걸면 안 된다.
  const { pathname } = useLocation();
  const chatHidden = pathname.startsWith('/embed/') || pathname.startsWith('/call/');

  useEffect(() => {
    // Firebase는 첫 화면 렌더를 막지 않도록 늦게 불러온다. 인증 결과가 도착하기
    // 전까지 ProtectedRoute가 initialized=false 상태로 대기하므로 안전하다.
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    // 초대장 확인은 사람당 한 번만 한다.
    // uid를 암기해야 한다 — 단순한 불리언이면 대표가 로그아웃한 뒤 같은 탭에서 직원이
    // 로그인했을 때 확인을 건너뛰어 그 직원이 가입 화면으로 튀긴다.
    const invitesChecked = new Set<string>();
    void import('./lib/auth').then(({ subscribeToAuth }) => {
      if (cancelled) return;
      unsubscribe = subscribeToAuth((user) => {
        setUser(user);
        // 로그인은 했는데 아직 어느 업체에도 속하지 않은 사람. 초대장이 와 있으면 직원으로 붙는다.
        // 업체를 직접 만든 대표는 이미 소속이 있어 여기 오지 않는다.
        if (user && !user.agencyId && !invitesChecked.has(user.uid)) {
          invitesChecked.add(user.uid);
          void import('./features/office/useStaff')
            .then(({ claimStaffInvite }) => claimStaffInvite())
            .then((res) => {
              // 붙었으면 새 클레임이 담긴 토큰을 받아야 화면이 열린다.
              if (res.data?.joined) window.location.reload();
              // 메일 인증만 남은 사람은 가입 화면으로 보내면 안 된다. 자기 업체를 또 만든다.
              else if (res.data?.reason === 'email-unverified') setInviteBlocked(true);
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
      {inviteBlocked && <EmailVerifyNotice onDismiss={() => setInviteBlocked(false)} />}
      {!chatHidden && <HaramChat />}
    </>
  );
}
