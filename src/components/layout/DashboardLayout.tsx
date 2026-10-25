import WorkspaceShortcuts from './WorkspaceShortcuts';
import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { Search, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import AdvancedSearch from '@/components/AdvancedSearch';
import NotificationBell from '@/components/NotificationBell';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const BREADCRUMB_LABELS: Record<string, string> = {
  landlord: 'Platform', director: 'Director', admissions: 'Admissions',
  lecturer: 'Lecturer', programme: 'Programme', qa: 'Quality', exams: 'Exams',
  finance: 'Finance', marketing: 'Marketing', agent: 'Agent', student: 'Student',
  partner: 'Partner', employer: 'Employer', notifications: 'Notifications',
  settings: 'Settings', onboarding: 'Onboarding', residential: 'Residential',
  audit: 'Audit Log', compliance: 'Compliance', messaging: 'Messages',
  schedule: 'Schedule', timeline: 'Timeline',
};

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [cmdOpen, setCmdOpen] = useState(false);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, i) => ({
    label: BREADCRUMB_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    path: '/' + pathSegments.slice(0, i + 1).join('/'),
    isLast: i === pathSegments.length - 1,
  }));

  const workspaceLinks = user?.role === 'student' && ['/student/library','/student/materials','/student/lesson-archive','/student/classroom'].includes(location.pathname)
    ? [['Library','/student/library'],['Materials','/student/materials'],['Recordings','/student/lesson-archive'],['Classes','/student/classroom']]
    : user?.role === 'lecturer' && ['/lecturer/classroom','/lecturer/class-scheduler','/lecturer/materials','/lecturer/lesson-archive','/lecturer/whiteboards','/lecturer/attendance'].includes(location.pathname)
    ? [['Classes','/lecturer/classroom'],['Schedule','/lecturer/class-scheduler'],['Attendance','/lecturer/attendance'],['Materials','/lecturer/materials'],['Recordings','/lecturer/lesson-archive'],['Whiteboards','/lecturer/whiteboards']] : [];
  return (
    <div className="min-h-dvh bg-background">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3">Skip to dashboard content</a>
      <DashboardSidebar />
      <div className="lg:pl-60 pl-0">
        {/* Premium Top Bar */}
        <header className="sticky top-0 z-40 min-h-14 flex flex-wrap items-center justify-between gap-y-2 py-2 px-4 lg:px-6 border-b border-border/40 bg-card/90 backdrop-blur-xl shadow-sm">
          <div className="ml-12 min-w-0 flex-1 lg:ml-0">
            {breadcrumbs.length > 1 && (
              <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                {breadcrumbs.map((bc, i) => (
                  <span key={bc.path} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-border">/</span>}
                    {bc.isLast ? (
                      <span className="font-semibold text-foreground">{bc.label}</span>
                    ) : (
                      <Link to={bc.path} className="hover:text-foreground transition-default">{bc.label}</Link>
                    )}
                  </span>
                ))}
              </div>
            )}
            <h1 className="break-words text-sm sm:text-base lg:text-lg font-bold text-foreground leading-tight tracking-tight">{title}</h1>
            {subtitle && <p className="text-[10px] lg:text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1 lg:gap-2">
            <Link className="hidden md:inline-flex min-h-11 items-center rounded-lg border px-3 text-xs hover:bg-accent" to="/workspace">Workspace</Link>
            <button
              onClick={() => setCmdOpen(true)}
              aria-label="Search workspace"
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 py-1.5 rounded-lg border border-border/50 bg-background text-muted-foreground text-xs hover:bg-accent transition-default"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search…</span>
              <kbd className="hidden md:inline text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono border border-border/50">⌘K</kbd>
            </button>
            <button
              onClick={toggleTheme}
              className="hidden sm:block min-h-11 min-w-11 p-2 rounded-lg border border-border/50 bg-background hover:bg-accent transition-default"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <NotificationBell />
            <div className="hidden xl:flex w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold ring-2 ring-primary/20 shadow-md hover:ring-primary/40 transition-default cursor-pointer">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content with page transition */}
        <motion.main
          id="dashboard-content" tabIndex={-1}
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6"
        >
          <div className="page-shell min-w-0">{actions && <div className="mb-4 flex flex-wrap gap-2">{actions}</div>}<WorkspaceShortcuts />{!!workspaceLinks.length && <nav aria-label="Learning workspace" className="mb-5 flex flex-wrap gap-2">{workspaceLinks.map(([label,to])=><Link key={to} to={to} aria-current={location.pathname===to?'page':undefined} className={`rounded-lg border px-3 py-2 text-sm font-medium ${location.pathname===to?'bg-primary text-primary-foreground':'bg-card hover:bg-accent'}`}>{label}</Link>)}</nav>}
            {children}</div>
        </motion.main>
      </div>

      <AdvancedSearch open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}