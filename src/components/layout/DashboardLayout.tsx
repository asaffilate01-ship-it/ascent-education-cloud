import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { Search, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import CommandPalette from '@/components/CommandPalette';
import NotificationBell from '@/components/NotificationBell';
import { useState } from 'react';
import { motion } from 'framer-motion';

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
  settings: 'Settings',
};

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, i) => ({
    label: BREADCRUMB_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    path: '/' + pathSegments.slice(0, i + 1).join('/'),
    isLast: i === pathSegments.length - 1,
  }));

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="lg:pl-60 pl-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm h-14 flex items-center justify-between px-4 lg:px-6 shadow-surface-sm">
          <div className="ml-10 lg:ml-0">
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                {breadcrumbs.map((bc, i) => (
                  <span key={bc.path} className="flex items-center gap-1">
                    {i > 0 && <span>/</span>}
                    {bc.isLast ? (
                      <span className="font-medium text-foreground">{bc.label}</span>
                    ) : (
                      <Link to={bc.path} className="hover:text-foreground transition-default">{bc.label}</Link>
                    )}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-base lg:text-lg font-semibold text-foreground leading-tight">{title}</h1>
            {subtitle && <p className="text-[10px] lg:text-xs text-muted-foreground hidden sm:block">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 lg:gap-3">
            {actions}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-secondary/80 transition-default"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden md:inline text-[10px] bg-background px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-secondary transition-default"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-default relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content with page transition */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="p-4 lg:p-6"
        >
          {children}
        </motion.main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
