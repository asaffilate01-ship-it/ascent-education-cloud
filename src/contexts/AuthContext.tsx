import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '@/types/platform';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<UserRole, AuthUser> = {
  superadmin: { id: '1', name: 'Platform Owner', email: 'admin@edusaas.com', role: 'superadmin' },
  tenant_admin: { id: '2', name: 'College Admin', email: 'admin@college.pk', role: 'tenant_admin', tenantId: 'demo-tenant' },
  lecturer: { id: '3', name: 'Dr. Ahmed Khan', email: 'ahmed@college.pk', role: 'lecturer', tenantId: 'demo-tenant' },
  student: { id: '4', name: 'Sara Ali', email: 'sara@student.pk', role: 'student', tenantId: 'demo-tenant' },
  agent: { id: '5', name: 'Bilal Recruitment', email: 'bilal@agents.pk', role: 'agent' },
  examiner: { id: '6', name: 'External Verifier', email: 'ev@othm.org.uk', role: 'examiner' },
  university_partner: { id: '7', name: 'University Partner', email: 'partner@uni.ac.uk', role: 'university_partner' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEMO_USERS.superadmin);

  const setRole = (role: UserRole) => setUser(DEMO_USERS[role]);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
