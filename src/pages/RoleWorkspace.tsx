import {NAV_CONFIG} from '@/components/layout/DashboardSidebar';
import {workspacePath} from '@/lib/workspaceContext';
import StaffTaskBoard from '@/components/StaffTaskBoard';
import WorkspaceActions from '@/components/WorkspaceActions';
import {useState} from 'react';
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
 const {user}=useAuth();const location=useLocation();const [search,setSearch]=useState('');
 const curated=user?workspaceCatalog[user.role]||[]:[];
 const known=new Set(curated.flatMap(g=>g.items.map(i=>i.to)));
 const extra=user?(NAV_CONFIG[user.role]||[]).map(g=>({title:g.title||'Other services',items:g.items.filter(i=>!known.has(i.path)).map(i=>({label:i.label,to:i.path,description:'Open your authorised workspace.'}))})).filter(g=>g.items.length):[];
 const groups=[...curated,...extra];
 const shown=groups.map(g=>({...g,items:g.items.filter(i=>`${g.title} ${i.label} ${i.description}`.toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.items.length);
 return <DashboardLayout title="My workspace" subtitle={user?ROLE_LABELS[user.role]:'Sign in'}><div className="space-y-5">
 <StaffTaskBoard/><WorkspaceActions/><p>Find your next task. Each area shows the records and actions available to your account.</p>
 {user&&<Link className="inline-block underline" to={ROLE_HOME[user.role]}>Back to my dashboard</Link>}
 {!!groups.length&&<label className="block max-w-xl">Find a service<Input placeholder="Courses, recordings, fees, labs…" value={search} onChange={e=>setSearch(e.target.value)}/></label>}
 {!groups.length&&<p>Use your dashboard and role menu to open your assigned specialist work.</p>}
 {!!groups.length&&!shown.length&&<p>No services match this search. Try another word.</p>}
 {shown.map(g=><section key={g.title}><h2 className="mb-3 text-lg font-semibold">{g.title}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{g.items.map(i=><Link key={i.to} to={workspacePath(i.to,location.search)} className="rounded-xl border bg-card p-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><h3 className="font-semibold">{i.label}</h3><p className="mt-2 text-sm text-muted-foreground">{i.description}</p></Link>)}</div></section>)}
 </div></DashboardLayout>;
}
