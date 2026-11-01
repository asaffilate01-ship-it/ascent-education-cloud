import {downloadPrivateMaterial} from '@/lib/learning/offlineSync';
import {Link,useSearchParams} from 'react-router-dom';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
import { db } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BookOpen, Download, ShieldCheck, Upload } from 'lucide-react';
import {POST_CLASS_EXPLANATION,ACCOMMODATION_EXPLANATION} from '@/lib/learning/classRelease';

type Material={id:string;module_id:string;title:string;kind:string;object_path:string;publication_status:string;available_at:string|null;created_at:string;class_session_id:string|null};
type ClassOption={id:string;module_id:string;title:string;ends_at:string;status:string};
const classReleaseEnabled=import.meta.env.VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED==='true';
type Module={id:string;title:string;lecturer_id:string|null;tenant_id:string;programme_id:string};
const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
const kinds=['slide','worksheet','reading','homework','video','whiteboard'] as const;
const accepted=['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','video/mp4','text/plain'];
export default function ModuleMaterials(){const {user}=useAuth();const [params]=useSearchParams();const filter=params.get('module')||'',material=params.get('material')||'';return <MaterialsWorkspace key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}:${filter}:${material}`} moduleFilter={filter} materialFilter={material}/>;}
function MaterialsWorkspace({moduleFilter,materialFilter}:{moduleFilter:string;materialFilter:string}){
 const {user}=useAuth();
 const [tenant,setTenant]=useState<string|null>(user?.tenantId||null);
 const [modules,setModules]=useState<Module[]>([]),[items,setItems]=useState<Material[]>([]),[classes,setClasses]=useState<ClassOption[]>([]);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [moduleId,setModuleId]=useState(moduleFilter),[kind,setKind]=useState<(typeof kinds)[number]>('reading');
 const [title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null),[rightsAcknowledged,setRightsAcknowledged]=useState(false);
 const [classSessionId,setClassSessionId]=useState(''),[preparatoryOnly,setPreparatoryOnly]=useState(false);
 const [refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 const mounted=useRef(true),operation=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const staff=!!user?.role&&!!user.roles?.includes(user.role)&&['lecturer','programme_leader','centre_director','superadmin'].includes(user.role);
 const manager=!!user?.role&&!!user.roles?.includes(user.role)&&['centre_director','programme_leader','superadmin'].includes(user.role);
 const uid=user?.id;
 const reload=()=>{setItems([]);setModules([]);setClasses([]);setLoading(true);setError('');setPage(0);setRefresh(x=>x+1);};
 useEffect(()=>{
  let active=true;setItems([]);setModules([]);setClasses([]);setLoading(true);setError('');setPage(0);
  void (async()=>{try{
   const centre=user?.tenantId;
   if(!active)return;
   if(!uid||!centre)throw Error('An authorised centre and account are required.');
   if(!classReleaseEnabled)throw Error('Post-class material release is awaiting verified backend activation. Existing resources remain protected.');
   setTenant(centre);
   const queryModules=()=>{let q=db.from('modules').select('id,title,lecturer_id,tenant_id,programme_id').eq('tenant_id',centre);if(moduleFilter)q=q.eq('id',moduleFilter);if(staff&&!manager)q=q.eq('lecturer_id',uid);return q;};
   const [all,enrolments]=await Promise.all([
    pagedRows<Module>(queryModules,()=>active),
    staff?Promise.resolve([]):pagedRows<{programme_id:string}>(()=>db.from('student_enrolments').select('id,programme_id').eq('tenant_id',centre).eq('student_id',uid).eq('status','active'),()=>active),
   ]);
   const eligible=new Set(enrolments.map(e=>e.programme_id));
   const visible=all.filter(m=>staff||eligible.has(m.programme_id)).sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
   if(staff){
    const options=await pagedRows<ClassOption>(()=>db.from('live_class_sessions')
     .select('id,module_id,title,ends_at,status').eq('tenant_id',centre),()=>active);
    if(active)setClasses(options.filter(c=>visible.some(m=>m.id===c.module_id)&&c.status!=='cancelled'));
   }
   const materials=await rowsByIds<Material>(visible.map(m=>m.id),ids=>()=>db.from('unipathway_module_materials')
    .select('id,module_id,title,kind,object_path,publication_status,available_at,created_at,class_session_id')
    .eq('tenant_id',centre).in('module_id',ids),()=>active);
   if(!active)return;
   setModules(visible);setItems(materials.filter(m=>staff||(m.publication_status==='published'&&(m.class_session_id?classReleaseEnabled:(!m.available_at||Date.parse(m.available_at)<=Date.now())))).sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id)));
  }catch{if(active){setItems([]);setModules([]);setError('Your materials could not be verified. Refresh to retry, or contact your centre if this continues.');}}
  finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 // The workspace key resets all account, role and module scope; refresh reruns the complete read.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[refresh]);
 const filtered=items.filter(m=>(!materialFilter||m.id===materialFilter)&&`${m.title} ${m.kind} ${m.publication_status} ${modules.find(x=>x.id===m.module_id)?.title||''}`.toLowerCase().includes(search.toLowerCase()));
 const download=async(m:Material)=>{
  if(operation.current||loading||!classReleaseEnabled)return;operation.current=true;setBusy(true);
  const preview=window.open('about:blank','_blank');
  if(preview)preview.opener=null;
  try{
   const approval=await (supabase.rpc as any)('can_open_my_unipathway_material',{p_path:m.object_path});
   if(approval.error||approval.data!==true)throw Error('Private material access has not been approved.');
   const {data,error:e}=await supabase.storage.from('unipathway-module-materials').createSignedUrl(m.object_path,120);
   if(!mounted.current){preview?.close();return;}if(e||!data?.signedUrl)throw Error('Unavailable');
   const signed=new URL(data.signedUrl),origin=new URL(import.meta.env.VITE_SUPABASE_URL).origin;
   if(signed.protocol!=='https:'||signed.origin!==origin||signed.username||signed.password||
    !signed.pathname.startsWith('/storage/v1/object/sign/unipathway-module-materials/'))
    throw Error('Unrecognised private material address.');
   if(preview)preview.location.replace(signed.href);
   else {toast.error('Allow pop-ups to open this private file, then try again.');}
  }catch{preview?.close();if(mounted.current)toast.error('File not available to this account. Refresh materials and retry.');}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 const saveOffline=async(m:Material)=>{
  if(operation.current||loading||!user?.tenantId||!classReleaseEnabled)return;
  if(!window.confirm('Save this private learning file on this device for 24 hours? Use your own device. Exported copies cannot be removed on sign-out.'))return;
  operation.current=true;setBusy(true);
  try{await downloadPrivateMaterial({id:user.id,tenantId:user.tenantId},m.id);if(mounted.current)toast.success('File saved for 24 hours. Open Saved learning to use it offline.');}
  catch(e){if(mounted.current)toast.error(e instanceof Error?e.message:'Download failed. Retry when connected.');}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 const upload=async()=>{
  if(operation.current||loading||error||!classReleaseEnabled)return;
  const module=modules.find(m=>m.id===moduleId);
  if(!staff||!tenant||!user||!module||!file||!title.trim()||!rightsAcknowledged){toast.error('Choose an assigned module, title and file, then confirm you have distribution rights.');return;}
  if(classSessionId){
   const linked=classes.find(c=>c.id===classSessionId&&c.module_id===module.id);
   if(!linked){toast.error('Select a verified scheduled class in the same module.');return;}
  }else if(!preparatoryOnly){
   toast.error('Choose the linked class or explicitly confirm this is separate preparatory material, not class content.');return;
  }
  if(!file.size||file.size>25*1024*1024||!accepted.includes(file.type)){toast.error('Choose a supported, non-empty file up to 25 MB.');return;}
  const path=`${tenant}/${module.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  operation.current=true;setBusy(true);
  try{
   const result=await supabase.storage.from('unipathway-module-materials').upload(path,file,{contentType:file.type,upsert:false});
   if(result.error)throw result.error;
   if(!mounted.current){await supabase.storage.from('unipathway-module-materials').remove([path]);return;}
   const saved=await db.from('unipathway_module_materials').insert({tenant_id:tenant,module_id:module.id,created_by:user.id,title:title.trim(),kind,object_path:path,class_session_id:classSessionId||null,publication_status:'draft'}).select('id').single();
   if(saved.error||!saved.data?.id){await supabase.storage.from('unipathway-module-materials').remove([path]);throw Error('Save unconfirmed');}
   if(!mounted.current)return;
   setFile(null);setTitle('');setClassSessionId('');setPreparatoryOnly(false);setRightsAcknowledged(false);toast.success('Private draft saved. Class-linked files remain embargoed after publication.');reload();
  }catch{if(mounted.current){toast.error('Draft save could not be confirmed. Refresh and check your drafts before retrying.');reload();}}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 const publish=async(m:Material)=>{
  if(!staff||operation.current||loading||error||!classReleaseEnabled)return;
  operation.current=true;setBusy(true);
  try{
   const r=await (db.rpc as any)('publish_unipathway_course_material',{p_material:m.id});
   if(!mounted.current)return;
   if(r.error||r.data?.id!==m.id||r.data?.status!=='published')throw Error('Publication was not confirmed.');
   toast.success(r.data?.classLinked?'Class material scheduled under the 24-hour post-class embargo.':'Preparatory material published to enrolled students.');
   reload();
  }catch{if(mounted.current){toast.error('Publication was not confirmed. Check the centre release policy and retry.');reload();}}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 return <DashboardLayout title="Course materials and homework" subtitle="Module-based permissions for enrolled students and allocated lecturers">
   <ModuleJourney moduleId={moduleFilter} teacher={staff}/>
   <section className="mb-5 rounded-xl border bg-card p-4 space-y-2" aria-label="Class material release policy">
    <h2 className="font-semibold">Release timing for class-specific content</h2>
    <p className="text-sm">{POST_CLASS_EXPLANATION}</p>
    <p className="text-sm text-muted-foreground">{ACCOMMODATION_EXPLANATION}</p>
    {!classReleaseEnabled&&<p role="status" className="text-sm">Secure post-class release is not yet enabled on this backend. Files cannot be opened or published here until the class and storage policies are verified.</p>}
   </section>
   <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Protected academic materials</h2>
    <p className="mt-2 text-sm text-muted-foreground">Unpublished resources are visible only to authorised teaching staff. Released material appears only for students actively enrolled in the module's programme. Lessons, reading notes, slides and homework are grouped by your enrolled module. PDFs, images and supported videos can open in the browser; Office files may download for opening locally. Files are private with expiring access links.</p></div>
   {staff&&<section className="mb-6 space-y-3 rounded-xl border p-5"><h2 className="font-semibold"><Upload className="mr-2 inline size-4"/>Upload teaching material</h2>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-sm font-medium">Your module<select disabled={busy||loading||!!error} value={moduleId} onChange={e=>setModuleId(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2"><option value="">Choose module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm font-medium">Link to an individual class
      <select className="mt-1 min-h-11 w-full rounded-md border bg-background px-3"
       value={classSessionId} onChange={e=>{setClassSessionId(e.target.value);setPreparatoryOnly(false);}} disabled={busy||loading||!moduleId}>
       <option value="">No class — preparatory resource only</option>
       {classes.filter(c=>c.module_id===moduleId).map(c=><option key={c.id} value={c.id}>{c.title} · {new Date(c.ends_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}</option>)}
      </select>
     </label>
     {!classSessionId&&<label className="flex items-start gap-2 text-sm"><input type="checkbox"
      checked={preparatoryOnly} onChange={e=>setPreparatoryOnly(e.target.checked)}/>
      This is an independent preparatory/accessibility resource, not notes, slides, whiteboards or recordings from a particular class.</label>}
     <label className="text-sm font-medium">Material type<select disabled={busy||loading||!!error} value={kind} onChange={e=>setKind(e.target.value as (typeof kinds)[number])} className="mt-1 w-full rounded-md border bg-background p-2">{kinds.map(k=><option key={k}>{k}</option>)}</select></label>
     <label className="text-sm font-medium">Title<Input disabled={busy||loading||!!error} className="mt-1" value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label>
     <label className="text-sm font-medium">Private file (25 MB maximum)<Input disabled={busy||loading||!!error} className="mt-1" type="file" accept=".pdf,.pptx,.docx,.xlsx,.jpg,.png,.mp4,.txt" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    </div>
    <label className="flex items-start gap-3 rounded-lg border bg-secondary/30 p-3 text-sm">
     <input className="mt-1 size-4 shrink-0" type="checkbox" checked={rightsAcknowledged} disabled={busy||loading} onChange={e=>setRightsAcknowledged(e.target.checked)} aria-label="Confirm teaching material distribution rights"/>
     <span>I confirm this is original UniPathway teaching content or material I am permitted to distribute privately to enrolled students. Official question papers, mark schemes, publisher textbooks or licensed materials require the rights holder's terms to permit this upload. This acknowledgement is not a recorded licence or an approval by the awarding body.</span>
    </label>
    <Button disabled={busy||loading||!!error||!tenant||!modules.length||!rightsAcknowledged||!classReleaseEnabled||(!classSessionId&&!preparatoryOnly)} onClick={upload}>Save secure draft</Button>
   </section>}
   {materialFilter&&<div className="mb-4 rounded-lg border p-3 text-sm"><p>Showing the material selected in search.</p><Link className="underline" to={`?${new URLSearchParams(moduleFilter?{module:moduleFilter}:{})}`}>Show all module materials</Link>{!loading&&!error&&!items.some(m=>m.id===materialFilter)&&<p role="status">This material is no longer available to your account. It may have been withdrawn or your assignment may have changed.</p>}</div>}
   <div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Search materials<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Title, module, type or status"/></label><Button variant="outline" disabled={busy||loading} onClick={reload}>Refresh materials</Button></div>
   {loading&&<p role="status">Loading your authorised modules…</p>}
   {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}</p>}
   {!loading&&!error&&filtered.length===0&&<p className="rounded-xl border p-6 text-sm text-muted-foreground">{search?'No materials match your search.':staff?'No materials are available for your assigned modules yet.':'No released materials are available for your active modules yet.'}</p>}
   {!loading&&!error&&<div className="space-y-3">{filtered.slice(page*20,page*20+20).map(m=><article key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><BookOpen className="size-4"/>{m.title}</h3>
     <p className="mt-1 text-xs text-muted-foreground">{modules.find(x=>x.id===m.module_id)?.title||'Module'} · {m.kind} · {m.publication_status}{m.class_session_id?' · Class-linked: 24h/12h release':' · Preparatory / general resource'}</p></div>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy||!classReleaseEnabled} onClick={()=>download(m)}><Download className="mr-1 size-4"/>Open</Button>
      {!staff&&m.publication_status==='published'&&<Button size="sm" variant="outline" disabled={busy||!classReleaseEnabled} onClick={()=>void saveOffline(m)}>Save offline</Button>}
      {staff&&m.publication_status==='draft'&&<Button size="sm" disabled={busy||!classReleaseEnabled} onClick={()=>publish(m)}>Publish</Button>}</div>
   </article>)}</div>}
   {!loading&&!error&&filtered.length>20&&<nav aria-label="Material pages" className="mt-4 flex items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous materials</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button variant="outline" disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next materials</Button></nav>}
 </DashboardLayout>;
}
