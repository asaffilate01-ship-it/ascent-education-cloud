import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpen,ClipboardCheck,FileText,Layers,Search,ShieldCheck,Upload} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
 COURSE_BOARDS,catalogueBoardFor,courseContentMatches,eligibleCourseModules,
 moduleMaterialCoverage,type ProgrammeRow,type ModuleRow,type MaterialRow
} from '@/lib/learning/courseContentCatalog';

const allowedRoles=new Set(['lecturer','programme_leader','centre_director','superadmin']);
const managerRoles=new Set(['programme_leader','centre_director','superadmin']);

export default function CourseContentHub(){
 const {user}=useAuth();
 return <ContentWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function ContentWorkspace(){
 const {user}=useAuth();
 const permitted=Boolean(user?.id&&user?.tenantId&&allowedRoles.has(user.role)&&user.roles?.includes(user.role));
 const manager=Boolean(user&&managerRoles.has(user.role));
 const tenant=user?.tenantId||'';
 const [programmes,setProgrammes]=useState<ProgrammeRow[]>([]);
 const [modules,setModules]=useState<ModuleRow[]>([]);
 const [materials,setMaterials]=useState<MaterialRow[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [refresh,setRefresh]=useState(0),[board,setBoard]=useState('all'),[query,setQuery]=useState('');
 const reload=()=>{setError('');setProgrammes([]);setModules([]);setMaterials([]);setLoading(true);setRefresh(n=>n+1);};
 const load=useCallback(async(current:()=>boolean)=>{
  if(!permitted||!user){setLoading(false);return;}
  setLoading(true);setError('');setProgrammes([]);setModules([]);setMaterials([]);
  try{
   const [courseRows,moduleRows]=await Promise.all([
    pagedRows<ProgrammeRow>(()=>db.from('programmes')
     .select('id,tenant_id,title,level,awarding_body,status,course_number').eq('tenant_id',tenant),current),
    pagedRows<ModuleRow>(()=>{let q=db.from('modules')
     .select('id,tenant_id,programme_id,title,lecturer_id').eq('tenant_id',tenant);
     if(user.role==='lecturer')q=q.eq('lecturer_id',user.id);return q;},current)
   ]);
   const permittedModules=eligibleCourseModules(courseRows,moduleRows,tenant,user.id,user.role);
   const permittedProgrammeIds=new Set(permittedModules.map(m=>m.programme_id));
   const visibleProgrammes=courseRows.filter(p=>p.tenant_id===tenant&&(user.role!=='lecturer'||permittedProgrammeIds.has(p.id)));
   const ids=permittedModules.map(m=>m.id);
   const materialRows=await rowsByIds<MaterialRow>(ids,chunk=>()=>db
    .from('unipathway_module_materials').select('id,tenant_id,module_id,publication_status')
    .eq('tenant_id',tenant).in('module_id',chunk),current);
   if(!current())return;
   setProgrammes(visibleProgrammes);setModules(permittedModules);setMaterials(materialRows);
  }catch{
   if(current()){setProgrammes([]);setModules([]);setMaterials([]);
    setError('The centre content inventory could not be verified. No counts or files are shown until the records load successfully.');}
  }finally{if(current())setLoading(false);}
 },[permitted,tenant,user?.id,user?.role,user?.roles?.join(',')]);
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[load,refresh]);
 const activeBoard=COURSE_BOARDS.find(b=>b.id===board);
 const summary=useMemo(()=>{
  return COURSE_BOARDS.map(authority=>{
   const courses=programmes.filter(p=>catalogueBoardFor(p)?.id===authority.id);
   const ids=new Set(courses.map(p=>p.id));
   const units=modules.filter(m=>ids.has(m.programme_id));
   return {authority,courses,units,coverage:moduleMaterialCoverage(units,materials,tenant)};
  });
 },[programmes,modules,materials,tenant]);
 const visible=summary.filter(x=>(board==='all'||x.authority.id===board)&&
   courseContentMatches([x.authority.label,x.authority.family,x.authority.examples,
    ...x.courses.map(p=>p.title)].join(' '),query));
 const coverage=moduleMaterialCoverage(modules,materials,tenant);
 const unmatched=programmes.filter(p=>!catalogueBoardFor(p));
 const programmePath=user?.role==='programme_leader'?'/programme/modules':'/director/programmes';
 const syllabusPath=user?.role==='programme_leader'?'/programme/syllabuses':'/director/syllabuses';
 return <DashboardLayout title="Course content library" subtitle="Organise qualified teaching resources by board, programme and module">
  <div className="space-y-6">
   {!permitted?<section role="alert" className="rounded-xl border p-5">A verified centre assignment and an active teaching or curriculum-management role are required.</section>:<>
    <section className="rounded-2xl border bg-card p-5 sm:p-7" aria-labelledby="content-library-intro">
     <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
       <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Curriculum &amp; materials</p>
       <h2 id="content-library-intro" className="mt-2 text-xl font-bold">One content workflow across all awarding bodies</h2>
       <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Choose the body and qualification, verify its current specification and subject, select an authorised module, upload a private draft, and publish only material that you have permission to distribute. Board listings are planning categories, not claims of centre approval.</p>
      </div>
      <Button variant="outline" disabled={loading} onClick={reload}>Refresh inventory</Button>
     </div>
     <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Verified content totals">
      {[['Configured programmes',programmes.length],['Accessible modules',coverage.modules],['Private drafts',coverage.drafts],['Published materials',coverage.published]].map(([label,n])=>
       <div className="rounded-xl border bg-background p-3" key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{loading||error?'—':n}</p></div>)}
     </div>
    </section>
    <section className="rounded-xl border bg-card p-5" aria-labelledby="content-workflow">
     <h2 id="content-workflow" className="flex items-center gap-2 font-semibold"><ClipboardCheck className="size-4"/>Before uploading any board material</h2>
     <p className="mt-2 text-sm text-muted-foreground">Record the exact qualification and syllabus/unit code, edition or examination series, source/rights, intended audience and release decision. Upload centre-authored or properly licensed copies only. Link to an official publisher portal when redistribution is not authorised; do not copy its protected question bank into the LMS.</p>
     <p className="mt-2 text-xs text-muted-foreground">The existing database supports modules and private draft/published files. Board-version and licence metadata will require a separate audited schema activation before they can be treated as permanent compliance records.</p>
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-3" aria-label="Filter learning bodies">
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Awarding body or examination board
       <select value={board} onChange={e=>setBoard(e.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3">
        <option value="all">All awarding bodies and boards</option>{COURSE_BOARDS.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}
       </select>
      </label>
      <label className="text-sm font-medium">Find programmes or subjects
       <div className="relative mt-2"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground"/><Input className="min-h-11 pl-9" value={query} onChange={e=>setQuery(e.target.value)} maxLength={120} placeholder="Qualifi, Cambridge, accounting, SSC…"/></div>
      </label>
     </div>
     <p role="status" className="text-xs text-muted-foreground">{visible.length} of {COURSE_BOARDS.length} curriculum groups shown</p>
    </section>
    {loading&&<p role="status">Checking the authorised content inventory…</p>}
    {error&&<section role="alert" className="rounded-xl border border-destructive p-5">{error}<Button variant="outline" className="ml-3" onClick={reload}>Retry</Button></section>}
    {!loading&&!error&&visible.length===0&&<section className="rounded-xl border p-5">
      <h3 className="font-semibold">No board matches these filters</h3><p className="mt-2 text-sm text-muted-foreground">Clear the search or select another awarding body.</p><Button variant="outline" className="mt-3" onClick={()=>{setBoard('all');setQuery('');}}>Clear filters</Button>
    </section>}
    {!loading&&!error&&<div className="grid gap-4 xl:grid-cols-2">
     {visible.map(({authority,courses,units,coverage:totals})=><section key={authority.id} className="min-w-0 rounded-xl border bg-card p-5" aria-labelledby={'course-body-'+authority.id}>
       <div className="flex items-start gap-3"><div className="rounded-lg bg-secondary p-2"><BookOpen className="size-5"/></div>
        <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{authority.family}</p>
         <h3 id={'course-body-'+authority.id} className="text-base font-bold">{authority.label}</h3>
         <p className="mt-1 text-sm text-muted-foreground">{authority.examples}</p></div></div>
       <p className="mt-3 text-sm">{authority.planningNote}</p>
       <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span>{courses.length} mapped programmes</span><span>{totals.modules} modules</span>
        <span>{totals.drafts} drafts</span><span>{totals.published} published</span>
       </div>
       {courses.length===0?<p className="mt-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Not configured as a programme in this centre. This board cannot be assigned an official enrolment or material library until its programme and specification are configured and verified.
       </p>:<div className="mt-4 space-y-3">
        {courses.map(p=><div key={p.id} className="rounded-lg border p-3">
         <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-sm font-semibold">{p.title}</p><p className="text-xs text-muted-foreground">{p.level} · {p.status} · {p.course_number||'No qualification number recorded'}</p></div>
         </div>
         <div className="mt-3 space-y-2">
          {units.filter(m=>m.programme_id===p.id).map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background p-3">
           <div className="min-w-0"><p className="break-words text-sm font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{materials.filter(x=>x.module_id===m.id&&x.publication_status==='published').length} published resources</p></div>
           <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={'/lecturer/materials?module='+encodeURIComponent(m.id)}><Upload className="mr-2 size-3.5"/>Materials</Link>
            <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={'/lecturer/lessons?module='+encodeURIComponent(m.id)}><Layers className="mr-2 size-3.5"/>Lessons</Link>
           </div>
          </div>)}
          {units.every(m=>m.programme_id!==p.id)&&<p className="text-sm text-muted-foreground">No modules are assigned to this role for this programme.</p>}
         </div>
        </div>)}
       </div>}
      </section>)}
    </div>}
    {!loading&&!error&&unmatched.length>0&&<section className="rounded-xl border p-5">
     <h2 className="font-semibold">Other recorded awarding-body codes</h2>
     <p className="mt-2 text-sm text-muted-foreground">{unmatched.length} authorised programme records use a code outside this content grouping. Review each code before publishing. No board identity has been inferred.</p>
    </section>}
    <section className="flex flex-wrap gap-3 rounded-xl border bg-card p-5">
     {manager&&<Link to={programmePath} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent"><FileText className="mr-2 size-4"/>Manage programme records</Link>}
     {manager&&<p className="w-full text-sm text-muted-foreground">A separate syllabus planner exists at <code>{syllabusPath}</code>, but its database tables are not yet activated in this UniPathway backend. Do not mark a board specification as approved there until deployment is verified.</p>}
     {!manager&&<p className="text-sm text-muted-foreground">Need a new programme or board? Ask the centre director or programme leader to verify the qualification and configure its modules.</p>}
     <p className="w-full text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline size-3.5"/>Students can only view their own released learning resources through enrolled modules, independently enforced by database permissions.</p>
    </section>
   </>}
  </div>
 </DashboardLayout>;
}
