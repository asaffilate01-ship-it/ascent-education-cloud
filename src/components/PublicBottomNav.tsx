import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Globe2, Home, LogIn, Send } from 'lucide-react';
import { isMobileTabActive } from '@/lib/mobileTabRoutes';

const items = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Study', to: '/study', icon: BookOpen },
  { label: 'Apply', to: '/apply', icon: Send, primary: true },
  { label: 'Abroad', to: '/pathways', icon: Globe2 },
  { label: 'Sign in', to: '/login', icon: LogIn },
];

/** Native-app style bottom tab bar for public pages on phones. */
export default function PublicBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map(({ label, to, icon: Icon, primary }) => {
          const active = isMobileTabActive(to, pathname);
          return (
            <li key={to} className="flex justify-center">
              {primary ? (
                <Link to={to} className="-mt-6 flex size-14 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background active:scale-95 transition-transform">
                  <Icon className="size-5" /><span className="text-[10px] font-bold">{label}</span>
                </Link>
              ) : (
                <Link to={to} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-semibold active:scale-95 transition-transform ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Icon className="size-5" />{label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
