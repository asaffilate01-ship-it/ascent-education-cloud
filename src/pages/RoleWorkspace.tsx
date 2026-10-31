import {NAV_CONFIG} from '@/components/layout/DashboardSidebar';
import {workspacePath} from '@/lib/workspaceContext';
import StaffTaskBoard from '@/components/StaffTaskBoard';
import WorkspaceActions from '@/components/WorkspaceActions';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Link,useLocation} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth,ROLE_HOME,ROLE_LABELS} from '@/contexts/AuthContext';
import {Input} from '@/components/ui/input';
import {workspaceCatalog} from '@/lib/workspaceCatalog';
import {workspaceServiceMatches} from '@/lib/workspaceDirectory';
export default function RoleWorkspace(){
 const {user}=useAuth();
 return <Workspace key={`${user?.id}:${user?.tenantId}:${user?.role}`}/>;
}
function Workspace(){
 const {user}=useAuth();const location=useLocation();const [search,setSearch]=useState(''),[area,setArea]=useState('all');
 const searchInput=useRef<HTMLInputElement>(null);
 const clear=()=>{setSearch('');setArea('all');searchInput.current?.focus();};
 useEffect(()=>{
  const focusSearch=(event:KeyboardEvent)=>{
   if(event.key!=='/'||event.altKey||event.ctrlKey||event.metaKey||event.defaultPrevented)return;
   const target=event.target as HTMLElement|null;
   if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
   event.preventDefault();searchInput.current?.focus();
  };
  document.addEventListener('keydown',focusSearch);
  return()=>document.removeEventListener('keydown',focusSearch);
 },[]);
 const curated=user?workspaceCatalog[user.role]||[]:[];
 const known=new Set(curated.flatMap(g=>g.items.map(i=>i.to)));
 const extra=user?(NAV_CONFIG[user.role]||[]).map(g=>({title:g.title||'Other services',items:g.items.filter(i=>!known.has(i.path)).map(i=>({label:i.label,to:i.path,description:'Open your authorised workspace.'}))})).filter(g=>g.items.length):[];
 const groups=[...curated,...extra];
 const shown=groups.filter(g=>area==='all'||g.title===area).map(g=>({
  ...g,items:g.items.filter(i=>workspaceServiceMatches(i.label,i.description,g.title,search))
 })).filter(g=>g.items.length);
 const total=groups.reduce((n,g)=>n+g.items.length,0),count=shown.reduce((n,g)=>n+g.items.length,0);
 return <DashboardLayout title="My workspace" subtitle={user?ROLE_LABELS[user.role]:'Sign in'}>
 <div className="space-y-6">
  <StaffTaskBoard/><WorkspaceActions/>
  <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7" aria-labelledby="workspace-intro">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-2xl">
     <p className="text-xs font-semibold uppercase tracking-[0.12em] text-success">Your authorised tools</p>
     <h2 id="workspace-intro" className="mt-2 text-xl font-bold">Find your next task</h2>
     <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Browse the services assigned to your current role. Each service opens its own records and permissions, rather than exposing a shared list of learners or staff.</p>
    </div>
    {user&&<Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={ROLE_HOME[user.role]}>Back to my dashboard</Link>}
   </div>
   {!!groups.length&&<div aria-label="Find workspace services" className="mt-6 space-y-4 border-t pt-5">
    <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
     <label className="block text-sm font-semibold">Find a service
      <Input ref={searchInput} type="search" maxLength={120} className="mt-2 min-h-11" placeholder="Courses, recordings, fees, labs…" value={search} onChange={e=>setSearch(e.target.value)}/>
     </label>
     <label className="block text-sm font-semibold">Service area
      <select className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm" value={area} onChange={e=>setArea(e.target.value)}>
       <option value="all">All service areas</option>{[...new Set(groups.map(g=>g.title))].map(title=><option key={title} value={title}>{title}</option>)}
      </select>
     </label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
     <p role="status" aria-atomic="true" className="text-sm text-muted-foreground">{count} of {total} services shown for your role</p>
     {(search||area!=='all')&&count>0?<Button variant="outline" className="min-h-11" onClick={clear}>Clear service filters</Button>:
      <p className="hidden text-xs text-muted-foreground sm:block">Tip: press / to search</p>}
    </div>
   </div>}
  </section>
  {!groups.length&&<p>Use your dashboard and role menu to open your assigned specialist work.</p>}
  {!!groups.length&&!shown.length&&<section className="rounded-xl border bg-card p-6">
   <h2 className="text-lg font-bold">No services match this search</h2>
   <p className="mt-2 text-sm text-muted-foreground">Try different words or return to all the services available for your current role.</p>
   <Button className="mt-4 min-h-11" variant="outline" onClick={clear}>Clear service filters</Button>
  </section>}
  {shown.map((g,index)=><section key={g.title} aria-labelledby={`workspace-group-${index}`}>
   <div className="mb-3 flex items-baseline justify-between gap-3 border-b pb-3">
    <h2 id={`workspace-group-${index}`} className="text-lg font-bold">{g.title}</h2>
    <span className="text-xs tabular-nums text-muted-foreground">{g.items.length} services</span>
   </div>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {g.items.map(i=><Link key={i.to} to={workspacePath(i.to,location.search)}
      className="group flex min-h-28 min-w-0 flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
     <h3 className="break-words text-sm font-bold group-hover:text-primary">{i.label}</h3>
     <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{i.description}</p>
    </Link>)}
   </div>
  </section>)}
 </div>
 </DashboardLayout>;
}
