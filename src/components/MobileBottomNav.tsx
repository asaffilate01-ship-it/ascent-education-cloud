import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, BarChart3, MessageSquare, UserPlus, CreditCard, Building2, Users, Briefcase } from 'lucide-react';
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
    { label: 'Marking', icon: ClipboardList, path: '/lecturer/marking' },
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
                <span className="text-[10px] font-medium leading-none" aria-hidden="true">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
