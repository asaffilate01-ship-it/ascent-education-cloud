import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpenCheck,ClipboardCheck,FileCheck2,ShieldCheck,ExternalLink} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {COURSE_BOARDS} from '@/lib/learning/courseContentCatalog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';

type Spec={
 id:string;tenant_id:string;board_key:string;qualification_title:string;qualification_code:string;
 subject:string;syllabus_code:string;specification_version:string;exam_session:string;
 specification_source_url:string;module_id:string|null;review_status:string;
 authorisation_status:string;created_by:string;reviewed_by:string|null;created_at:string;
};
type Rights={
 id:string;material_id:string;module_id:string;specification_id:string;
 rights_basis:string;rights_holder:string;evidence_reference:string;
 expires_at:string|null;review_status:string;created_by:string;
};
type TeachingModule={id:string;title:string;tenant_id:string;lecturer_id:string|null};
const managers=new Set(['superadmin','centre_director','programme_leader']);
const enabled=import.meta.env.VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED==='true';

const init=()=>({
 board:'othm',qualificationTitle:'',qualificationCode:'',subject:'',syllabusCode:'',
 version:'',session:'',sourceUrl:'',moduleId:'',
});

export default function CourseSpecifications(){
 const {user}=useAuth();
 return <Registry key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function Registry(){
 const {user}=useAuth();
 const allowed=Boolean(user?.id&&user.tenantId&&managers.has(user.role)&&user.roles?.includes(user.role));
 const tenant=user?.tenantId||'';
 const [form,setForm]=useState(init);
 const [specs,setSpecs]=useState<Spec[]>([]),[rights,setRights]=useState<Rights[]>([]);
 const [modules,setModules]=useState<TeachingModule[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0),[filter,setFilter]=useState('all');
 const load=useCallback(async(current:()=>boolean)=>{
  if(!allowed||!enabled){setLoading(false);return;}
  setLoading(true);setError('');setSpecs([]);setRights([]);setModules([]);
  try{
   const [s,r,m]=await Promise.all([
    pagedRows<Spec>(()=>db.from('unipathway_course_specifications').select(
     'id,tenant_id,board_key,qualification_title,qualification_code,subject,syllabus_code,specification_version,exam_session,specification_source_url,module_id,review_status,authorisation_status,created_by,reviewed_by,created_at'
    ).eq('tenant_id',tenant),current),
    pagedRows<Rights>(()=>db.from('unipathway_material_rights').select(
     'id,material_id,module_id,specification_id,rights_basis,rights_holder,evidence_reference,expires_at,review_status,created_by'
    ).eq('tenant_id',tenant),current),
    pagedRows<TeachingModule>(()=>db.from('modules').select(
     'id,title,tenant_id,lecturer_id').eq('tenant_id',tenant),current)
   ]);
   if(!current())return;
   setSpecs(s);setRights(r);setModules(m);
  }catch{
   if(current()){setSpecs([]);setRights([]);setModules([]);
    setError('The centre registry is unavailable or not yet activated. No partial records are displayed.');}
  }finally{if(current())setLoading(false);}
 },[allowed,tenant]);
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[load,revision]);
 const refresh=()=>setRevision(v=>v+1);
 const create=async(event:React.FormEvent)=>{
  event.preventDefault();if(!allowed||!enabled||busy)return;
  const body={
   tenant_id:tenant,board_key:form.board,qualification_title:form.qualificationTitle.trim(),
   qualification_code:form.qualificationCode.trim(),subject:form.subject.trim(),
   syllabus_code:form.syllabusCode.trim(),specification_version:form.version.trim(),
   exam_session:form.session.trim(),specification_source_url:form.sourceUrl.trim(),
   module_id:form.moduleId||null,created_by:user!.id,review_status:'draft',
   authorisation_status:'unverified'
  };
  if(!/^https:\/\//i.test(body.specification_source_url)||Object.values(body).some(v=>typeof v==='string'&&v.length>1000)){
   toast.error('Provide an official HTTPS specification source and valid field lengths.');return;
  }
  setBusy(true);
  try{
   const result=await db.from('unipathway_course_specifications').insert(body).select('id').single();
   if(result.error||!result.data?.id)throw Error('Registry draft was not confirmed.');
   setForm(init());toast.success('Specification draft saved. A different academic manager must review it.');refresh();
  }catch{toast.error('Specification draft could not be saved. Check the centre and current permissions.');}
  finally{setBusy(false);}
 };
 const review=async(spec:Spec,decision:'reviewed'|'withdrawn')=>{
  if(!allowed||!enabled||busy||spec.created_by===user?.id&&decision==='reviewed')return;
  setBusy(true);
  try{
   const r=await db.rpc('review_unipathway_course_specification',{p_spec:spec.id,p_decision:decision});
   if(r.error)throw r.error;
   toast.success(decision==='reviewed'?'Source reviewed. This is not awarding-body approval.':'Source withdrawn.');refresh();
  }catch{toast.error('Review could not be verified. Check reviewer separation and centre permissions.');}
  finally{setBusy(false);}
 };
 const rightsReview=async(right:Rights,decision:'approved'|'withdrawn')=>{
  if(!allowed||!enabled||busy||right.created_by===user?.id&&decision==='approved')return;
  setBusy(true);
  try{
   const r=await db.rpc('review_unipathway_material_rights',{p_right:right.id,p_decision:decision});
   if(r.error)throw r.error;
   toast.success(decision==='approved'?'Redistribution evidence approved for this private module.':'Rights withdrawn; student access is subject to the enforced backend guard.');refresh();
  }catch{toast.error('Rights decision was denied or could not be verified.');}
  finally{setBusy(false);}
 };
 const filtered=useMemo(()=>specs.filter(s=>filter==='all'||s.board_key===filter),[specs,filter]);
 const sourceBoard=(key:string)=>COURSE_BOARDS.find(b=>b.id===key)?.label||key;
 const back=user?.role==='programme_leader'?'/programme/course-content':user?.role==='superadmin'?'/landlord/course-content':'/director/course-content';
 return <DashboardLayout title="Qualification specifications & source rights" subtitle="Versioned course evidence and independent private-material approval">
  <div className="space-y-6">
   {!allowed?<section role="alert" className="rounded-xl border bg-card p-5">An active centre director, programme leader or superadmin role with a centre assignment is required.</section>:
    !enabled?<section role="status" className="max-w-3xl rounded-xl border bg-card p-6 space-y-3">
     <h2 className="text-lg font-semibold">Registry activation is pending</h2>
     <p className="text-sm text-muted-foreground">Qualification-version and redistribution-rights records have been built, but the staging SQL and authenticated permissions must be independently verified in UniPathway's own database before this workspace is enabled. No unverified external qualifications or publishing permissions are shown.</p>
     <Link to={back} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold">Return to course content</Link>
    </section>:<>
     <section className="rounded-xl border bg-card p-5 space-y-2">
      <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Separate teaching-source review from official accreditation</h2>
      <p className="text-sm text-muted-foreground">A reviewed specification means the centre checked its source and version. It does not mean UniPathway is an approved OTHM, Qualifi, ATHE, Pearson, Cambridge or Pakistan examination centre. Publisher material cannot be redistributed until a different manager approves the specific material-rights record.</p>
      <Link to={back} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold">Course content inventory</Link>
     </section>
     {loading&&<p role="status">Loading centre specifications and rights evidence…</p>}
     {error&&<section role="alert" className="rounded-xl border border-destructive p-5">{error}<Button className="ml-3" variant="outline" onClick={refresh}>Retry</Button></section>}
     {!loading&&!error&&<>
      <section className="rounded-xl border bg-card p-5">
       <h2 className="flex items-center gap-2 font-semibold"><BookOpenCheck className="size-4"/>Record a qualification specification</h2>
       <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Awarding body
         <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={form.board} onChange={e=>setForm(p=>({...p,board:e.target.value}))}>
          {COURSE_BOARDS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select>
        </label>
        <label className="text-sm font-medium">Existing teaching module (optional for an unconfigured board)
         <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={form.moduleId} onChange={e=>setForm(p=>({...p,moduleId:e.target.value}))}>
          <option value="">Unassigned planning specification</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}
         </select>
        </label>
        {([
         ['Qualification title','qualificationTitle'],['Qualification / board code','qualificationCode'],
         ['Subject','subject'],['Unit or syllabus code','syllabusCode'],
         ['Specification version / years','version'],['Examination session','session']
        ] as const).map(([label,field])=><label key={field} className="text-sm font-medium">{label}
         <Input required maxLength={field==='qualificationTitle'?180:120} className="mt-1 min-h-11" value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))}/>
        </label>)}
        <label className="text-sm font-medium sm:col-span-2">Original HTTPS specification source
         <Input type="url" required maxLength={1000} placeholder="https://official-publisher.example/specification" className="mt-1 min-h-11" value={form.sourceUrl} onChange={e=>setForm(p=>({...p,sourceUrl:e.target.value}))}/>
        </label>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>Save unverified draft</Button></div>
       </form>
      </section>
      <section className="rounded-xl border bg-card p-5 space-y-4">
       <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold"><ClipboardCheck className="size-4"/>Review recorded specifications</h2>
        <label className="text-sm">Board
         <select value={filter} onChange={e=>setFilter(e.target.value)} className="ml-2 min-h-11 rounded-lg border bg-background px-2">
          <option value="all">All boards</option>{COURSE_BOARDS.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}
         </select>
        </label>
       </div>
       {!filtered.length?<p className="text-sm text-muted-foreground">No saved centre specifications match. Create a source draft above.</p>:
       filtered.map(spec=><article key={spec.id} className="rounded-lg border p-4 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
         <h3 className="font-semibold">{spec.qualification_title}</h3>
         <span className="text-xs font-semibold text-muted-foreground">{spec.review_status} · external authorisation {spec.authorisation_status}</span>
        </div>
        <p className="text-sm">{sourceBoard(spec.board_key)} · {spec.qualification_code} · {spec.subject} · {spec.syllabus_code} · {spec.specification_version} · {spec.exam_session}</p>
        <p className="text-xs text-muted-foreground">{spec.module_id?'Module-linked source':'Planning only, not attached to a centre module'}</p>
        <a href={spec.specification_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline">Original source <ExternalLink className="size-3.5"/></a>
        <div className="flex flex-wrap gap-2">
         {spec.review_status==='draft'&&<Button disabled={busy||spec.created_by===user?.id} onClick={()=>review(spec,'reviewed')}>Mark source reviewed</Button>}
         {spec.review_status!=='withdrawn'&&<Button variant="outline" disabled={busy} onClick={()=>review(spec,'withdrawn')}>Withdraw specification</Button>}
        </div>
        {spec.review_status==='draft'&&spec.created_by===user?.id&&<p className="text-xs text-muted-foreground">A different academic manager must complete this review.</p>}
       </article>)}
      </section>
      <section className="rounded-xl border bg-card p-5 space-y-4">
       <h2 className="flex items-center gap-2 font-semibold"><FileCheck2 className="size-4"/>Review material distribution rights</h2>
       {!rights.length?<p className="text-sm text-muted-foreground">No rights-evidence proposals have been recorded.</p>:
       rights.map(r=><article key={r.id} className="rounded-lg border p-4 space-y-2">
        <h3 className="font-semibold">{r.rights_holder} · {r.rights_basis.replaceAll('_',' ')}</h3>
        <p className="text-sm text-muted-foreground">Evidence reference: {r.evidence_reference}</p>
        <p className="text-xs text-muted-foreground">Status: {r.review_status} · {r.expires_at?'Expires '+new Date(r.expires_at).toLocaleDateString():'No recorded expiry'} · Module {modules.find(m=>m.id===r.module_id)?.title||r.module_id.slice(0,8)}</p>
        <div className="flex flex-wrap gap-2">
         {r.review_status==='pending'&&<Button disabled={busy||r.created_by===user?.id||r.rights_basis==='official_link_only'} onClick={()=>rightsReview(r,'approved')}>Approve for enrolled-module sharing</Button>}
         {r.review_status!=='withdrawn'&&<Button variant="outline" disabled={busy} onClick={()=>rightsReview(r,'withdrawn')}>Withdraw rights</Button>}
        </div>
        {r.review_status==='pending'&&r.created_by===user?.id&&<p className="text-xs text-muted-foreground">A different centre manager must approve your proposed rights.</p>}
       </article>)}
      </section>
     </>}
    </>}
  </div>
 </DashboardLayout>;
}
