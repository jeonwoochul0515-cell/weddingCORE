import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
    const token = await fbUser.getIdTokenResult();
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
