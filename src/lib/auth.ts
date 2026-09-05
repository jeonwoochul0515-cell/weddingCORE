// Firebase 인증 래퍼 — 로그인·가입·구글 로그인·비밀번호 재설정과 오류 문구 우리말 변환
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  agencyId: string | null;
  role: string | null;
} | null;

export function subscribeToAuth(callback: (user: AuthUser) => void) {
  return onAuthStateChanged(auth, async (fbUser: User | null) => {
    if (!fbUser) return callback(null);
    // 관리자/변호사 권한 변경 직후에도 오래된 세션 클레임을 사용하지 않도록
    // 인증 상태가 잡힐 때마다 최신 토큰을 확인합니다.
    const token = await fbUser.getIdTokenResult(true);
    callback({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      agencyId: (token.claims.agencyId as string | undefined) ?? null,
      role: (token.claims.role as string | undefined) ?? null,
    });
  });
}

export function signInEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}
export function signUpEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export function signInGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export function signOut() {
  return fbSignOut(auth);
}
/** 비밀번호 재설정 메일. 로그인 화면으로 돌아오도록 주소를 넣어 둔다. */
export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login` });
}

/**
 * Firebase 오류 코드를 사장이 읽을 수 있는 말로 바꾼다.
 * "Firebase: Error (auth/invalid-credential)" 같은 문구가 그대로 화면에 나가면
 * 무엇을 어떻게 하라는 것인지 알 수 없다.
 */
const AUTH_MESSAGE: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않습니다.',
  'auth/wrong-password': '비밀번호가 맞지 않습니다.',
  'auth/user-not-found': '이 이메일로 만든 계정이 없습니다. 가입하기를 눌러 주세요.',
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/missing-password': '비밀번호를 입력해 주세요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 눌러 주세요.',
  'auth/too-many-requests': '여러 번 실패해 잠시 막혔습니다. 몇 분 뒤 다시 하거나 비밀번호 찾기를 눌러 주세요.',
  'auth/user-disabled': '사용이 중지된 계정입니다. 사무실로 문의해 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  'auth/popup-closed-by-user': '구글 로그인 창이 닫혔습니다. 다시 눌러 주세요.',
  'auth/popup-blocked': '팝업이 막혀 구글 로그인 창을 열지 못했습니다. 팝업 허용 후 다시 눌러 주세요.',
  'auth/cancelled-popup-request': '구글 로그인 창이 닫혔습니다. 다시 눌러 주세요.',
  'auth/account-exists-with-different-credential': '같은 이메일로 이미 가입돼 있습니다. 이메일과 비밀번호로 로그인해 주세요.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  const direct = AUTH_MESSAGE[code];
  if (direct) return direct;
  const raw = (err as { message?: string }).message ?? '';
  const match = raw.match(/\(auth\/[a-z-]+\)/);
  const fromMessage = match ? AUTH_MESSAGE[match[0].slice(1, -1)] : undefined;
  return fromMessage ?? '처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
}
