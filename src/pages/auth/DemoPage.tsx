import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ROLE_LABELS} from '@/contexts/AuthContext';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import {roleDescriptions} from '@/components/auth/WorkspaceRolePicker';
import {demoLoginUrl,DEMO_ACCOUNT_EMAIL,demoRolePreference} from '@/lib/demoAccess';
import {matchesLocalSearch} from '@/lib/localSearch';
import {workspaceRoleFamilies,rolesInWorkspaceFamily} from '@/lib/workspaceRoleCatalog';
import type {UserRole} from '@/types/platform';
import BrandLogo from '@/components/BrandLogo';
import {Button} from '@/components/ui/button';
import {ArrowRight,ShieldCheck} from 'lucide-react';

export default function DemoPage(){
 const [params,setParams]=useSearchParams();
 const role=demoRolePreference(params.get('role'))||'student';
 const [search,setSearch]=useState(''),[family,setFamily]=useState('all');
 const setRole=(value:UserRole)=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('role',value);return next;},{replace:true});
 const roles=rolesInWorkspaceFamily(KNOWN_UNIPATHWAY_ROLES,family).filter(r=>matchesLocalSearch(ROLE_LABELS[r]+' '+roleDescriptions[r],search));
 const href=demoLoginUrl(import.meta.env.VITE_UNIPATHWAY_DEMO_ORIGIN,role);
 return <main className="min-h-dvh bg-secondary/40 px-4 py-8 sm:px-8 lg:py-12"><div className="mx-auto max-w-6xl space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><Link to="/" className="inline-flex rounded-xl bg-white p-3 shadow-sm"><BrandLogo className="h-10 max-w-full"/></Link><Button asChild variant="outline"><Link to="/login">Institutional sign-in</Link></Button></header>
  <section className="rounded-2xl border bg-card p-5 sm:p-8"><p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-5" aria-hidden="true"/> Separate demonstration workspace</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Experience UniPathway by role</h1><p className="mt-3 max-w-2xl text-muted-foreground">Choose from all 21 role-specific workspaces. A connected demo uses fictional accounts and sample records, not live student, payroll or staff information.</p>
   {href&&<p className="mt-4 rounded-lg border p-3 text-sm">Demo sign-in: <strong>{DEMO_ACCOUNT_EMAIL}</strong>. Use the password provided by the authorised demo administrator.</p>}
   {!href&&<p role="status" className="mt-4 rounded-lg border p-3 text-sm">Role selection is available. The isolated demo sign-in is not activated yet. No production permissions are granted here.</p>}
   <label className="mt-5 block max-w-xl text-sm font-medium">Find a demo role<input type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2" placeholder="e.g. Lecturer, Student, Finance"/></label>
   <label className="mt-3 block max-w-xl text-sm font-medium">Workspace area<select value={family} onChange={e=>setFamily(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2"><option value="all">All workspaces</option>{workspaceRoleFamilies.map(group=><option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
   <p role="status" aria-label="Demo role results" className="mt-3 text-sm text-muted-foreground">{roles.length} of {KNOWN_UNIPATHWAY_ROLES.length} available role descriptions</p>
   <fieldset className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><legend className="sr-only">Choose a demo role</legend>{roles.map(r=><label key={r} className={'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-ring '+(role===r?'border-primary bg-primary/5':'bg-background hover:bg-accent/40')}><input type="radio" name="demo-role" checked={role===r} value={r} onChange={()=>setRole(r)} className="mt-1 size-4 shrink-0 accent-primary"/><span className="min-w-0"><span className="block font-semibold">{ROLE_LABELS[r]}</span><span className="mt-1 block text-sm text-muted-foreground">{roleDescriptions[r]}</span></span></label>)}</fieldset>
   {!roles.length&&<p className="mt-3 text-sm">No roles match. Clear the filters to see all 21.</p>}
   <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur sm:bottom-4"><p className="text-sm font-medium">Selected: {ROLE_LABELS[role]}</p>{href?<Button asChild className="min-h-11"><a href={href}>Continue to demo<ArrowRight className="ml-2 size-4" aria-hidden="true"/></a></Button>:<Button disabled>Continue to demo</Button>}{(search||family!=='all')&&<Button variant="outline" onClick={()=>{setSearch('');setFamily('all');}}>Clear filters</Button>}</div>
   <p className="mt-3 text-xs text-muted-foreground">Selecting a role is a preference, not an authorisation. Sign-in verifies actual assigned access in the demo environment. External provider actions require separate test configuration.</p>
  </section>
 </div></main>;
}
