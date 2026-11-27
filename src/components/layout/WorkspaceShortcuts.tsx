import { Link, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '@/contexts/AuthContext';
import { workspacePath } from '@/lib/workspaceContext';
import { dashboardShortcutsFor } from '@/lib/dashboardNavigation';

export default function WorkspaceShortcuts(){
 const {user}=useAuth();
 const {pathname,search}=useLocation();
 const shortcuts=dashboardShortcutsFor(user,pathname,ROLE_HOME);
 if(!shortcuts.length)return null;
 return <section className="mb-6 rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4" aria-label="Dashboard next steps">
  <h2 className="text-sm font-bold">Quick access</h2>
  <nav aria-label="Dashboard quick actions" className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
   {shortcuts.map(([label,to])=><Link key={to} to={workspacePath(to,search)} className="inline-flex justify-between min-h-11 min-w-0 max-w-full items-center rounded-xl border bg-card px-4 py-2 text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <span className="min-w-0 break-words">{label}</span><span aria-hidden="true" className="ml-3 shrink-0">→</span>
   </Link>)}
  </nav>
 </section>;
}
