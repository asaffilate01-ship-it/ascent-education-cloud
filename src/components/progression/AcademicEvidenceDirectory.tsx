import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {BookOpen,ShieldCheck,ExternalLink,RefreshCcw,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {supabase} from '@/integrations/supabase/client';
import {toast} from 'sonner';

const db:SupabaseClient=supabase;
const COUNTRIES=['Pakistan','UK','USA','Canada','Australia','Germany','Ireland','France','Other'];
const BODIES=['OTHM','Qualifi','Other'] as const;
type SourceRow={
 id:string;tenant_id:string;awarding_body:string;qualification_name:string;qualification_level:string;
 destination_country:string;destination_institution:string;destination_programme:string;
 grade_requirements:string|null;english_requirements:string|null;entry_stage:string|null;
 source_url:string|null;source_kind:string;review_status:string;student_visible:boolean;
 reviewed_at:string|null;recheck_due:string|null;
};
type FormDataSource={
 awarding_body:string;qualification_name:string;qualification_level:string;
 destination_country:string;destination_institution:string;destination_programme:string;
 source_url:string;source_kind:string;grade_requirements:string;english_requirements:string;
 entry_stage:string;recheck_due:string;
};
const initial:FormDataSource={
 awarding_body:'OTHM',qualification_name:'',qualification_level:'Level 5',
 destination_country:'UK',destination_institution:'',destination_programme:'',
 source_url:'',source_kind:'awarding_body_directory',
 grade_requirements:'',english_requirements:'',entry_stage:'',recheck_due:''
};
const displayDate=(date:string|null)=>date?new Date(date.includes('T')?date:date+'T12:00:00Z').toLocaleDateString():'Not set';
export default function AcademicEvidenceDirectory({tenant,student=false,manager=false}:{
 tenant:string;student?:boolean;manager?:boolean;
}){
 const [rows,setRows]=useState<SourceRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [form,setForm]=useState<FormDataSource>(initial);
 const [editing,setEditing]=useState<string|null>(null);
 const [showForm,setShowForm]=useState(false);
 const [country,setCountry]=useState('all');
 const [body,setBody]=useState('all');
 const [search,setSearch]=useState('');
 const version=useRef(0);
 const load=useCallback(async()=>{
  const req=++version.current;
  setLoading(true);setError('');setRows([]);
  let query=db.from('academic_progression_evidence').select(
   'id,tenant_id,awarding_body,qualification_name,qualification_level,destination_country,destination_institution,destination_programme,grade_requirements,english_requirements,entry_stage,source_url,source_kind,review_status,student_visible,reviewed_at,recheck_due'
  ).eq('tenant_id',tenant).order('destination_institution').limit(250);
  if(student)query=query.eq('review_status','verified').eq('student_visible',true);
  const r=await query;
  if(req!==version.current)return;
  if(r.error)setError('The academic progression directory is unavailable. Its staging migration may not yet be applied.');
  else setRows((r.data||[]) as SourceRow[]);
  setLoading(false);
 },[tenant,student]);
 useEffect(()=>{void load();return()=>{version.current++;};},[load]);
 const filtered=useMemo(()=>rows.filter(r=>
  (country==='all'||r.destination_country===country)&&(body==='all'||r.awarding_body===body)
  &&[r.destination_institution,r.destination_programme,r.qualification_name,r.qualification_level]
   .some(x=>x.toLowerCase().includes(search.trim().toLowerCase()))
 ),[rows,country,body,search]);
 function edit(row:SourceRow){
  setEditing(row.id);
  setForm({
   awarding_body:row.awarding_body,qualification_name:row.qualification_name,
   qualification_level:row.qualification_level,destination_country:row.destination_country,
   destination_institution:row.destination_institution,destination_programme:row.destination_programme,
   source_url:row.source_url||'',source_kind:row.source_kind,
   grade_requirements:row.grade_requirements||'',english_requirements:row.english_requirements||'',
   entry_stage:row.entry_stage||'',recheck_due:row.recheck_due||''
  });
  setShowForm(true);
 }
 const update=<K extends keyof FormDataSource>(key:K,value:FormDataSource[K])=>setForm(v=>({...v,[key]:value}));
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!manager||busy)return;
  if(form.source_url&&!/^https:\/\/[^\s]+$/i.test(form.source_url))return toast.error('Provide a valid HTTPS source URL.');
  if(!form.qualification_name.trim()||!form.destination_institution.trim()||!form.destination_programme.trim())return toast.error('Complete qualification, university and programme.');
  setBusy(true);
  const values={
   awarding_body:form.awarding_body,qualification_name:form.qualification_name.trim(),
   qualification_level:form.qualification_level.trim(),
   destination_country:form.destination_country,
   destination_institution:form.destination_institution.trim(),
   destination_programme:form.destination_programme.trim(),
   source_kind:form.source_kind,source_url:form.source_url.trim()||null,
   grade_requirements:form.grade_requirements.trim()||null,
   english_requirements:form.english_requirements.trim()||null,
   entry_stage:form.entry_stage.trim()||null,recheck_due:form.recheck_due||null
  };
  try{
   const query=editing?
    db.from('academic_progression_evidence').update(values).eq('id',editing).eq('tenant_id',tenant):
    db.from('academic_progression_evidence').insert({...values,tenant_id:tenant});
   const r=await query;
   if(r.error)throw r.error;
   toast.success(editing?'Record saved. Changed evidence must be re-reviewed.':'Academic progression recorded as unpublished research.');
   setShowForm(false);setEditing(null);setForm(initial);await load();
  }catch(e){toast.error(e instanceof Error?e.message:'Unable to save academic evidence');}
  finally{setBusy(false);}
 }
 async function status(row:SourceRow,value:'verified'|'under_review'){
  if(!manager||busy)return;
  if(value==='verified'&&(!row.source_url||!row.source_url.startsWith('https://')))return toast.error('Official source evidence is required.');
  setBusy(true);
  try{
   const r=await db.from('academic_progression_evidence')
    .update({review_status:value,student_visible:value==='verified'})
    .eq('id',row.id).eq('tenant_id',tenant);
   if(r.error)throw r.error;
   toast.success(value==='verified'?'Academic evidence reviewed and published (not an agent appointment).':'Record unpublished for re-review.');
   await load();
  }catch(e){toast.error(e instanceof Error?e.message:'Review failed');}
  finally{setBusy(false);}
 }
 return <section className="surface-card p-5 space-y-4" aria-label="Evidence-reviewed university progression">
  <div className="flex items-start justify-between gap-3 flex-wrap">
   <div className="space-y-1"><p className="text-xs uppercase tracking-widest font-semibold text-primary">OTHM / Qualifi academic recognition</p>
    <h2 className="text-xl font-semibold">University progression evidence</h2>
    <p className="text-sm text-muted-foreground max-w-3xl">Academic acceptance evidence is separate from an institution's contract to pay UniPathway recruitment commission. Each qualification and degree programme is reviewed individually. University admission, credit awards and funding are never guaranteed.</p>
   </div>
   {manager&&<Button size="sm" onClick={()=>{setEditing(null);setForm(initial);setShowForm(v=>!v);}}><Plus className="h-4 w-4 mr-1"/>Add academic evidence</Button>}
  </div>
  {manager&&showForm&&<form onSubmit={e=>void save(e)} className="border rounded-xl p-4 space-y-3">
   <h3 className="font-semibold">{editing?'Update source or entry requirements':'Propose academic recognition source'}</h3>
   <p className="text-xs text-muted-foreground">New records remain unpublished until a director reviews the official URL. Editing an already verified source or condition automatically revokes publication.</p>
   <div className="grid gap-3 md:grid-cols-2">
    <label className="text-xs font-semibold">Awarding body
      <select className="block w-full mt-1 rounded-md border bg-background p-2" value={form.awarding_body} onChange={e=>update('awarding_body',e.target.value)}>
       {BODIES.map(x=><option key={x}>{x}</option>)}
      </select>
    </label>
    <label className="text-xs font-semibold">Level
      <Input className="mt-1" maxLength={60} value={form.qualification_level} required onChange={e=>update('qualification_level',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Qualification title
      <Input className="mt-1" maxLength={200} required value={form.qualification_name} onChange={e=>update('qualification_name',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Destination
      <select className="block w-full mt-1 rounded-md border bg-background p-2" value={form.destination_country} onChange={e=>update('destination_country',e.target.value)}>
       {COUNTRIES.map(x=><option key={x}>{x}</option>)}
      </select>
    </label>
    <label className="text-xs font-semibold">University
      <Input className="mt-1" maxLength={200} required value={form.destination_institution} onChange={e=>update('destination_institution',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Receiving degree programme
      <Input className="mt-1" maxLength={200} required value={form.destination_programme} onChange={e=>update('destination_programme',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Evidence source
      <select className="block w-full mt-1 rounded-md border bg-background p-2" value={form.source_kind} onChange={e=>update('source_kind',e.target.value)}>
       <option value="awarding_body_directory">OTHM/Qualifi official progression directory</option>
       <option value="university_official_page">University's official admissions page</option>
      </select>
    </label>
    <label className="text-xs font-semibold">Direct official evidence URL
      <Input className="mt-1" type="url" maxLength={2048} placeholder="https://" value={form.source_url} onChange={e=>update('source_url',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Grades or credits needed
      <Input className="mt-1" maxLength={1000} value={form.grade_requirements} onChange={e=>update('grade_requirements',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">English / IELTS requirements
      <Input className="mt-1" maxLength={1000} value={form.english_requirements} onChange={e=>update('english_requirements',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Expected entry stage
      <Input className="mt-1" maxLength={200} value={form.entry_stage} onChange={e=>update('entry_stage',e.target.value)}/>
    </label>
    <label className="text-xs font-semibold">Recheck deadline
      <Input className="mt-1" type="date" value={form.recheck_due} onChange={e=>update('recheck_due',e.target.value)}/>
    </label>
   </div>
   <div className="flex gap-2 flex-wrap"><Button type="submit" disabled={busy}>{busy?'Saving…':'Save as evidence proposal'}</Button><Button type="button" variant="outline" onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</Button></div>
  </form>}
  <div className="flex items-center gap-2 flex-wrap">
   <Input className="max-w-sm" placeholder="Search degree, university or qualification" aria-label="Search academic progression" value={search} onChange={e=>setSearch(e.target.value)}/>
   <select className="border rounded p-2 bg-background text-sm" aria-label="Filter awarding body" value={body} onChange={e=>setBody(e.target.value)}><option value="all">All awarding bodies</option>{BODIES.map(x=><option key={x}>{x}</option>)}</select>
   <select className="border rounded p-2 bg-background text-sm" aria-label="Filter country" value={country} onChange={e=>setCountry(e.target.value)}><option value="all">All destinations</option>{[...new Set(rows.map(x=>x.destination_country))].sort().map(c=><option key={c}>{c}</option>)}</select>
   <Button size="sm" variant="outline" onClick={()=>void load()}><RefreshCcw className="w-4 h-4 mr-1"/>Refresh</Button>
  </div>
  {error&&<p className="text-sm text-destructive" role="alert">{error}</p>}
  {loading?<p className="text-sm" role="status">Loading academic evidence…</p>:
   filtered.length?<div className="grid gap-3 lg:grid-cols-2">
    {filtered.map(row=><article key={row.id} className="border rounded-xl p-4 space-y-3">
     <div className="flex justify-between items-start gap-2 flex-wrap">
      <div><p className="text-xs font-semibold text-primary">{row.awarding_body} · {row.qualification_level} · {row.destination_country}</p>
       <h3 className="font-semibold mt-1">{row.destination_institution}</h3><p className="text-sm">{row.destination_programme}</p></div>
      <span className="text-xs rounded-full bg-secondary px-2 py-1">{row.review_status==='verified'&&row.student_visible?'Reviewed academic source':row.review_status+' · internal'}</span>
     </div>
     <p className="text-sm text-muted-foreground">{row.qualification_name}</p>
     <dl className="text-sm grid gap-2 sm:grid-cols-2">
      <div><dt className="text-xs font-semibold">Expected entry stage</dt><dd>{row.entry_stage||'Confirm with university'}</dd></div>
      <div><dt className="text-xs font-semibold">Grades/credits</dt><dd>{row.grade_requirements||'Not yet recorded'}</dd></div>
      <div><dt className="text-xs font-semibold">Language requirement</dt><dd>{row.english_requirements||'University to confirm'}</dd></div>
      <div><dt className="text-xs font-semibold">Source last reviewed</dt><dd>{displayDate(row.reviewed_at)}</dd></div>
     </dl>
     {row.source_url&&<a className="inline-flex gap-1 items-center text-sm text-primary underline break-all" target="_blank" rel="noopener noreferrer" href={row.source_url}>
       Open published evidence <ExternalLink className="w-4 h-4 shrink-0"/>
     </a>}
     {row.recheck_due&&<p className="text-xs text-muted-foreground">Recheck source by {displayDate(row.recheck_due)}.</p>}
     {manager&&<div className="flex gap-2 flex-wrap">
       <Button type="button" size="sm" variant="outline" onClick={()=>edit(row)}>Edit evidence</Button>
       {row.review_status==='verified'&&row.student_visible
         ?<Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void status(row,'under_review')}>Unpublish for review</Button>
         :<Button type="button" size="sm" disabled={busy||!row.source_url} onClick={()=>void status(row,'verified')}><ShieldCheck className="w-4 h-4 mr-1"/>Verify & publish</Button>}
     </div>}
    </article>)}
   </div>:<p className="rounded-lg bg-secondary/50 p-5 text-sm text-muted-foreground">{student?'There are no currently reviewed academic recognition routes available to your centre. Ask admissions to check your qualification directly with the university.':'No academic evidence records match these filters. Start by proposing a route with an official source URL.'}</p>}
  {rows.length>=250&&<p className="text-xs text-muted-foreground">Showing the first 250 source records. Refine the filters to narrow the list.</p>}
  <p className="text-xs text-muted-foreground">This catalogue provides academic progression evidence only. It does not constitute a university agent appointment, admission guarantee, IELTS exemption or eligibility for commission.</p>
 </section>;
}
