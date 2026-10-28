import {Link} from 'react-router-dom';
import {useRef,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {DashboardSkeleton} from '@/components/ui/Skeletons';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import type {Tables} from '@/integrations/supabase/types';
export default function StudentCourses(){
 const {user}=useAuth();return <Courses key={`${user?.id}:${user?.tenantId}:${user?.role}`}/>;
}
function Courses(){
 const {user}=useAuth();const ready=!!user?.id&&!!user?.tenantId;
 const [query,setQuery]=useState(''),[page,setPage]=useState(0);const search=useRef<HTMLInputElement>(null);
 const enrolments=useSupabaseQuery('student_enrolments',{filters:[{column:'student_id',operator:'eq',value:user?.id||''},{column:'tenant_id',operator:'eq',value:user?.tenantId||''},{column:'status',operator:'eq',value:'active'}],enabled:ready});
 const ids=[...new Set(enrolments.data.map(e=>e.programme_id))];
 const enabled=ready&&!enrolments.loading&&!enrolments.error&&ids.length>0;
 const programmes=useSupabaseQuery('programmes',{filters:[{column:'id',operator:'in',value:ids},{column:'tenant_id',operator:'eq',value:user?.tenantId||''}],orderBy:{column:'title',ascending:true},enabled});
 const modules=useSupabaseQuery('modules',{filters:[{column:'programme_id',operator:'in',value:ids},{column:'tenant_id',operator:'eq',value:user?.tenantId||''}],orderBy:{column:'title',ascending:true},enabled});
 if(enrolments.loading||programmes.loading||modules.loading)return <DashboardSkeleton/>;
 const error=enrolments.error||programmes.error||modules.error;
 const enrolled=new Set(ids);
 const courses=programmes.data.filter(p=>enrolled.has(p.id));
 const term=query.trim().toLowerCase();
 const matches=courses.map(programme=>{
  const all=modules.data.filter(m=>m.programme_id===programme.id);
  const courseMatch=[programme.title,programme.awarding_body,programme.level].join(' ').toLowerCase().includes(term);
  return {programme,total:all.length,modules:!term||courseMatch?all:all.filter(m=>[m.title,m.code].join(' ').toLowerCase().includes(term)),courseMatch};
 }).filter(row=>!term||row.courseMatch||row.modules.length>0);
 const pages=Math.max(1,Math.ceil(matches.length/5)),current=Math.min(page,pages-1);
 const clear=()=>{setQuery('');setPage(0);search.current?.focus();};
 return <DashboardLayout title="My courses" subtitle="Your classes, resources, assignments and results in one place">
  <div className="min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal">
  <p className="mb-5"><Link className="font-semibold underline" to="/student/labs">Open practical and coding labs</Link></p>
  {error?<div role="alert" className="space-y-3 rounded-lg border border-destructive p-4"><p>Your courses could not be verified. Retry or contact your centre.</p><Button variant="outline" onClick={()=>{void enrolments.refetch();void programmes.refetch();void modules.refetch();}}>Retry my courses</Button></div>:<>
   {!courses.length?<p>No active enrolments yet. Contact your centre to complete enrolment.</p>:<>
    <section aria-label="Find enrolled learning" className="mb-5 space-y-3 rounded-xl border bg-card p-4"><label className="block text-sm font-semibold" htmlFor="my-courses-search">Find my course or module</label><Input id="my-courses-search" ref={search} type="search" maxLength={120} value={query} aria-describedby="my-courses-count" placeholder="Course, awarding body, module title or code" onChange={e=>{setQuery(e.target.value);setPage(0);}}/><p id="my-courses-count" role="status" aria-atomic="true" className="text-sm text-muted-foreground">{matches.length} of {courses.length} enrolled programmes · {matches.reduce((sum,row)=>sum+row.modules.length,0)} matching modules</p>{query&&<Button variant="outline" onClick={clear}>Clear my course search</Button>}</section>
    {!matches.length&&<p className="mb-4 rounded-lg border p-4">No enrolled courses or modules match. Try another title or code, or clear the search.</p>}
    {matches.slice(current*5,current*5+5).map(row=><CourseModules key={`${row.programme.id}:${term}`} programme={row.programme} modules={row.modules} total={row.total}/>)}
    {matches.length>5&&<nav aria-label="My course pages" className="my-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous courses</Button><span>Page {current+1} of {pages}</span><Button variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next courses</Button></nav>}
   </>}
  </>}
  </div>
 </DashboardLayout>;
}
function CourseModules({programme:p,modules,total}:{programme:Tables<'programmes'>;modules:Tables<'modules'>[];total:number}){
 const [page,setPage]=useState(0);const pages=Math.max(1,Math.ceil(modules.length/6)),current=Math.min(page,pages-1);
 return <section className="mb-6 min-w-0 rounded-xl border bg-card p-5 [overflow-wrap:anywhere]" aria-label={`Enrolled programme ${p.title}`}><h2 className="text-xl font-bold">{p.title}</h2><p className="mt-1 text-sm text-muted-foreground">{p.awarding_body} · Level {p.level}</p>
  {total>0&&<p className="mt-3 text-sm text-muted-foreground">Showing {modules.length?current*6+1:0}–{Math.min((current+1)*6,modules.length)} of {modules.length} matching modules · {total} in this programme</p>}
  {modules.slice(current*6,current*6+6).map(m=><article key={m.id} className="mt-5"><h3 className="font-semibold"><Link className="underline" to={`/student/module?module=${encodeURIComponent(m.id)}`}>{m.title}</Link></h3><p className="text-sm text-muted-foreground">{m.code} · Module status: {m.status}</p><ModuleJourney moduleId={m.id}/></article>)}
  {!total&&<p className="mt-4 text-sm">Your centre has not added modules yet.</p>}
  {modules.length>6&&<nav aria-label={`Module pages for ${p.title}`} className="mt-4 flex flex-wrap items-center gap-3"><Button aria-label={`Previous modules for ${p.title}`} variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous modules</Button><span>Page {current+1} of {pages}</span><Button aria-label={`Next modules for ${p.title}`} variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next modules</Button></nav>}
 </section>;
}
