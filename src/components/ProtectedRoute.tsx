import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="min-h-dvh flex items-center justify-center bg-background">
        <div aria-hidden="true" className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full motion-safe:animate-spin" />
        <span className="sr-only">Verifying workspace access…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
