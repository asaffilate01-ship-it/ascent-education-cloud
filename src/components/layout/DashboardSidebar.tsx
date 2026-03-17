import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { UserRole } from '@/types/platform';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard, Shield,
  GraduationCap, BookOpen, Video, ClipboardList, BarChart3,
  MessageSquare, Library, Briefcase, UserPlus, PieChart,
  Settings, Palette, Globe, FileCheck, LogOut,
  ChevronLeft, ChevronRight, UserCheck, Calendar,
  Award, Megaphone, FileText, AlertTriangle, FolderOpen,
  Handshake, Monitor, Clock, Cloud, Menu, X,
  Bus, Heart, Sparkles, CalendarDays, Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_CONFIG: Record<UserRole, NavSection[]> = {
  superadmin: [
    { title: 'Platform', items: [
      { label: 'Overview', icon: LayoutDashboard, path: '/landlord' },
      { label: 'All Centres', icon: Building2, path: '/landlord/centres' },
      { label: 'Platform Users', icon: Users, path: '/landlord/users' },
    ]},
    { title: 'Revenue', items: [
      { label: 'Finance', icon: CreditCard, path: '/landlord/finance' },
      { label: 'Subscriptions', icon: PieChart, path: '/landlord/subscriptions' },
    ]},
    { title: 'Operations', items: [
      { label: 'Compliance', icon: Shield, path: '/compliance' },
      { label: 'Onboarding', icon: UserPlus, path: '/landlord/onboarding' },
      { label: 'Audit Logs', icon: FileText, path: '/audit' },
      { label: 'Infrastructure', icon: Globe, path: '/landlord/infrastructure' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
      { label: 'Settings', icon: Settings, path: '/landlord/settings' },
    ]},
  ],
  centre_director: [
    { title: 'College', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/director' },
      { label: 'Admissions', icon: UserPlus, path: '/director/admissions' },
      { label: 'Programmes', icon: BookOpen, path: '/director/programmes' },
      { label: 'Staff', icon: Users, path: '/director/staff' },
      { label: 'Students', icon: GraduationCap, path: '/director/students' },
    ]},
    { title: 'Operations', items: [
      { label: 'Quality', icon: FileCheck, path: '/director/quality' },
      { label: 'Compliance', icon: Shield, path: '/compliance' },
      { label: 'Finance', icon: CreditCard, path: '/director/finance' },
      { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
      { label: 'Schedule', icon: Calendar, path: '/director/schedule' },
      { label: 'Lesson Plans', icon: BookOpen, path: '/lesson-plans' },
      { label: 'Leave', icon: Clock, path: '/leave' },
      { label: 'Transport', icon: Bus, path: '/transport' },
      { label: 'Health Records', icon: Heart, path: '/health' },
      { label: 'AI Insights', icon: Sparkles, path: '/ai-recommendations' },
      { label: 'Residential', icon: Building2, path: '/residential' },
      { label: 'Agents', icon: Handshake, path: '/director/agents' },
      { label: 'Audit Logs', icon: FileText, path: '/audit' },
      { label: 'Report Cards', icon: FileText, path: '/lecturer/report-cards' },
      { label: 'Reports', icon: BarChart3, path: '/director/reports' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
      { label: 'Branding', icon: Palette, path: '/director/branding' },
      { label: 'Page Builder', icon: Monitor, path: '/director/page-builder' },
      { label: 'Domains & Email', icon: Globe, path: '/director/domains' },
      { label: 'Settings', icon: Settings, path: '/director/settings' },
    ]},
  ],
  admissions_admin: [
    { items: [
      { label: 'Pipeline', icon: LayoutDashboard, path: '/admissions' },
      { label: 'Applications', icon: FolderOpen, path: '/admissions/applications' },
      { label: 'Documents', icon: FileText, path: '/admissions/documents' },
      { label: 'Eligibility', icon: UserCheck, path: '/admissions/eligibility' },
      { label: 'Offers', icon: Award, path: '/admissions/offers' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Counselling', icon: MessageSquare, path: '/admissions/counselling' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
      { label: 'Reports', icon: BarChart3, path: '/admissions/reports' },
    ]},
  ],
  lecturer: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/lecturer' },
      { label: 'Teaching', icon: BookOpen, path: '/lecturer/teaching' },
      { label: 'Classroom', icon: Video, path: '/lecturer/classroom' },
      { label: 'IT Labs', icon: Cloud, path: '/lecturer/labs' },
      { label: 'Lesson Plans', icon: BookOpen, path: '/lesson-plans' },
      { label: 'Marking', icon: ClipboardList, path: '/lecturer/marking' },
      { label: 'Report Cards', icon: FileText, path: '/lecturer/report-cards' },
      { label: 'Attendance', icon: Calendar, path: '/lecturer/attendance' },
      { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
      { label: 'Leave', icon: Clock, path: '/leave' },
      { label: 'Timeline', icon: Clock, path: '/lecturer/timeline' },
      { label: 'Students', icon: GraduationCap, path: '/lecturer/students' },
      { label: 'Onboarding', icon: UserCheck, path: '/onboarding/lecturer' },
      { label: 'Analytics', icon: BarChart3, path: '/lecturer/analytics' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  programme_leader: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/programme' },
      { label: 'Modules', icon: BookOpen, path: '/programme/modules' },
      { label: 'Lecturers', icon: Users, path: '/programme/lecturers' },
      { label: 'Students', icon: GraduationCap, path: '/programme/students' },
      { label: 'Assessments', icon: ClipboardList, path: '/programme/assessments' },
      { label: 'Schedule', icon: Calendar, path: '/programme/schedule' },
      { label: 'Moderation', icon: FileCheck, path: '/programme/moderation' },
      { label: 'Analytics', icon: BarChart3, path: '/programme/analytics' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  iqa_officer: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/qa' },
      { label: 'Moderation', icon: FileCheck, path: '/qa/moderation' },
      { label: 'Sampling', icon: ClipboardList, path: '/qa/sampling' },
      { label: 'Plagiarism', icon: AlertTriangle, path: '/qa/plagiarism' },
      { label: 'Malpractice', icon: Shield, path: '/qa/malpractice' },
      { label: 'Appeals', icon: MessageSquare, path: '/qa/appeals' },
      { label: 'Audit Trail', icon: FileText, path: '/qa/audit' },
      { label: 'EV Packs', icon: FolderOpen, path: '/qa/evidence' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  exams_officer: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/exams' },
      { label: 'Schedule', icon: Calendar, path: '/exams/schedule' },
      { label: 'Rooms', icon: Monitor, path: '/exams/rooms' },
      { label: 'Seating', icon: Users, path: '/exams/seating' },
      { label: 'Entry Log', icon: UserCheck, path: '/exams/entry' },
      { label: 'Incidents', icon: AlertTriangle, path: '/exams/incidents' },
      { label: 'Results', icon: BarChart3, path: '/exams/results' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  finance_officer: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/finance' },
      { label: 'Invoices', icon: FileText, path: '/finance/invoices' },
      { label: 'Payments', icon: CreditCard, path: '/finance/payments' },
      { label: 'Instalments', icon: Clock, path: '/finance/instalments' },
      { label: 'Commissions', icon: Handshake, path: '/finance/commissions' },
      { label: 'Scholarships', icon: Award, path: '/finance/scholarships' },
      { label: 'Reports', icon: BarChart3, path: '/finance/reports' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  marketing_officer: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/marketing' },
      { label: 'Campaigns', icon: Megaphone, path: '/marketing/campaigns' },
      { label: 'Leads', icon: UserPlus, path: '/marketing/leads' },
      { label: 'Webinars', icon: Video, path: '/marketing/webinars' },
      { label: 'Analytics', icon: BarChart3, path: '/marketing/analytics' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  agent: [
    { items: [
      { label: 'Pipeline', icon: LayoutDashboard, path: '/agent' },
      { label: 'Leads', icon: UserPlus, path: '/agent/leads' },
      { label: 'Applications', icon: FolderOpen, path: '/agent/applications' },
      { label: 'Commissions', icon: CreditCard, path: '/agent/commissions' },
      { label: 'Onboarding', icon: Briefcase, path: '/agent/onboarding' },
      { label: 'Resources', icon: Library, path: '/agent/resources' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  student: [
    { title: 'Learning', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/student' },
      { label: 'Courses', icon: BookOpen, path: '/student/courses' },
      { label: 'Classroom', icon: Video, path: '/student/classroom' },
      { label: 'Assignments', icon: ClipboardList, path: '/student/assignments' },
      { label: 'Grades', icon: BarChart3, path: '/student/grades' },
      { label: 'Attendance', icon: Calendar, path: '/student/attendance' },
      { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
      { label: 'Timeline', icon: Clock, path: '/student/timeline' },
      { label: 'Library', icon: Library, path: '/student/library' },
      { label: 'Code Lab', icon: Monitor, path: '/coding' },
    ]},
    { title: 'Services', items: [
      { label: 'Finance', icon: CreditCard, path: '/student/finance' },
      { label: 'Progression', icon: GraduationCap, path: '/student/progression' },
      { label: 'Career', icon: Briefcase, path: '/student/career' },
      { label: 'Health', icon: Heart, path: '/health' },
      { label: 'Transport', icon: Bus, path: '/transport' },
      { label: 'Residential', icon: Building2, path: '/residential' },
      { label: 'Onboarding', icon: UserCheck, path: '/onboarding' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  university_partner: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/partner' },
      { label: 'Referrals', icon: Users, path: '/partner/referrals' },
      { label: 'Applications', icon: FolderOpen, path: '/partner/applications' },
      { label: 'Offers', icon: Award, path: '/partner/offers' },
      { label: 'Commissions', icon: CreditCard, path: '/partner/commissions' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  employer_partner: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/employer' },
      { label: 'Job Posts', icon: Briefcase, path: '/employer/jobs' },
      { label: 'Candidates', icon: Users, path: '/employer/candidates' },
      { label: 'Internships', icon: GraduationCap, path: '/employer/internships' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/messaging' },
    ]},
  ],
  parent_guardian: [
    { items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/parent' },
      { label: 'Progress', icon: BarChart3, path: '/parent/progress' },
      { label: 'Activity Log', icon: Activity, path: '/my-activity' },
      { label: 'Messages', icon: MessageSquare, path: '/parent/messages' },
    ]},
  ],
};

export { NAV_CONFIG };

export default function DashboardSidebar() {
  const { user, setRole, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const sections = NAV_CONFIG[user.role] || [];
  const isLandlord = user.role === 'superadmin';

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isLandlord ? 'gradient-gold' : 'gradient-primary'
        }`}>
          {isLandlord ? (
            <Cloud className="w-4 h-4 text-white" />
          ) : (
            <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
          )}
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-extrabold tracking-tight truncate">{isLandlord ? 'EduCloud' : 'EduPathway'}</p>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-[0.1em] font-semibold">
              {isLandlord ? 'Platform Owner' : ROLE_LABELS[user.role]}
            </p>
          </div>
        )}
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-5' : ''}>
            {section.title && !collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/30 px-3 mb-1.5">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === sections[0]?.items[0]?.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-default ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Role Switcher (Demo) */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1.5 px-1">
            Demo: Switch Role
          </p>
          <select
            value={user.role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full bg-sidebar-accent text-sidebar-foreground text-xs rounded-md px-2 py-1.5 outline-none"
          >
            <optgroup label="Landlord (SaaS Owner)">
              <option value="superadmin">Platform Owner</option>
            </optgroup>
            <optgroup label="Tenant (College Staff)">
              <option value="centre_director">Centre Director</option>
              <option value="admissions_admin">Admissions Admin</option>
              <option value="lecturer">Lecturer</option>
              <option value="programme_leader">Programme Leader</option>
              <option value="iqa_officer">IQA / QA Officer</option>
              <option value="exams_officer">Exams Officer</option>
              <option value="finance_officer">Finance Officer</option>
              <option value="marketing_officer">Marketing Officer</option>
            </optgroup>
            <optgroup label="External">
              <option value="agent">Agent</option>
              <option value="student">Student</option>
              <option value="parent_guardian">Parent / Guardian</option>
              <option value="university_partner">University Partner</option>
              <option value="employer_partner">Employer Partner</option>
            </optgroup>
          </select>
        </div>
      )}

      {/* Footer */}
      <div className="px-2 py-2 border-t border-sidebar-border flex items-center gap-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-2 rounded-lg hover:bg-sidebar-accent transition-default text-sidebar-foreground/50"
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-background shadow-md border border-border"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/40 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-default
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
