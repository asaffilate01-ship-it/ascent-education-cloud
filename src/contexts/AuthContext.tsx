import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/platform';
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  tenantId?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  setRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  centre_director: 'Centre Director',
  admissions_admin: 'Admissions Admin',
  lecturer: 'Lecturer',
  assessor: 'Assessor',
  programme_leader: 'Programme Leader',
  iqa_officer: 'IQA / QA Officer',
  awarding_body_eqa: 'Awarding Body / EQA',
  welfare_officer: 'Welfare Officer',
  exams_officer: 'Exams Officer',
  finance_officer: 'Finance Officer',
  marketing_officer: 'Marketing Officer',
  agent: 'Agent',
  student: 'Student',
  parent_guardian: 'Parent / Guardian',
  university_partner: 'University Partner',
  employer_partner: 'Employer Partner',
};

export const ROLE_HOME: Record<UserRole, string> = {
  superadmin: '/landlord',
  centre_director: '/director',
  admissions_admin: '/admissions',
  lecturer: '/lecturer',
  assessor: '/assessor',
  programme_leader: '/programme',
  iqa_officer: '/qa',
  awarding_body_eqa: '/eqa',
  welfare_officer: '/health',
  exams_officer: '/exams',
  finance_officer: '/finance',
  marketing_officer: '/marketing',
  agent: '/agent',
  student: '/student',
  parent_guardian: '/parent',
  university_partner: '/partner',
  employer_partner: '/employer',
};

async function fetchAuthUser(supaUser: User): Promise<AuthUser> {
  // Make sure self-registered users have a UniPathway profile and role
  try { await (supabase.rpc as any)('ensure_my_account'); } catch { /* non-blocking */ }
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, tenant_id, avatar_url')
    .eq('user_id', supaUser.id)
    .single();

  // Fetch roles
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supaUser.id);

  const roles = (rolesData || []).map((r: any) => r.role as UserRole);
  const primaryRole = roles[0] || 'student';

  return {
    id: supaUser.id,
    name: profile?.full_name || supaUser.email || 'User',
    email: supaUser.email || '',
    role: primaryRole,
    roles,
    tenantId: profile?.tenant_id || undefined,
    avatarUrl: profile?.avatar_url || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async (supaSession: Session | null) => {
    if (!supaSession?.user) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }
    setSession(supaSession);
    try {
      const authUser = await fetchAuthUser(supaSession.user);
      setUser(authUser);
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        loadUser(newSession);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      loadUser(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setRole = (role: UserRole) => {
    if (user) setUser({ ...user, role });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const authUser = await fetchAuthUser(session.user);
      setUser(authUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, setRole, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
