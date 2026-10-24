import {useSearchParams} from 'react-router-dom';
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

type Material={id:string;module_id:string;title:string;kind:string;object_path:string;publication_status:string;available_at:string|null;created_at:string};
type Module={id:string;title:string;lecturer_id:string|null;tenant_id:string;programme_id:string};
const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
const kinds=['slide','worksheet','reading','homework','video','whiteboard'] as const;
const accepted=['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','video/mp4','text/plain'];
export default function ModuleMaterials(){const {user}=useAuth();const [params]=useSearchParams();const filter=params.get('module')||'';return <MaterialsWorkspace key={`${user?.id}:${user?.tenantId}:${user?.roles.join(',')}:${filter}`} moduleFilter={filter}/>;}
function MaterialsWorkspace({moduleFilter}:{moduleFilter:string}){
 const {user}=useAuth();
 const [tenant,setTenant]=useState<string|null>(user?.tenantId||null);
 const [modules,setModules]=useState<Module[]>([]),[items,setItems]=useState<Material[]>([]);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [moduleId,setModuleId]=useState(moduleFilter),[kind,setKind]=useState<(typeof kinds)[number]>('reading');
 const [title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null);
 const [refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 const mounted=useRef(true),operation=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const staff=!!user?.roles.some(x=>['lecturer','programme_leader','centre_director','superadmin'].includes(x));
 const manager=!!user?.roles.some(x=>['centre_director','programme_leader','superadmin'].includes(x));
 const uid=user?.id;
 const reload=()=>{setItems([]);setModules([]);setLoading(true);setError('');setPage(0);setRefresh(x=>x+1);};
 useEffect(()=>{
  let active=true;setItems([]);setModules([]);setLoading(true);setError('');setPage(0);
  void (async()=>{try{
   let centre=user?.tenantId;
   if(!centre&&user?.roles.includes('superadmin')){
    const r=await db.from('tenants').select('id').eq('slug','unipathway').maybeSingle();
    if(r.error)throw Error('Centre could not be verified.');centre=r.data?.id;
   }
   if(!active)return;
   if(!uid||!centre)throw Error('An authorised centre and account are required.');
   setTenant(centre);
   const queryModules=()=>{let q=db.from('modules').select('id,title,lecturer_id,tenant_id,programme_id').eq('tenant_id',centre);if(moduleFilter)q=q.eq('id',moduleFilter);if(staff&&!manager)q=q.eq('lecturer_id',uid);return q;};
   const [all,enrolments]=await Promise.all([
    pagedRows<Module>(queryModules,()=>active),
    staff?Promise.resolve([]):pagedRows<{programme_id:string}>(()=>db.from('student_enrolments').select('id,programme_id').eq('tenant_id',centre).eq('student_id',uid).eq('status','active'),()=>active),
   ]);
   const eligible=new Set(enrolments.map(e=>e.programme_id));
   const visible=all.filter(m=>staff||eligible.has(m.programme_id)).sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
   const materials=await rowsByIds<Material>(visible.map(m=>m.id),ids=>()=>db.from('unipathway_module_materials').select('id,module_id,title,kind,object_path,publication_status,available_at,created_at').eq('tenant_id',centre).in('module_id',ids),()=>active);
   if(!active)return;
   setModules(visible);setItems(materials.filter(m=>staff||(m.publication_status==='published'&&(!m.available_at||Date.parse(m.available_at)<=Date.now()))).sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id)));
  }catch{if(active){setItems([]);setModules([]);setError('Your materials could not be verified. Refresh to retry, or contact your centre if this continues.');}}
  finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 // The workspace key resets all account, role and module scope; refresh reruns the complete read.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[refresh]);
 const filtered=items.filter(m=>`${m.title} ${m.kind} ${m.publication_status} ${modules.find(x=>x.id===m.module_id)?.title||''}`.toLowerCase().includes(search.toLowerCase()));
 const download=async(m:Material)=>{
  if(operation.current||loading)return;operation.current=true;setBusy(true);
  try{const {data,error:e}=await supabase.storage.from('unipathway-module-materials').createSignedUrl(m.object_path,120);
   if(!mounted.current)return;if(e||!data?.signedUrl)throw Error('Unavailable');
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }catch{if(mounted.current)toast.error('File not available to this account. Refresh materials and retry.');}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 const upload=async()=>{
  if(operation.current||loading||error)return;
  const module=modules.find(m=>m.id===moduleId);
  if(!staff||!tenant||!user||!module||!file||!title.trim()){toast.error('Choose an assigned module, title and file.');return;}
  if(!file.size||file.size>25*1024*1024||!accepted.includes(file.type)){toast.error('Choose a supported, non-empty file up to 25 MB.');return;}
  const path=`${tenant}/${module.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  operation.current=true;setBusy(true);
  try{
   const result=await supabase.storage.from('unipathway-module-materials').upload(path,file,{contentType:file.type,upsert:false});
   if(!mounted.current)return;if(result.error)throw result.error;
   const saved=await db.from('unipathway_module_materials').insert({tenant_id:tenant,module_id:module.id,created_by:user.id,title:title.trim(),kind,object_path:path,publication_status:'draft'}).select('id').single();
   if(!mounted.current)return;
   if(saved.error||!saved.data?.id)throw Error('Save unconfirmed');
   setFile(null);setTitle('');toast.success('Private draft saved. Publish it for enrolled learners.');reload();
  }catch{if(mounted.current){toast.error('Draft save could not be confirmed. Refresh and check your drafts before retrying.');reload();}}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 const publish=async(m:Material)=>{
  if(!staff||operation.current||loading||error)return;operation.current=true;setBusy(true);
  try{
   const r=await db.from('unipathway_module_materials').update({publication_status:'published',available_at:new Date().toISOString()}).eq('id',m.id).eq('tenant_id',tenant).eq('publication_status','draft').select('id').single();
   if(!mounted.current)return;if(r.error||r.data?.id!==m.id)throw Error('Release unconfirmed');
   toast.success('Material released to enrolled learners.');reload();
  }catch{if(mounted.current){toast.error('Release could not be confirmed. Refresh and check its status before retrying.');reload();}}
  finally{operation.current=false;if(mounted.current)setBusy(false);}
 };
 return <DashboardLayout title="Course materials and homework" subtitle="Module-based permissions for enrolled students and allocated lecturers">
   <ModuleJourney moduleId={moduleFilter} teacher={staff}/>
   <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Protected academic materials</h2>
    <p className="mt-2 text-sm text-muted-foreground">Unpublished resources are visible only to authorised teaching staff. Released material appears only for students actively enrolled in the module's programme. Lessons, reading notes, slides and homework are grouped by your enrolled module. PDFs, images and supported videos can open in the browser; Office files may download for opening locally. Files are private with expiring access links.</p></div>
   {staff&&<section className="mb-6 space-y-3 rounded-xl border p-5"><h2 className="font-semibold"><Upload className="mr-2 inline size-4"/>Upload teaching material</h2>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-sm font-medium">Your module<select disabled={busy||loading||!!error} value={moduleId} onChange={e=>setModuleId(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2"><option value="">Choose module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm font-medium">Material type<select disabled={busy||loading||!!error} value={kind} onChange={e=>setKind(e.target.value as (typeof kinds)[number])} className="mt-1 w-full rounded-md border bg-background p-2">{kinds.map(k=><option key={k}>{k}</option>)}</select></label>
     <label className="text-sm font-medium">Title<Input disabled={busy||loading||!!error} className="mt-1" value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label>
     <label className="text-sm font-medium">Private file (25 MB maximum)<Input disabled={busy||loading||!!error} className="mt-1" type="file" accept=".pdf,.pptx,.docx,.xlsx,.jpg,.png,.mp4,.txt" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    </div><Button disabled={busy||loading||!!error||!tenant||!modules.length} onClick={upload}>Save secure draft</Button>
   </section>}
   <div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Search materials<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Title, module, type or status"/></label><Button variant="outline" disabled={busy||loading} onClick={reload}>Refresh materials</Button></div>
   {loading&&<p role="status">Loading your authorised modules…</p>}
   {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}</p>}
   {!loading&&!error&&filtered.length===0&&<p className="rounded-xl border p-6 text-sm text-muted-foreground">{search?'No materials match your search.':staff?'No materials are available for your assigned modules yet.':'No released materials are available for your active modules yet.'}</p>}
   {!loading&&!error&&<div className="space-y-3">{filtered.slice(page*20,page*20+20).map(m=><article key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><BookOpen className="size-4"/>{m.title}</h3>
     <p className="mt-1 text-xs text-muted-foreground">{modules.find(x=>x.id===m.module_id)?.title||'Module'} · {m.kind} · {m.publication_status}</p></div>
    <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>download(m)}><Download className="mr-1 size-4"/>Open</Button>
      {staff&&m.publication_status==='draft'&&<Button size="sm" disabled={busy} onClick={()=>publish(m)}>Publish</Button>}</div>
   </article>)}</div>}
   {!loading&&!error&&filtered.length>20&&<nav aria-label="Material pages" className="mt-4 flex items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous materials</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button variant="outline" disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next materials</Button></nav>}
 </DashboardLayout>;
}
