import { Link, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '@/contexts/AuthContext';
import { dashboardShortcutsFor } from '@/lib/dashboardNavigation';

export default function WorkspaceShortcuts(){
 const {user}=useAuth();
 const {pathname}=useLocation();
 const shortcuts=dashboardShortcutsFor(user,pathname,ROLE_HOME);
 if(!shortcuts.length)return null;
 return <section className="mb-7 border-b border-border pb-6" aria-label="Dashboard next steps">
  <h2 className="text-sm font-bold">Quick access</h2>
  <nav aria-label="Dashboard quick actions" className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2 sm:flex sm:flex-wrap">
   {shortcuts.map(([label,to])=><Link key={to} to={to} className="inline-flex min-h-11 min-w-0 max-w-full items-center rounded-xl border bg-card px-4 py-2 text-sm font-semibold hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <span className="min-w-0 break-words">{label}</span><span aria-hidden="true" className="ml-3 shrink-0">→</span>
   </Link>)}
  </nav>
 </section>;
}
