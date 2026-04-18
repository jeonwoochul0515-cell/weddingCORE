import { Navigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const { user, initialized } = useAuthStore();

  if (!initialized) return null;
  if (user) {
    if (!user.agencyId) return <Navigate to="/signup/agency" replace />;
    if (!user.role) return <Navigate to="/pending-approval" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/agencies" replace />;
    return <Navigate to="/agency" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <LoginForm />
    </div>
  );
}
