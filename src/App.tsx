import { useEffect } from 'react';
import AppRoutes from './routes';
import { useAuthStore } from './store/authStore';
import { subscribeToAuth } from './lib/auth';

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => setUser(user));
    return () => unsubscribe();
  }, [setUser]);

  return <AppRoutes />;
}
