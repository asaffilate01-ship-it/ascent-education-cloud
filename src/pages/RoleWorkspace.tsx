import {NAV_CONFIG} from '@/components/layout/DashboardSidebar';
import {workspacePath} from '@/lib/workspaceContext';
import StaffTaskBoard from '@/components/StaffTaskBoard';
import WorkspaceActions from '@/components/WorkspaceActions';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Link,useLocation} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth,ROLE_HOME,ROLE_LABELS} from '@/contexts/AuthContext';
import {Input} from '@/components/ui/input';
import {workspaceCatalog} from '@/lib/workspaceCatalog';
export default function RoleWorkspace(){
 const {user}=useAuth();
 return <Workspace key={`${user?.id}:${user?.tenantId}:${user?.role}`}/>;
}
function Workspace(){
 const {user}=useAuth();const location=useLocation();const [search,setSearch]=useState(''),[area,setArea]=useState('all');
 const searchInput=useRef<HTMLInputElement>(null);
 const clear=()=>{setSearch('');setArea('all');searchInput.current?.focus();};
 const curated=user?workspaceCatalog[user.role]||[]:[];
 const known=new Set(curated.flatMap(g=>g.items.map(i=>i.to)));
 const extra=user?(NAV_CONFIG[user.role]||[]).map(g=>({title:g.title||'Other services',items:g.items.filter(i=>!known.has(i.path)).map(i=>({label:i.label,to:i.path,description:'Open your authorised workspace.'}))})).filter(g=>g.items.length):[];
 const groups=[...curated,...extra];
 const shown=groups.filter(g=>area==='all'||g.title===area).map(g=>({...g,items:g.items.filter(i=>`${g.title} ${i.label} ${i.description}`.toLowerCase().includes(search.trim().toLowerCase()))})).filter(g=>g.items.length);
 const total=groups.reduce((n,g)=>n+g.items.length,0),count=shown.reduce((n,g)=>n+g.items.length,0);
 return <DashboardLayout title="My workspace" subtitle={user?ROLE_LABELS[user.role]:'Sign in'}><div className="space-y-5">
 <StaffTaskBoard/><WorkspaceActions/><p>Find your next task. Each area shows the records and actions available to your account.</p>
 {user&&<Link className="inline-block underline" to={ROLE_HOME[user.role]}>Back to my dashboard</Link>}
 {!!groups.length&&<section aria-label="Find workspace services" className="rounded-xl border bg-card p-4 space-y-3">
 <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Find a service<Input ref={searchInput} type="search" maxLength={120} placeholder="Courses, recordings, fees, labs…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="block text-sm font-medium">Service area<select className="mt-1 min-h-11 w-full min-w-0 rounded-lg border bg-background px-3" value={area} onChange={e=>setArea(e.target.value)}><option value="all">All service areas</option>{[...new Set(groups.map(g=>g.title))].map(title=><option key={title}>{title}</option>)}</select></label></div>
 <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-atomic="true" className="text-sm text-muted-foreground">{count} of {total} services shown for your role</p>{(search||area!=='all')&&count>0&&<Button variant="outline" onClick={clear}>Clear service filters</Button>}</div>
 </section>}
 {!groups.length&&<p>Use your dashboard and role menu to open your assigned specialist work.</p>}
 {!!groups.length&&!shown.length&&<section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">No services match this search</h2><p className="mt-2 text-sm text-muted-foreground">Try another word or clear the filters to see every service available to your role.</p><Button className="mt-3" variant="outline" onClick={clear}>Clear service filters</Button></section>}
 {shown.map(g=><section key={g.title}><h2 className="mb-3 text-lg font-semibold">{g.title}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{g.items.map(i=><Link key={i.to} to={workspacePath(i.to,location.search)} className="rounded-xl border bg-card p-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><h3 className="font-semibold">{i.label}</h3><p className="mt-2 text-sm text-muted-foreground">{i.description}</p></Link>)}</div></section>)}
 </div></DashboardLayout>;
}
