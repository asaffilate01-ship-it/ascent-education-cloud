import MicrosoftAccountReadiness from '@/components/classroom/MicrosoftAccountReadiness';
import TeachingTimesheets from '@/components/lecturer/TeachingTimesheets';
import {Link} from 'react-router-dom';
import {useState} from 'react';
import {matchesLocalSearch} from '@/lib/localSearch';
import {BookOpen,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TodayTeachingPlan from '@/components/lecturer/TodayTeachingPlan';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';
import {DashboardSkeleton} from '@/components/ui/Skeletons';

export default function LecturerDashboard(){
 const {user}=useAuth();
 return <TeachingHome key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function TeachingHome(){
 const {user}=useAuth();
 const verified=!!user?.id&&!!user.tenantId&&user.role==='lecturer'&&user.roles?.includes('lecturer');
 const {data,loading,error,refetch}=useSupabaseQuery('modules',{enabled:verified,filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId},{column:'lecturer_id',operator:'eq',value:user?.id}],orderBy:{column:'title',ascending:true}});
 const modules=data.filter(module=>module.tenant_id===user?.tenantId&&module.lecturer_id===user?.id);
 const [search,setSearch]=useState('');
 const [activeOnly,setActiveOnly]=useState(false);
 const filtered=modules.filter(module=>(!activeOnly||module.status==='active')&&matchesLocalSearch([module.title,module.code,module.status].filter(Boolean).join(' '),search));
 const visible=filtered.slice(0,4);
 if(!verified)return <DashboardLayout title="Teaching"><p role="alert">An active lecturer role and verified centre assignment are required.</p></DashboardLayout>;
 if(loading)return <DashboardLayout title="Teaching"><DashboardSkeleton/></DashboardLayout>;
 if(error)return <DashboardLayout title="Teaching"><p role="alert">Your assigned teaching modules could not be verified.</p><Button variant="outline" onClick={()=>void refetch()}>Retry modules</Button></DashboardLayout>;
 return <DashboardLayout title="Teaching" subtitle={'Welcome back, '+(user?.name||'Lecturer')}>
  <section className="mb-5 rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="lecturer-next-steps">
   <h2 id="lecturer-next-steps" className="text-lg font-semibold">Prepare, deliver and follow up</h2>
   <p className="mt-2 text-sm text-muted-foreground">Classroom delivery, resources and attendance remain separate from independent summative marking and IQA approval.</p>
   <nav aria-label="Teaching quick actions" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    {[
      ['Schedule a class','/lecturer/class-scheduler'],
      ['Open classroom','/lecturer/classroom'],
      ['Share materials','/lecturer/materials'],
      ['Check delivery readiness','/lecturer/delivery-readiness'],
    ].map(([label,to])=><Link key={to} to={to} className="flex min-h-12 items-center justify-between gap-2 rounded-lg border bg-background px-3 py-3 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span>{label}</span><ArrowRight className="size-4 shrink-0" aria-hidden="true"/></Link>)}
   </nav>
  </section>
  <TodayTeachingPlan modules={modules}/>
  <MicrosoftAccountReadiness compact/>
  <TeachingTimesheets/>
  <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="lecturer-modules-title">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 id="lecturer-modules-title" className="text-lg font-semibold">My assigned modules</h2><p className="mt-1 text-sm text-muted-foreground">{modules.length} assigned · {modules.filter(module=>module.status==='active').length} active</p></div>
    <Button variant="outline" asChild><Link to="/lecturer/teaching">All teaching modules</Link></Button>
   </div>
   {modules.length>0&&<div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border bg-background/60 p-3">
    <label className="min-w-0 flex-[1_1_14rem] text-sm font-medium">Search assigned modules<input type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Module title or code" className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3 py-2"/></label>
    <Button type="button" variant={activeOnly?'default':'outline'} aria-pressed={activeOnly} onClick={()=>setActiveOnly(v=>!v)}>Active only</Button>
    {(search||activeOnly)&&<Button type="button" variant="ghost" onClick={()=>{setSearch('');setActiveOnly(false);}}>Clear filters</Button>}
   </div>}
   {(search||activeOnly)&&<p role="status" className="mt-3 text-sm text-muted-foreground">{filtered.length} matching assigned modules</p>}
   {!modules.length?<p className="mt-5 text-sm text-muted-foreground">No modules are assigned to you yet. Contact your programme leader.</p>
    :!filtered.length?<p className="mt-4 text-sm text-muted-foreground">No assigned modules match these filters.</p>:<div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">{visible.map(module=>{
      const moduleParams=new URLSearchParams({module:module.id}).toString();
      return <article key={module.id} className="min-w-0 rounded-xl border bg-background p-3 sm:p-4 [overflow-wrap:anywhere]">
       <p className="text-xs font-medium text-muted-foreground">{module.code||'Module'} · {module.status}</p>
       <h3 className="mt-2 break-words font-semibold"><Link className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary rounded-sm" to={'/lecturer/module?'+moduleParams}>{module.title}</Link></h3>
       <nav className="mt-3 flex flex-wrap gap-2" aria-label={'Actions for '+module.title}>
        <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm hover:bg-accent" to={'/lecturer/lessons?'+moduleParams}>Lessons</Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm hover:bg-accent" to={'/lecturer/assessments?'+moduleParams}>Briefs</Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm hover:bg-accent" to={'/lecturer/materials?'+moduleParams}>Materials</Link>
       </nav>
      </article>;
     })}</div>}
   {filtered.length>4&&<p className="mt-3 text-xs text-muted-foreground">Showing the first four matching modules. Open the teaching workspace for the full assigned list.</p>}
   {modules.length>4&&<Link className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4" to="/lecturer/teaching">View all {modules.length} assigned modules <ArrowRight className="size-4" aria-hidden="true"/></Link>}
  </section>
  <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" aria-hidden="true"/> Course and teaching information is limited to your authorised centre and assigned modules.</p>
 </DashboardLayout>;
}
