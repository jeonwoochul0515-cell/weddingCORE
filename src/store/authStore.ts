import { create } from 'zustand';
import type { AuthUser } from '@/lib/auth';

type AuthState = {
  user: AuthUser;
  initialized: boolean;
  setUser: (user: AuthUser) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  setUser: (user) => set({ user, initialized: true }),
}));
