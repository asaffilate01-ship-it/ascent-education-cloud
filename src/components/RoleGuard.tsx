import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/types/platform';
import { ROLE_HOME } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowed: UserRole[];
}

export default function RoleGuard({ children, allowed }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has any of the allowed roles
  const hasAccess = user.roles.some(r => allowed.includes(r));
  
  if (!hasAccess) {
    // Redirect to user's home based on their primary role
    const home = ROLE_HOME[user.role] || '/student';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
