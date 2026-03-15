export type UserRole = 'superadmin' | 'tenant_admin' | 'lecturer' | 'student' | 'agent' | 'examiner' | 'university_partner';

export interface TenantTheme {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
  fontFamily: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  customDomain: string;
  brandName: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  theme: TenantTheme;
  status: 'active' | 'suspended' | 'onboarding';
  plan: 'starter' | 'professional' | 'enterprise';
  studentsCount: number;
  monthlyRevenue: number;
  createdAt: string;
}

export interface AgentLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  course: string;
  stage: 'new' | 'contacted' | 'interested' | 'applied' | 'enrolled' | 'lost';
  assignedAgent: string;
  lastContact: string;
  notes: string;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  commissionAmount: number;
  createdAt: string;
}

export interface PlatformStats {
  totalTenants: number;
  totalStudents: number;
  totalRevenue: number;
  activeClasses: number;
  pendingPayments: number;
  complianceScore: number;
}
