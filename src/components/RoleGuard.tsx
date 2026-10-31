import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/types/platform';
import { ROLE_HOME } from '@/contexts/AuthContext';
import {activeRoleVerified,canUseActiveRole} from '@/lib/roleMembership';

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

  // A second role on the account is not automatically the active workspace role.
  // The role selector offers verified memberships; server RLS remains authoritative.
  if (!activeRoleVerified(user)) {
    return <main role="alert" className="mx-auto max-w-xl p-6">
      Your active role could not be verified. Refresh your account or contact your centre.
    </main>;
  }
  if (!canUseActiveRole(user,allowed)) {
    // Redirect to user's home based on their primary role
    const home = ROLE_HOME[user.role] || '/student';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
