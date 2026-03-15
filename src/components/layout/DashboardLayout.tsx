import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm h-14 flex items-center justify-between px-6 shadow-surface-sm">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <button className="p-2 rounded-lg hover:bg-secondary transition-default relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
