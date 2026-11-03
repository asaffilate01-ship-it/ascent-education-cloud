import { useAuth, ROLE_HOME } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, ClipboardList, BarChart3, MessageSquare,
  UserPlus, CreditCard, Building2, Users, Briefcase, ShieldCheck,
  FileText, Megaphone, GraduationCap, Bell, Video, Globe2,
  Mail, HeartHandshake, CalendarDays, ClipboardCheck,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { isPublicMobilePath } from '@/lib/mobileTabRoutes';
import type { UserRole } from '@/types/platform';
import type { LucideIcon } from 'lucide-react';

interface BottomNavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

export const PUBLIC_BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Study', icon: BookOpen, path: '/study' },
  { label: 'Apply', icon: UserPlus, path: '/apply' },
  { label: 'Abroad', icon: Globe2, path: '/pathways' },
  { label: 'Sign in', icon: Home, path: '/login' },
];

export const BOTTOM_NAV: Record<UserRole, BottomNavItem[]> = {
  office_admin: [
    {label:'Office',icon:Home,path:'/office'},
    {label:'Guidance',icon:ClipboardCheck,path:'/office/compliance-preparation'},
    {label:'Workspace',icon:BookOpen,path:'/workspace'},
  ],
  hr_officer: [
    {label:'HR',icon:Home,path:'/office'},
    {label:'Workspace',icon:BookOpen,path:'/workspace'},
    {label:'Alerts',icon:Bell,path:'/notifications'},
  ],
  secretary: [
    {label:'Office',icon:Home,path:'/office'},
    {label:'Guidance',icon:ClipboardCheck,path:'/office/compliance-preparation'},
    {label:'Workspace',icon:BookOpen,path:'/workspace'},
  ],
  security_officer: [
    {label:'Operations',icon:Home,path:'/security/operations'},
    {label:'Visitors',icon:Users,path:'/security/visitors'},
    {label:'Muster',icon:ShieldCheck,path:'/security/muster'},
    {label:'CCTV',icon:Video,path:'/security'},
  ],
  student: [
    { label: 'Home', icon: Home, path: '/student' },
    { label: 'Courses', icon: BookOpen, path: '/student/courses' },
    { label: 'Tasks', icon: ClipboardList, path: '/student/assignments' },
    { label: 'Grades', icon: BarChart3, path: '/student/grades' },
    { label: 'Help', icon: HeartHandshake, path: '/student/wellbeing' },
  ],
  lecturer: [
    { label: 'Home', icon: Home, path: '/lecturer' },
    { label: 'Teaching', icon: BookOpen, path: '/lecturer/teaching' },
    { label: 'Live', icon: Video, path: '/lecturer/classroom' },
    { label: 'Students', icon: Users, path: '/lecturer/students' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  centre_director: [
    { label: 'Home', icon: Home, path: '/director' },
    { label: 'Admissions', icon: UserPlus, path: '/director/admissions' },
    { label: 'Finance', icon: CreditCard, path: '/director/finance' },
    { label: 'Staff', icon: Users, path: '/director/staff' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  superadmin: [
    { label: 'Home', icon: Home, path: '/landlord' },
    { label: 'Centres', icon: Building2, path: '/landlord/centres' },
    { label: 'Finance', icon: CreditCard, path: '/landlord/finance' },
    { label: 'Users', icon: Users, path: '/landlord/users' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  agent: [
    { label: 'Pipeline', icon: Home, path: '/agent' },
    { label: 'Leads', icon: UserPlus, path: '/agent/leads' },
    { label: 'Resources', icon: BookOpen, path: '/agent/resources' },
    { label: 'Commission status', icon: CreditCard, path: '/agent/commissions' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  parent_guardian: [
    { label: 'Home', icon: Home, path: '/parent' },
    { label: 'Progress', icon: BarChart3, path: '/parent/progress' },
    { label: 'Chat', icon: MessageSquare, path: '/parent/messages' },
  ],
  admissions_admin: [
    { label: 'Home', icon: Home, path: '/admissions' },
    { label: 'Pipeline', icon: UserPlus, path: '/admissions/applications' },
    { label: 'Offers', icon: ClipboardCheck, path: '/admissions/offers' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  finance_officer: [
    { label: 'Home', icon: Home, path: '/finance' },
    { label: 'Invoices', icon: CreditCard, path: '/finance/invoices' },
    { label: 'Reports', icon: BarChart3, path: '/finance/reports' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  programme_leader: [
    { label: 'Home', icon: Home, path: '/programme' },
    { label: 'Modules', icon: GraduationCap, path: '/programme/modules' },
    { label: 'Schedule', icon: CalendarDays, path: '/programme/schedule' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  iqa_officer: [
    { label: 'Home', icon: Home, path: '/qa' },
    { label: 'Compliance', icon: ShieldCheck, path: '/compliance' },
    { label: 'Review status', icon: FileText, path: '/qa/audit' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  exams_officer: [
    { label: 'Home', icon: Home, path: '/exams' },
    { label: 'Exam plans', icon: ClipboardCheck, path: '/exams/session-plans' },
    { label: 'Schedule', icon: ClipboardList, path: '/exams/schedule' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  marketing_officer: [
    { label: 'Home', icon: Home, path: '/marketing' },
    { label: 'Campaigns', icon: Megaphone, path: '/marketing/campaigns' },
    { label: 'Analytics', icon: BarChart3, path: '/marketing/analytics' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  university_partner: [
    { label: 'Home', icon: Home, path: '/partner' },
    { label: 'Applications', icon: Users, path: '/partner/applications' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  employer_partner: [
    { label: 'Home', icon: Home, path: '/employer' },
    { label: 'Roles', icon: Briefcase, path: '/employer/jobs' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  assessor: [
    { label: 'Queue', icon: ClipboardCheck, path: '/assessor' },
    { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
  ],
  awarding_body_eqa: [
    { label: 'Evidence', icon: ClipboardCheck, path: '/eqa' },
    { label: 'Activity', icon: FileText, path: '/my-activity' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
  ],
  welfare_officer: [
    { label: 'Welfare', icon: HeartHandshake, path: '/health' },
    { label: 'Requests', icon: ClipboardList, path: '/welfare/support' },
    { label: 'Residential', icon: Building2, path: '/residential' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
};

export { isMobileTabActive, isPublicMobilePath } from '@/lib/mobileTabRoutes';

export function getBottomNavItems(role: UserRole | null, path: string): BottomNavItem[] {
  if (!role || isPublicMobilePath(path)) return PUBLIC_BOTTOM_NAV;
  return BOTTOM_NAV[role] || [{ label: 'Home', icon: Home, path: ROLE_HOME[role] }];
}

export default function MobileBottomNav() {
  const { user, loading } = useAuth();
  const mobile = useIsMobile();
  const { pathname } = useLocation();
  // Public pages use Lovable's newer PublicBottomNav. Never render two fixed bars.
  if (!mobile || loading || !user || isPublicMobilePath(pathname)) return null;
  const items = BOTTOM_NAV[user.role] || [{ label: 'Home', icon: Home, path: ROLE_HOME[user.role] }];

  return (
    <nav aria-label="Dashboard mobile tabs" className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-white/95 shadow-[0_-8px_28px_rgba(11,45,91,0.08)] backdrop-blur-xl dark:bg-card/95 lg:hidden">
      <div className="mx-auto flex max-w-xl items-stretch justify-around gap-0.5 px-1 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {items.map(({ label, icon: Icon, path }) => (
          <NavLink key={path} to={path} end className={({ isActive }) =>
            `flex min-h-[55px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${isActive ? 'bg-green-50 text-[#087E50] dark:bg-green-950' : 'text-muted-foreground hover:bg-secondary'}`
          }>
            <Icon aria-hidden={true} className="size-[21px] shrink-0" />
            <span className="max-w-full truncate text-[10px] font-semibold leading-4">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
