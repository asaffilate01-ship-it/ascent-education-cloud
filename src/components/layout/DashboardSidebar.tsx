import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { UserRole } from '@/types/platform';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard, Shield,
  GraduationCap, BookOpen, Video, ClipboardList, BarChart3,
  MessageSquare, Library, Briefcase, UserPlus, PieChart,
  Settings, Palette, Globe, FileCheck, Bell, LogOut,
  ChevronLeft, ChevronRight, UserCheck, Calendar,
  Award, Megaphone, FileText, AlertTriangle, FolderOpen,
  Handshake, Monitor, Clock
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
    { label: 'Audit Logs', icon: FileText, path: '/superadmin/audit' },
    { label: 'Settings', icon: Settings, path: '/superadmin/settings' },
  ],
  centre_director: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/director' },
    { label: 'Admissions', icon: UserPlus, path: '/director/admissions' },
    { label: 'Programmes', icon: BookOpen, path: '/director/programmes' },
    { label: 'Staff', icon: Users, path: '/director/staff' },
    { label: 'Students', icon: GraduationCap, path: '/director/students' },
    { label: 'Quality', icon: FileCheck, path: '/director/quality' },
    { label: 'Finance', icon: CreditCard, path: '/director/finance' },
    { label: 'Agents', icon: Handshake, path: '/director/agents' },
    { label: 'Branding', icon: Palette, path: '/director/branding' },
    { label: 'Reports', icon: BarChart3, path: '/director/reports' },
    { label: 'Settings', icon: Settings, path: '/director/settings' },
  ],
  admissions_admin: [
    { label: 'Pipeline', icon: LayoutDashboard, path: '/admissions' },
    { label: 'Applications', icon: FolderOpen, path: '/admissions/applications' },
    { label: 'Documents', icon: FileText, path: '/admissions/documents' },
    { label: 'Eligibility', icon: UserCheck, path: '/admissions/eligibility' },
    { label: 'Offers', icon: Award, path: '/admissions/offers' },
    { label: 'Counselling', icon: MessageSquare, path: '/admissions/counselling' },
    { label: 'Reports', icon: BarChart3, path: '/admissions/reports' },
  ],
  lecturer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/lecturer' },
    { label: 'Teaching', icon: BookOpen, path: '/lecturer/teaching' },
    { label: 'Classroom', icon: Video, path: '/lecturer/classroom' },
    { label: 'Marking', icon: ClipboardList, path: '/lecturer/marking' },
    { label: 'Attendance', icon: Calendar, path: '/lecturer/attendance' },
    { label: 'Students', icon: GraduationCap, path: '/lecturer/students' },
    { label: 'Analytics', icon: BarChart3, path: '/lecturer/analytics' },
    { label: 'Messages', icon: MessageSquare, path: '/lecturer/messages' },
  ],
  programme_leader: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/programme' },
    { label: 'Modules', icon: BookOpen, path: '/programme/modules' },
    { label: 'Lecturers', icon: Users, path: '/programme/lecturers' },
    { label: 'Students', icon: GraduationCap, path: '/programme/students' },
    { label: 'Assessments', icon: ClipboardList, path: '/programme/assessments' },
    { label: 'Moderation', icon: FileCheck, path: '/programme/moderation' },
    { label: 'Analytics', icon: BarChart3, path: '/programme/analytics' },
  ],
  iqa_officer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/qa' },
    { label: 'Moderation', icon: FileCheck, path: '/qa/moderation' },
    { label: 'Sampling', icon: ClipboardList, path: '/qa/sampling' },
    { label: 'Plagiarism', icon: AlertTriangle, path: '/qa/plagiarism' },
    { label: 'Malpractice', icon: Shield, path: '/qa/malpractice' },
    { label: 'Appeals', icon: MessageSquare, path: '/qa/appeals' },
    { label: 'Audit Trail', icon: FileText, path: '/qa/audit' },
    { label: 'EV Packs', icon: FolderOpen, path: '/qa/evidence' },
  ],
  exams_officer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/exams' },
    { label: 'Schedule', icon: Calendar, path: '/exams/schedule' },
    { label: 'Rooms', icon: Monitor, path: '/exams/rooms' },
    { label: 'Seating', icon: Users, path: '/exams/seating' },
    { label: 'Entry Log', icon: UserCheck, path: '/exams/entry' },
    { label: 'Incidents', icon: AlertTriangle, path: '/exams/incidents' },
    { label: 'Results', icon: BarChart3, path: '/exams/results' },
  ],
  finance_officer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/finance' },
    { label: 'Invoices', icon: FileText, path: '/finance/invoices' },
    { label: 'Payments', icon: CreditCard, path: '/finance/payments' },
    { label: 'Instalments', icon: Clock, path: '/finance/instalments' },
    { label: 'Commissions', icon: Handshake, path: '/finance/commissions' },
    { label: 'Scholarships', icon: Award, path: '/finance/scholarships' },
    { label: 'Reports', icon: BarChart3, path: '/finance/reports' },
  ],
  marketing_officer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/marketing' },
    { label: 'Campaigns', icon: Megaphone, path: '/marketing/campaigns' },
    { label: 'Leads', icon: UserPlus, path: '/marketing/leads' },
    { label: 'Webinars', icon: Video, path: '/marketing/webinars' },
    { label: 'Analytics', icon: BarChart3, path: '/marketing/analytics' },
  ],
  agent: [
    { label: 'Pipeline', icon: LayoutDashboard, path: '/agent' },
    { label: 'Leads', icon: UserPlus, path: '/agent/leads' },
    { label: 'Applications', icon: FolderOpen, path: '/agent/applications' },
    { label: 'Commissions', icon: CreditCard, path: '/agent/commissions' },
    { label: 'Onboarding', icon: Briefcase, path: '/agent/onboarding' },
    { label: 'Resources', icon: Library, path: '/agent/resources' },
    { label: 'Messages', icon: MessageSquare, path: '/agent/messages' },
  ],
  student: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student' },
    { label: 'Courses', icon: BookOpen, path: '/student/courses' },
    { label: 'Classroom', icon: Video, path: '/student/classroom' },
    { label: 'Assignments', icon: ClipboardList, path: '/student/assignments' },
    { label: 'Grades', icon: BarChart3, path: '/student/grades' },
    { label: 'Attendance', icon: Calendar, path: '/student/attendance' },
    { label: 'Library', icon: Library, path: '/student/library' },
    { label: 'Finance', icon: CreditCard, path: '/student/finance' },
    { label: 'Progression', icon: GraduationCap, path: '/student/progression' },
    { label: 'Career', icon: Briefcase, path: '/student/career' },
    { label: 'Support', icon: MessageSquare, path: '/student/support' },
  ],
  university_partner: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/partner' },
    { label: 'Referrals', icon: Users, path: '/partner/referrals' },
    { label: 'Applications', icon: FolderOpen, path: '/partner/applications' },
    { label: 'Offers', icon: Award, path: '/partner/offers' },
    { label: 'Commissions', icon: CreditCard, path: '/partner/commissions' },
  ],
  employer_partner: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/employer' },
    { label: 'Job Posts', icon: Briefcase, path: '/employer/jobs' },
    { label: 'Candidates', icon: Users, path: '/employer/candidates' },
    { label: 'Internships', icon: GraduationCap, path: '/employer/internships' },
  ],
};

export default function DashboardSidebar() {
  const { user, setRole, logout } = useAuth();
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
              {ROLE_LABELS[user.role]}
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
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
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
