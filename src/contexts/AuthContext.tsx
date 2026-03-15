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
  centre_director: { id: '2', name: 'Dr. Shahid Malik', email: 'director@college.pk', role: 'centre_director', tenantId: 'demo-tenant' },
  admissions_admin: { id: '3', name: 'Ayesha Tariq', email: 'admissions@college.pk', role: 'admissions_admin', tenantId: 'demo-tenant' },
  lecturer: { id: '4', name: 'Dr. Ahmed Khan', email: 'ahmed@college.pk', role: 'lecturer', tenantId: 'demo-tenant' },
  programme_leader: { id: '5', name: 'Prof. Nadia Shah', email: 'nadia@college.pk', role: 'programme_leader', tenantId: 'demo-tenant' },
  iqa_officer: { id: '6', name: 'Mr. Imran Syed', email: 'iqa@college.pk', role: 'iqa_officer', tenantId: 'demo-tenant' },
  exams_officer: { id: '7', name: 'Ms. Sana Mir', email: 'exams@college.pk', role: 'exams_officer', tenantId: 'demo-tenant' },
  finance_officer: { id: '8', name: 'Mr. Tariq Hussain', email: 'finance@college.pk', role: 'finance_officer', tenantId: 'demo-tenant' },
  marketing_officer: { id: '9', name: 'Ms. Hira Ali', email: 'marketing@college.pk', role: 'marketing_officer', tenantId: 'demo-tenant' },
  agent: { id: '10', name: 'Bilal Recruitment', email: 'bilal@agents.pk', role: 'agent' },
  student: { id: '11', name: 'Sara Ali', email: 'sara@student.pk', role: 'student', tenantId: 'demo-tenant' },
  university_partner: { id: '12', name: 'University of London', email: 'partner@uni.ac.uk', role: 'university_partner' },
  employer_partner: { id: '13', name: 'Tech Corp HR', email: 'hr@techcorp.com', role: 'employer_partner' },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  centre_director: 'Centre Director',
  admissions_admin: 'Admissions Admin',
  lecturer: 'Lecturer',
  programme_leader: 'Programme Leader',
  iqa_officer: 'IQA / QA Officer',
  exams_officer: 'Exams Officer',
  finance_officer: 'Finance Officer',
  marketing_officer: 'Marketing Officer',
  agent: 'Agent',
  student: 'Student',
  university_partner: 'University Partner',
  employer_partner: 'Employer Partner',
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
