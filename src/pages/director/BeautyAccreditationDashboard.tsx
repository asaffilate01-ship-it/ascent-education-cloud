import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowUpRight, BookOpenCheck, ClipboardList, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { academyAccreditationSchemes, accreditationStages, cibtacQualifications, cpdCandidateCourses, mayAdvertiseAward, type AcademyAccreditationStatus } from '@/lib/beautyAccreditation';
import { curriculumSamples, sampleHasSufficientUnitReferences } from '@/lib/curriculumSamples';

const db:SupabaseClient=supabase;
type CaseRow={
 id:string;tenant_id:string;scheme:string;status:AcademyAccreditationStatus;
 application_reference:string|null;evidence_reference:string|null;review_notes:string|null;
 decided_at:string|null;valid_until:string|null;verified_by:string|null;
};
type ReviewRow={
 id:string;tenant_id:string;awarding_body:string;qualification_code:string;
 qualification_title:string;qualification_source_url:string;
 programme_id:string|null;required_unit_count:number;mapped_unit_count:number;
 review_status:string;centre_permission_reference:string|null;
 approval_evidence_reference:string|null;trainer_evidence_reference:string|null;
 assessment_evidence_reference:string|null;delivery_plan_reference:string|null;
};
type UnitRow={
 id:string;tenant_id:string;review_id:string;unit_reference:string;unit_title:string;
 lms_module_id:string|null;material_manifest_reference:string|null;approval_status:string;
};
type Programme={id:string;title:string};
type LmsModule={id:string;title:string;programme_id:string};
type CaseEdit={status:AcademyAccreditationStatus;application_reference:string;evidence_reference:string;review_notes:string;valid_until:string};

const makeEdit=(item:CaseRow):CaseEdit=>({
 status:item.status,
 application_reference:item.application_reference||'',
 evidence_reference:item.evidence_reference||'',
 review_notes:item.review_notes||'',
 valid_until:item.valid_until||'',
});

export default function BeautyAccreditationDashboard(){
 const {user}=useAuth();
 const permitted=Boolean(user?.roles.some(r=>['superadmin','centre_director','programme_leader','iqa_officer'].includes(r)));
 const canEdit=Boolean(user?.roles.some(r=>['superadmin','centre_director'].includes(r)));
 const canCurriculum=Boolean(user?.roles.some(r=>['superadmin','centre_director','programme_leader'].includes(r)));
 const superadmin=Boolean(user?.roles.includes('superadmin'));
 const [tenantChoice,setTenantChoice]=useState('');
 const [centres,setCentres]=useState<{id:string;name:string}[]>([]);
 const tenant=superadmin?(tenantChoice||user?.tenantId):user?.tenantId;
 useEffect(()=>{if(!superadmin)return;let active=true;void db.from('tenants').select('id,name').order('name').then(({data})=>{if(active)setCentres((data||[]) as {id:string;name:string}[]);});return()=>{active=false;};},[superadmin]);
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [reviews,setReviews]=useState<ReviewRow[]>([]);
 const [units,setUnits]=useState<UnitRow[]>([]);
 const [programmes,setProgrammes]=useState<Programme[]>([]);
 const [modules,setModules]=useState<LmsModule[]>([]);
 const [caseEdits,setCaseEdits]=useState<Record<string,CaseEdit>>({});
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState('');
 const [selectedReview,setSelectedReview]=useState('');
 const [body,setBody]=useState('CIBTAC'),[code,setCode]=useState(''),[title,setTitle]=useState(''),[source,setSource]=useState(''),[required,setRequired]=useState('0'),[programmeId,setProgrammeId]=useState('');
 const [unitRef,setUnitRef]=useState(''),[unitTitle,setUnitTitle]=useState(''),[unitModule,setUnitModule]=useState(''),[unitMaterials,setUnitMaterials]=useState('');
 const load=useCallback(async()=>{
   if(!tenant || !permitted)return;
   setLoading(true);setError('');
   try{
     const rows=await Promise.all([
       db.from('unipathway_accreditation_cases').select('*').eq('tenant_id',tenant).order('created_at'),
       db.from('unipathway_curriculum_reviews').select('*').eq('tenant_id',tenant).order('qualification_title'),
       db.from('unipathway_curriculum_units').select('*').eq('tenant_id',tenant).order('unit_title'),
       db.from('programmes').select('id,title').eq('tenant_id',tenant).order('title'),
       db.from('modules').select('id,title,programme_id').eq('tenant_id',tenant).order('title'),
     ]);
     const firstFailure=rows.find(x=>x.error);
     if(firstFailure?.error)throw new Error('Accreditation and curriculum tables are not ready in the connected Supabase database. Complete the migration-reconciliation and RLS tests before enabling this workflow. '+firstFailure.error.message);
     setCases((rows[0].data||[]) as CaseRow[]);
     setReviews((rows[1].data||[]) as ReviewRow[]);
     setUnits((rows[2].data||[]) as UnitRow[]);
     setProgrammes((rows[3].data||[]) as Programme[]);
     setModules((rows[4].data||[]) as LmsModule[]);
     setCaseEdits(Object.fromEntries(((rows[0].data||[]) as CaseRow[]).map(c=>[c.id,makeEdit(c)])));
   }catch(e){setError(e instanceof Error?e.message:'Could not load accreditation evidence.');}
   finally{setLoading(false);}
 },[tenant,permitted]);
 useEffect(()=>{void load();},[load]);
 const activeReview=reviews.find(r=>r.id===selectedReview);
 const mappedUnits=useMemo(()=>units.filter(u=>u.review_id===selectedReview),[units,selectedReview]);
 const moduleOptions=modules.filter(m=>!activeReview?.programme_id || m.programme_id===activeReview.programme_id);
 const setEdit=(id:string,key:keyof CaseEdit,value:string)=>setCaseEdits(prev=>({...prev,[id]:{...prev[id],[key]:value}}));
 const act=async(key:string,fn:()=>Promise<void>)=>{
   if(busy)return;
   setBusy(key);setError('');setNotice('');
   try{await fn();setNotice('Saved to Supabase. Review the recorded evidence before describing any external approval as confirmed.');await load();}
   catch(e){setError(e instanceof Error?e.message:'The change was not saved.');}
   finally{setBusy('');}
 };
 async function startCase(scheme:string){
   if(!tenant)return;
   await act(scheme,async()=>{
     const r=await db.from('unipathway_accreditation_cases').insert({tenant_id:tenant,scheme,status:'research'});
     if(r.error)throw r.error;
   });
 }
 async function saveCase(item:CaseRow){
   if(!tenant||!user)return;
   const edit=caseEdits[item.id];
   if(!edit)return;
   if(edit.status==='approved' && (!superadmin||!edit.evidence_reference.trim()||!edit.application_reference.trim()))
    return setError('Only a superadmin can record an externally evidenced approval with its reference and decision documentation.');
   await act(item.id,async()=>{
     const payload:Record<string,unknown>={
       status:edit.status,application_reference:edit.application_reference.trim()||null,
       evidence_reference:edit.evidence_reference.trim()||null,
       review_notes:edit.review_notes.trim()||null,valid_until:edit.valid_until||null,
       verified_by:edit.status==='approved'?user.id:null,
       decided_at:edit.status==='approved'?new Date().toISOString():null,
     };
     const r=await db.from('unipathway_accreditation_cases').update(payload).eq('id',item.id).eq('tenant_id',tenant);
     if(r.error)throw r.error;
     if(!(r.data||[]).length)throw new Error('The application update was not permitted or the record no longer exists.');
   });
 }
 function loadCatalogue(key:string){
   if(key.startsWith('cibtac:')){
     const chosen=cibtacQualifications.find(c=>c.code===key.slice(7));if(!chosen)return;
     setBody('CIBTAC');setCode(chosen.code);setTitle(chosen.name);setSource(chosen.source);setRequired('0');return;
   }
   if(key.startsWith('cpd:')){
     const chosen=cpdCandidateCourses.find(c=>c.id===key.slice(4));if(!chosen)return;
     setBody('CPD UK');setCode(chosen.id);setTitle(chosen.name);setSource('https://www.cpduk.co.uk/become-accredited');setRequired('0');return;
   }
   const sample=curriculumSamples.find(c=>c.id===key);if(!sample)return;
   setBody(sample.body);setTitle(sample.qualificationTitle);
   setCode(sample.qualificationCode||'');setSource(sample.specificationUrl);setRequired(String(sample.units.length));
 }
 async function createReview(){
   if(!tenant||!body||!code.trim()||!title.trim()||!/^https:\/\//i.test(source)||!Number.isInteger(Number(required))||Number(required)<0){
     setError('Choose an awarding body, enter its verified code, title, official HTTPS specification URL and the required number of units.');return;
   }
   await act('create-review',async()=>{
     const r=await db.from('unipathway_curriculum_reviews').insert({
       tenant_id:tenant,awarding_body:body,qualification_code:code.trim(),
       qualification_title:title.trim(),qualification_source_url:source,
       programme_id:programmeId||null,required_unit_count:Number(required),
       mapped_unit_count:0,review_status:'draft',
     }).select('id').single();
     if(r.error)throw r.error;setSelectedReview(r.data.id);
   });
 }
 async function importQualifiSample(){
   if(!tenant || !activeReview || activeReview.qualification_code!=='610/3934/2')return;
   const sample=curriculumSamples.find(x=>x.id==='qualifi-l4-ai');
   if(!sample||!sampleHasSufficientUnitReferences(sample))return;
   if(mappedUnits.length!==0){setError('This review already has mappings. Resolve them before importing the reference set.');return;}
   await act('import-sample',async()=>{
     const rows=sample.units.map(u=>({tenant_id:tenant,review_id:activeReview.id,
       unit_reference:u.reference!,unit_title:u.title,credits:u.credits,guided_learning_hours:u.guidedHours,
       specification_source_url:sample.specificationUrl,approval_status:'draft'}));
     const r=await db.from('unipathway_curriculum_units').insert(rows);
     if(r.error)throw r.error;
     const update=await db.from('unipathway_curriculum_reviews').update({mapped_unit_count:rows.length}).eq('id',activeReview.id).eq('tenant_id',tenant);
     if(update.error)throw update.error;
   });
 }
 async function addUnit(){
   if(!tenant||!activeReview||!unitRef.trim()||!unitTitle.trim()||!activeReview.qualification_source_url){
     setError('Choose a curriculum review and enter the specification unit reference and title.');return;
   }
   await act('add-unit',async()=>{
     const insert=await db.from('unipathway_curriculum_units').insert({
       tenant_id:tenant,review_id:activeReview.id,unit_reference:unitRef.trim(),unit_title:unitTitle.trim(),
       lms_module_id:unitModule||null,material_manifest_reference:unitMaterials.trim()||null,
       specification_source_url:activeReview.qualification_source_url,approval_status:'draft',
     });
     if(insert.error)throw insert.error;
     const update=await db.from('unipathway_curriculum_reviews').update({mapped_unit_count:mappedUnits.length+1}).eq('id',activeReview.id).eq('tenant_id',tenant);
     if(update.error)throw update.error;
     setUnitRef('');setUnitTitle('');setUnitMaterials('');setUnitModule('');
   });
 }
 async function reviewUnit(unit:UnitRow){
   if(!tenant)return;
   await act(unit.id,async()=>{
     const status=superadmin?'approved':'reviewed';
     if(status==='approved' && (!unit.lms_module_id||!unit.material_manifest_reference))
       throw new Error('Attach an authenticated LMS module and private material manifest before approving the unit.');
     const r=await db.from('unipathway_curriculum_units').update({approval_status:status}).eq('id',unit.id).eq('tenant_id',tenant);
     if(r.error)throw r.error;
   });
 }
 const haveCases=new Map(cases.map(c=>[c.scheme,c]));
 return <DashboardLayout title="Beauty & Qualification Accreditation" subtitle="Real awarding-body evidence, centre approval and LMS curriculum release gates">
   {!permitted?<p role="alert">Centre leadership, programme leadership or IQA permissions are required.</p>
   :!tenant?<p role="alert">Select or assign a centre to inspect approvals. No cross-tenant data is displayed.</p>
   :<div className="space-y-8">
     {superadmin&&centres.length>0&&<label className="block rounded-xl border bg-card p-4 text-sm font-semibold">Centre for accreditation review<select className="mt-2 block h-10 w-full max-w-lg rounded-md border bg-background px-3" value={tenant||""} onChange={e=>{setTenantChoice(e.target.value);setSelectedReview("");}}>{centres.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
     <section className="rounded-xl border bg-card p-5">
       <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Awarding-body readiness</h2><p className="mt-1 text-sm text-muted-foreground">There are separate centre applications and course authorisations. Approval must be independently evidenced.</p></div><Button variant="outline" disabled={loading} onClick={()=>void load()}>Refresh evidence</Button></div>
       {loading&&<p role="status" className="mt-4 text-sm">Loading current centre records…</p>}
       {error&&<p role="alert" className="mt-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
       {notice&&<p role="status" className="mt-4 text-sm text-success">{notice}</p>}
       {!error&&<p className="mt-3 text-sm text-muted-foreground">{cases.filter(c=>mayAdvertiseAward(c.status,Boolean(c.verified_by&&c.evidence_reference),c.valid_until)).length} externally evidenced centre approvals recorded. Do not use award logos or claim approval until documentation and licence to use the mark have been checked.</p>}
     </section>

     <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-6 text-success"/>Centre and CPD provider applications</h2>
       <div className="grid gap-4 lg:grid-cols-2">{academyAccreditationSchemes.map(s=>{
         const item=haveCases.get(s.id),edit=item?caseEdits[item.id]:undefined;
         return <article key={s.id} className="space-y-3 rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{s.name}</h3><span className="rounded-md border px-2 py-1 text-xs font-semibold">{item?.status||'Not yet started'}</span></div>
           <p className="text-sm text-muted-foreground">{s.description}</p><a className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" href={s.url} target="_blank" rel="noopener noreferrer">Official accreditation details <ArrowUpRight className="size-4"/></a>
           <details><summary className="cursor-pointer text-sm font-semibold">Suggested evidence checklist</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{s.checklist.map(k=><li key={k}>{k}</li>)}</ul></details>
           {!item&&canEdit&&<Button variant="outline" disabled={!!busy||loading||!!error} onClick={()=>void startCase(s.id)}>Create application record</Button>}
           {item&&edit&&<div className="space-y-3 border-t pt-3">
             <label className="block text-sm font-semibold">Application stage
               <select className="mt-1 block h-10 w-full rounded-md border bg-background px-3" disabled={!canEdit} value={edit.status} onChange={e=>setEdit(item.id,'status',e.target.value)}>
                 {accreditationStages.filter(st=>superadmin||!['approved','declined','expired'].includes(st)).map(st=><option value={st} key={st}>{st.replace(/_/g,' ')}</option>)}
               </select>
             </label>
             <label className="block text-sm font-semibold">Awarding-body application/reference<Input className="mt-1" disabled={!canEdit} value={edit.application_reference} onChange={e=>setEdit(item.id,'application_reference',e.target.value)} placeholder="Official reference only; no credentials"/></label>
             <label className="block text-sm font-semibold">Approval evidence document reference<Input className="mt-1" disabled={!canEdit} value={edit.evidence_reference} onChange={e=>setEdit(item.id,'evidence_reference',e.target.value)} placeholder="Restricted document ID, not PII"/></label>
             <label className="block text-sm font-semibold">Internal notes<Input className="mt-1" disabled={!canEdit} value={edit.review_notes} onChange={e=>setEdit(item.id,'review_notes',e.target.value)}/></label>
             <label className="block text-sm font-semibold">Expiry/review date if applicable<Input className="mt-1" type="date" disabled={!canEdit} value={edit.valid_until} onChange={e=>setEdit(item.id,'valid_until',e.target.value)}/></label>
             {canEdit&&<Button size="sm" disabled={!!busy||loading||!!error} onClick={()=>void saveCase(item)}>{busy===item.id?'Saving…':'Save evidence and stage'}</Button>}
           </div>}
         </article>;
       })}</div>
     </section>

     <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpenCheck className="size-6 text-success"/>Qualification specifications and LMS mapping</h2>
       <p className="max-w-4xl text-sm text-muted-foreground">Map each awarding-body unit to a real centre programme, LMS module, private teaching-material manifest and internal assessment review. A catalogue listing alone does not release a course. Final approval requires fully reviewed units, centre permissions, and recorded evidence.</p>
       {canCurriculum&&<div className="rounded-xl border bg-card p-5"><h3 className="font-bold">Start a draft review</h3>
         <label className="mt-3 block text-sm font-medium">Load a verified sample or selected beauty course<select className="mt-1 block h-10 w-full rounded-md border bg-background px-3" defaultValue="" onChange={e=>loadCatalogue(e.target.value)}>
          <option value="">Choose a reference…</option>
          {curriculumSamples.map(s=><option key={s.id} value={s.id}>{s.qualificationTitle}</option>)}
          {cibtacQualifications.map(s=><option key={s.code} value={'cibtac:'+s.code}>{s.name}</option>)}
          {cpdCandidateCourses.map(s=><option key={s.id} value={'cpd:'+s.id}>CPD candidate: {s.name}</option>)}
         </select></label>
         <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">Awarding body<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={body} onChange={e=>setBody(e.target.value)}>{['CIBTAC','CPD UK','OTHM','Qualifi'].map(x=><option value={x} key={x}>{x}</option>)}</select></label>
          <label className="block text-sm">Official qualification/course reference<Input className="mt-1" value={code} onChange={e=>setCode(e.target.value)} placeholder="Verify before creating"/></label>
          <label className="block text-sm">Exact qualification/course title<Input className="mt-1" value={title} onChange={e=>setTitle(e.target.value)}/></label>
          <label className="block text-sm">Official specification URL<Input className="mt-1" type="url" value={source} onChange={e=>setSource(e.target.value)}/></label>
          <label className="block text-sm">Required units from specification<Input className="mt-1" type="number" min={0} max={100} value={required} onChange={e=>setRequired(e.target.value)}/></label>
          <label className="block text-sm">Linked LMS programme<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={programmeId} onChange={e=>setProgrammeId(e.target.value)}><option value="">Not linked yet — drafting only</option>{programmes.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
         </div>
         <p className="mt-3 text-xs text-muted-foreground">For OTHM Business, staff must retrieve and confirm the current official qualification code before creating a review. Samples are never published automatically.</p>
         <Button className="mt-4" disabled={!!busy||loading||!!error} onClick={()=>void createReview()}>Create draft curriculum review</Button>
       </div>}
       <div className="rounded-xl border bg-card p-5"><h3 className="font-semibold">Programme release register</h3>
         {!reviews.length?<p className="mt-2 text-sm text-muted-foreground">No curriculum reviews recorded for this centre. Drafts need specifications, tutors, materials, assessment evidence and awarding-body authorisation.</p>:<div className="mt-3 space-y-2">{reviews.map(r=><button key={r.id} type="button" onClick={()=>setSelectedReview(r.id)} className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-left text-sm ${selectedReview===r.id?'border-success bg-secondary/40':'hover:bg-secondary/40'}`}><span className="font-semibold">{r.awarding_body} · {r.qualification_title}</span><span className="text-xs text-muted-foreground">{r.review_status} · {r.mapped_unit_count}/{r.required_unit_count} mapped</span></button>)}</div>}
       </div>

       {activeReview&&<div className="rounded-xl border bg-card p-5">
         <h3 className="text-lg font-bold">{activeReview.qualification_title}</h3>
         <p className="mt-1 text-sm text-muted-foreground">Status: {activeReview.review_status} · {mappedUnits.length} recorded units · {activeReview.required_unit_count} required. Release cannot be approved without validated training materials, assessments and centre permission.</p>
         <a href={activeReview.qualification_source_url} className="mt-2 inline-block text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">Official specification ↗</a>
         {canCurriculum && activeReview.qualification_code==='610/3934/2' && !mappedUnits.length && <Button className="ml-3 mt-2" size="sm" variant="outline" disabled={!!busy} onClick={()=>void importQualifiSample()}>Import verified Qualifi AI units as drafts</Button>}
         <div className="mt-4 space-y-2">{mappedUnits.map(unit=><article key={unit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"><div><p className="font-semibold">{unit.unit_reference} · {unit.unit_title}</p><p className="text-xs text-muted-foreground">{unit.approval_status} · {unit.lms_module_id?'Module linked':'Not linked to LMS'} · {unit.material_manifest_reference?'Private material manifest recorded':'Materials pending'}</p></div>{canCurriculum&&unit.approval_status!=='approved'&&<Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={()=>void reviewUnit(unit)}>{superadmin?'Verify unit':'Mark reviewed'}</Button>}</article>)}</div>
         {canCurriculum && activeReview.review_status!=='approved' && <div className="mt-5 space-y-3 border-t pt-4"><h4 className="font-semibold">Add a reviewed unit mapping</h4>
           <div className="grid gap-3 md:grid-cols-2">
             <label className="block text-sm">Official unit reference<Input className="mt-1" value={unitRef} onChange={e=>setUnitRef(e.target.value)}/></label>
             <label className="block text-sm">Unit title<Input className="mt-1" value={unitTitle} onChange={e=>setUnitTitle(e.target.value)}/></label>
             <label className="block text-sm">LMS module<select value={unitModule} onChange={e=>setUnitModule(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Link later</option>{moduleOptions.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}</select></label>
             <label className="block text-sm">Private material manifest reference<Input className="mt-1" value={unitMaterials} onChange={e=>setUnitMaterials(e.target.value)} placeholder="Restricted, no external public links"/></label>
           </div>
           <Button size="sm" disabled={!!busy||loading||!!error} onClick={()=>void addUnit()}>Save draft unit mapping</Button>
         </div>}
       </div>}
     </section>

     <section className="rounded-xl border bg-secondary/40 p-5"><ClipboardList className="size-6 text-success"/><h2 className="mt-2 text-lg font-bold">Enrolment-to-graduation workflow</h2><p className="mt-2 text-sm text-muted-foreground">Qualification approval → programme + unit mapping → online/in-centre enrolment → protected materials and attendance → coursework and practical evidence → assessor/IQA moderation → verified awards → career, employer or university support. No item may be counted as ready until its live Supabase integration and role-specific acceptance tests pass.</p><div className="mt-4 flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/director/programmes">Programmes</Link></Button><Button asChild variant="outline"><Link to="/director/quality">Quality and moderation</Link></Button><Button asChild variant="outline"><Link to="/director/application-support">International support</Link></Button><Button asChild variant="outline"><Link to="/director/readiness">Release readiness</Link></Button></div></section>
   </div>}
 </DashboardLayout>;
}
