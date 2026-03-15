import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/platform';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard, Shield,
  GraduationCap, BookOpen, Video, ClipboardList, BarChart3,
  MessageSquare, Library, Briefcase, UserPlus, PieChart,
  Settings, Palette, Globe, FileCheck, Bell, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const NAV_CONFIG: Record<UserRole, NavItem[]> = {
  superadmin: [
    { label: 'Overview', icon: LayoutDashboard, path: '/superadmin' },
    { label: 'Tenants', icon: Building2, path: '/superadmin/tenants' },
    { label: 'Users', icon: Users, path: '/superadmin/users' },
    { label: 'Finance', icon: CreditCard, path: '/superadmin/finance' },
    { label: 'Subscriptions', icon: PieChart, path: '/superadmin/subscriptions' },
    { label: 'Compliance', icon: Shield, path: '/superadmin/compliance' },
    { label: 'Platform', icon: Globe, path: '/superadmin/platform' },
    { label: 'Settings', icon: Settings, path: '/superadmin/settings' },
  ],
  tenant_admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Students', icon: GraduationCap, path: '/admin/students' },
    { label: 'Courses', icon: BookOpen, path: '/admin/courses' },
    { label: 'Lecturers', icon: Users, path: '/admin/lecturers' },
    { label: 'Classrooms', icon: Video, path: '/admin/classrooms' },
    { label: 'Assessments', icon: ClipboardList, path: '/admin/assessments' },
    { label: 'Finance', icon: CreditCard, path: '/admin/finance' },
    { label: 'Quality', icon: FileCheck, path: '/admin/quality' },
    { label: 'Branding', icon: Palette, path: '/admin/branding' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ],
  agent: [
    { label: 'Pipeline', icon: LayoutDashboard, path: '/agent' },
    { label: 'Leads', icon: UserPlus, path: '/agent/leads' },
    { label: 'Clients', icon: Users, path: '/agent/clients' },
    { label: 'Commissions', icon: CreditCard, path: '/agent/commissions' },
    { label: 'Onboarding', icon: Briefcase, path: '/agent/onboarding' },
    { label: 'Messages', icon: MessageSquare, path: '/agent/messages' },
  ],
  student: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student' },
    { label: 'Courses', icon: BookOpen, path: '/student/courses' },
    { label: 'Classroom', icon: Video, path: '/student/classroom' },
    { label: 'Assignments', icon: ClipboardList, path: '/student/assignments' },
    { label: 'Grades', icon: BarChart3, path: '/student/grades' },
    { label: 'Library', icon: Library, path: '/student/library' },
    { label: 'Finance', icon: CreditCard, path: '/student/finance' },
    { label: 'Career', icon: Briefcase, path: '/student/career' },
  ],
  lecturer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/lecturer' },
    { label: 'Teaching', icon: BookOpen, path: '/lecturer/teaching' },
    { label: 'Classroom', icon: Video, path: '/lecturer/classroom' },
    { label: 'Marking', icon: ClipboardList, path: '/lecturer/marking' },
    { label: 'Students', icon: GraduationCap, path: '/lecturer/students' },
    { label: 'Analytics', icon: BarChart3, path: '/lecturer/analytics' },
    { label: 'Messages', icon: MessageSquare, path: '/lecturer/messages' },
  ],
  examiner: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/examiner' },
    { label: 'Verifications', icon: FileCheck, path: '/examiner/verifications' },
    { label: 'Reports', icon: BarChart3, path: '/examiner/reports' },
  ],
  university_partner: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/partner' },
    { label: 'Applications', icon: Users, path: '/partner/applications' },
    { label: 'Offers', icon: Briefcase, path: '/partner/offers' },
    { label: 'Commissions', icon: CreditCard, path: '/partner/commissions' },
  ],
};

export default function DashboardSidebar() {
  const { user, setRole, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const items = NAV_CONFIG[user.role] || [];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-default ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">EduPathway</p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === items[0]?.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-default ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Role Switcher (Demo) */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <p className="text-label mb-1.5 px-1">Switch Role</p>
          <select
            value={user.role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full bg-sidebar-accent text-sidebar-foreground text-xs rounded-md px-2 py-1.5 outline-none"
          >
            <option value="superadmin">Super Admin</option>
            <option value="tenant_admin">Tenant Admin</option>
            <option value="agent">Agent</option>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="examiner">Examiner</option>
            <option value="university_partner">University Partner</option>
          </select>
        </div>
      )}

      {/* Footer */}
      <div className="px-2 py-2 border-t border-sidebar-border flex items-center gap-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-default text-sidebar-foreground/50"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        {!collapsed && (
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-default ml-auto pr-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}
