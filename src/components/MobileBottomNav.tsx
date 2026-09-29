import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, BarChart3, MessageSquare, UserPlus, CreditCard, Building2, Users, Briefcase, ShieldCheck, FileText, Megaphone, GraduationCap, Bell, Video } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { UserRole } from '@/types/platform';

interface BottomNavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const BOTTOM_NAV: Record<string, BottomNavItem[]> = {
  student: [
    { label: 'Home', icon: LayoutDashboard, path: '/student' },
    { label: 'Courses', icon: BookOpen, path: '/student/courses' },
    { label: 'Tasks', icon: ClipboardList, path: '/student/assignments' },
    { label: 'Grades', icon: BarChart3, path: '/student/grades' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  lecturer: [
    { label: 'Home', icon: LayoutDashboard, path: '/lecturer' },
    { label: 'Teaching', icon: BookOpen, path: '/lecturer/teaching' },
    { label: 'Live', icon: Video, path: '/lecturer/classroom' },
    { label: 'Students', icon: Users, path: '/lecturer/students' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  centre_director: [
    { label: 'Home', icon: LayoutDashboard, path: '/director' },
    { label: 'Admissions', icon: UserPlus, path: '/director/admissions' },
    { label: 'Finance', icon: CreditCard, path: '/director/finance' },
    { label: 'Staff', icon: Users, path: '/director/staff' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  superadmin: [
    { label: 'Home', icon: LayoutDashboard, path: '/landlord' },
    { label: 'Centres', icon: Building2, path: '/landlord/centres' },
    { label: 'Finance', icon: CreditCard, path: '/landlord/finance' },
    { label: 'Users', icon: Users, path: '/landlord/users' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  agent: [
    { label: 'Pipeline', icon: LayoutDashboard, path: '/agent' },
    { label: 'Leads', icon: UserPlus, path: '/agent/leads' },
    { label: 'Resources', icon: BookOpen, path: '/agent/resources' },
    { label: 'Commissions', icon: CreditCard, path: '/agent/commissions' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  parent_guardian: [
    { label: 'Home', icon: LayoutDashboard, path: '/parent' },
    { label: 'Progress', icon: BarChart3, path: '/parent/progress' },
    { label: 'Chat', icon: MessageSquare, path: '/parent/messages' },
  ],
  admissions_admin: [
    { label: 'Home', icon: LayoutDashboard, path: '/admissions' },
    { label: 'Pipeline', icon: UserPlus, path: '/admissions/applications' },
    { label: 'Students', icon: Users, path: '/director/students' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  finance_officer: [
    { label: 'Home', icon: LayoutDashboard, path: '/finance' },
    { label: 'Invoices', icon: CreditCard, path: '/finance/invoices' },
    { label: 'Reports', icon: BarChart3, path: '/finance/reports' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  programme_leader: [
    { label: 'Home', icon: LayoutDashboard, path: '/programme' },
    { label: 'Programmes', icon: GraduationCap, path: '/director/programmes' },
    { label: 'Schedule', icon: ClipboardList, path: '/schedule' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  iqa_officer: [
    { label: 'Home', icon: LayoutDashboard, path: '/qa' },
    { label: 'Compliance', icon: ShieldCheck, path: '/compliance' },
    { label: 'Audit', icon: FileText, path: '/audit' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  exams_officer: [
    { label: 'Home', icon: LayoutDashboard, path: '/exams' },
    { label: 'Gradebook', icon: BarChart3, path: '/gradebook' },
    { label: 'Schedule', icon: ClipboardList, path: '/schedule' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  marketing_officer: [
    { label: 'Home', icon: LayoutDashboard, path: '/marketing' },
    { label: 'Campaigns', icon: Megaphone, path: '/marketing/campaigns' },
    { label: 'Analytics', icon: BarChart3, path: '/marketing/analytics' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  university_partner: [
    { label: 'Home', icon: LayoutDashboard, path: '/partner' },
    { label: 'Applications', icon: Users, path: '/partner/applications' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
  employer_partner: [
    { label: 'Home', icon: LayoutDashboard, path: '/employer' },
    { label: 'Roles', icon: Briefcase, path: '/employer/jobs' },
    { label: 'Alerts', icon: Bell, path: '/notifications' },
    { label: 'Chat', icon: MessageSquare, path: '/messaging' },
  ],
};

export default function MobileBottomNav() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user || !isMobile) return null;

  const items = BOTTOM_NAV[user.role] || BOTTOM_NAV.student;

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-pb lg:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-[52px] transition-all ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
