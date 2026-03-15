export type UserRole =
  | 'superadmin'
  | 'centre_director'
  | 'admissions_admin'
  | 'lecturer'
  | 'programme_leader'
  | 'iqa_officer'
  | 'exams_officer'
  | 'finance_officer'
  | 'marketing_officer'
  | 'agent'
  | 'student'
  | 'university_partner'
  | 'employer_partner';

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
  stage: 'lead' | 'contacted' | 'qualified' | 'applied' | 'under_review' | 'conditional_offer' | 'unconditional_offer' | 'deposit_paid' | 'enrolled' | 'lost';
  assignedAgent: string;
  lastContact: string;
  notes: string;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  commissionAmount: number;
  createdAt: string;
}

export interface Application {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  programme: string;
  level: string;
  stage: 'lead' | 'contacted' | 'qualified' | 'applied' | 'under_review' | 'conditional_offer' | 'unconditional_offer' | 'deposit_paid' | 'enrolled' | 'lost' | 'deferred';
  documents: DocumentStatus[];
  counsellor: string;
  source: string;
  createdAt: string;
  lastActivity: string;
}

export interface DocumentStatus {
  name: string;
  status: 'uploaded' | 'pending' | 'verified' | 'rejected';
}

export interface QAReview {
  id: string;
  studentName: string;
  module: string;
  assignment: string;
  lecturer: string;
  grade: string;
  moderationStatus: 'pending' | 'sampled' | 'approved' | 'flagged' | 'referred';
  plagiarismScore: number;
  aiFlag: boolean;
  reviewedBy: string;
  reviewDate: string;
}

export interface Invoice {
  id: string;
  studentName: string;
  type: 'tuition' | 'exam' | 'deposit' | 'commission';
  amount: number;
  paid: number;
  status: 'paid' | 'partial' | 'overdue' | 'pending' | 'refunded';
  dueDate: string;
  issuedDate: string;
  instalments: number;
}

export interface PlatformStats {
  totalTenants: number;
  totalStudents: number;
  totalRevenue: number;
  activeClasses: number;
  pendingPayments: number;
  complianceScore: number;
}

export interface Programme {
  id: string;
  title: string;
  level: string;
  awardingBody: 'OTHM' | 'QUALIFI' | 'IAB';
  credits: number;
  duration: string;
  modules: number;
  status: 'active' | 'draft' | 'archived';
  enrolled: number;
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  module: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  method: 'online' | 'qr' | 'manual' | 'biometric';
}

export interface ExamEntry {
  id: string;
  studentName: string;
  module: string;
  date: string;
  room: string;
  seat: string;
  identityVerified: boolean;
  status: 'admitted' | 'denied' | 'pending' | 'completed';
  incidents: string[];
}
