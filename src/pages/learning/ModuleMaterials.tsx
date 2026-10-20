import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BookOpen, Download, ShieldCheck, Upload } from 'lucide-react';

type Material={id:string;module_id:string;title:string;kind:string;object_path:string;publication_status:string;available_at:string|null};
type Module={id:string;title:string;lecturer_id:string|null;tenant_id:string;programme_id:string};
const safeName=(value:string)=>value.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
const kinds=['slide','worksheet','reading','homework','video','whiteboard'] as const;
const accepted=['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','video/mp4','text/plain'];
export default function ModuleMaterials(){
 const {user}=useAuth();
 const [tenant,setTenant]=useState<string|null>(user?.tenantId||null);
 const [modules,setModules]=useState<Module[]>([]);const [items,setItems]=useState<Material[]>([]);
 const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 const [moduleId,setModuleId]=useState('');const [kind,setKind]=useState<(typeof kinds)[number]>('reading');
 const [title,setTitle]=useState('');const [file,setFile]=useState<File|null>(null);
 const staff=!!user?.roles.some(x=>['lecturer','programme_leader','centre_director','superadmin'].includes(x));
 useEffect(()=>{if(user?.tenantId){setTenant(user.tenantId);return;}if(user?.roles.includes('superadmin')){
   void db.from('tenants').select('id').eq('slug','unipathway').maybeSingle().then(({data})=>setTenant(data?.id||null));
 }},[user?.tenantId,user?.roles.join('|')]);
 const reload=async()=>{if(!tenant){setError('Approved centre tenant is missing.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [m,materials,enrolments]=await Promise.all([
    db.from('modules').select('id,title,lecturer_id,tenant_id,programme_id').eq('tenant_id',tenant).order('title'),
    db.from('unipathway_module_materials').select('id,module_id,title,kind,object_path,publication_status,available_at').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(300),
    staff?Promise.resolve({data:[],error:null}):
      db.from('student_enrolments').select('programme_id').eq('tenant_id',tenant)
        .eq('student_id',user?.id).eq('status','active')
   ]);
   if(m.error||materials.error||enrolments.error)throw Error(m.error?.message||materials.error?.message||enrolments.error?.message||'Materials unavailable');
   const all=(m.data||[]) as Module[];
   const isManager=staff&&!!user?.roles.some(x=>['centre_director','programme_leader','superadmin'].includes(x));
   const eligibleProgrammes=new Set<string>((enrolments.data||[]).map((e:{programme_id:string})=>e.programme_id));
   const visibleModules=isManager?all:staff?all.filter(x=>x.lecturer_id===user?.id):
     all.filter(x=>eligibleProgrammes.has(x.programme_id));
   const visibleIds=new Set(visibleModules.map(x=>x.id));
   setModules(visibleModules);
   setItems(((materials.data||[]) as Material[]).filter(m=>visibleIds.has(m.module_id) &&
     (staff||(m.publication_status==='published'&&(!m.available_at||new Date(m.available_at).getTime()<=Date.now())))));
  }catch(e){setError(e instanceof Error?e.message:'Materials unavailable');setItems([]);}finally{setLoading(false);}
 };
 useEffect(()=>{if(user?.id&&tenant)void reload();},[user?.id,tenant,staff]);
 const download=async(m:Material)=>{
  setBusy(true);
  const {data,error:e}=await supabase.storage.from('unipathway-module-materials').createSignedUrl(m.object_path,120);
  setBusy(false);
  if(e||!data?.signedUrl){toast.error('File not available to this account.');return;}
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
 };
 const upload=async()=>{
  const module=modules.find(m=>m.id===moduleId);
  if(!tenant||!user||!module||!file||!title.trim()){toast.error('Choose an assigned module, title and file.');return;}
  if(file.size>25*1024*1024||!accepted.includes(file.type)){toast.error('File type not allowed, or larger than 25 MB.');return;}
  const path=`${tenant}/${module.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  setBusy(true);
  const {error:e}=await supabase.storage.from('unipathway-module-materials').upload(path,file,{contentType:file.type,upsert:false});
  if(e){setBusy(false);toast.error('Private upload rejected: '+e.message);return;}
  const {error:saveErr}=await db.from('unipathway_module_materials').insert({
   tenant_id:tenant,module_id:module.id,created_by:user.id,title:title.trim(),kind,object_path:path,publication_status:'draft'
  });
  if(saveErr){
   await supabase.storage.from('unipathway-module-materials').remove([path]);
   setBusy(false);toast.error('Metadata save rejected: '+saveErr.message);return;
  }
  setFile(null);setTitle('');setBusy(false);toast.success('Private draft saved. Publish it for enrolled learners.');
  await reload();
 };
 const publish=async(m:Material)=>{
  if(!staff)return;
  setBusy(true);
  const {error:e}=await db.from('unipathway_module_materials').update({publication_status:'published',available_at:new Date().toISOString()}).eq('id',m.id);
  setBusy(false);
  if(e){toast.error('Material release denied: '+e.message);return;}
  toast.success('Material released to enrolled learners.');await reload();
 };
 return <DashboardLayout title="Course materials and homework" subtitle="Module-based permissions for enrolled students and allocated lecturers">
   <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Protected academic materials</h2>
    <p className="mt-2 text-sm text-muted-foreground">Unpublished resources are visible only to authorised teaching staff. Released material appears only for students actively enrolled in the module's programme. Lessons, reading notes, slides and homework are grouped by your enrolled module. PDFs, images and supported videos can open in the browser; Office files may download for opening locally. Files are private with expiring access links.</p></div>
   {staff&&<section className="mb-6 space-y-3 rounded-xl border p-5"><h2 className="font-semibold"><Upload className="mr-2 inline size-4"/>Upload teaching material</h2>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-sm font-medium">Your module<select value={moduleId} onChange={e=>setModuleId(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2"><option value="">Choose module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm font-medium">Material type<select value={kind} onChange={e=>setKind(e.target.value as (typeof kinds)[number])} className="mt-1 w-full rounded-md border bg-background p-2">{kinds.map(k=><option key={k}>{k}</option>)}</select></label>
     <label className="text-sm font-medium">Title<Input className="mt-1" value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label>
     <label className="text-sm font-medium">Private file (25 MB maximum)<Input className="mt-1" type="file" accept=".pdf,.pptx,.docx,.xlsx,.jpg,.png,.mp4,.txt" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    </div><Button disabled={busy||!tenant} onClick={upload}>Save secure draft</Button>
   </section>}
   {loading&&<p role="status">Loading your authorised modules…</p>}
   {error&&<p role="alert" className="rounded-lg border border-destructive p-4">Module materials unavailable: {error}. Database migrations and role scope must be verified before use.</p>}
   {!loading&&!error&&items.length===0&&<p className="rounded-xl border p-6 text-sm text-muted-foreground">There are no published notes, slides or assignments for your active modules yet.</p>}
   {!loading&&!error&&<div className="space-y-3">{items.map(m=><article key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
    <div><h3 className="flex items-center gap-2 font-semibold"><BookOpen className="size-4"/>{m.title}</h3>
     <p className="mt-1 text-xs text-muted-foreground">{modules.find(x=>x.id===m.module_id)?.title||'Module'} · {m.kind} · {m.publication_status}</p></div>
    <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>download(m)}><Download className="mr-1 size-4"/>Open</Button>
      {staff&&m.publication_status==='draft'&&<Button size="sm" disabled={busy} onClick={()=>publish(m)}>Publish</Button>}</div>
   </article>)}</div>}
 </DashboardLayout>;
}
