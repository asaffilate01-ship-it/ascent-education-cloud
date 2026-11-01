import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Building2,ExternalLink,RefreshCw,ShieldCheck} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';

type Centre={
 id:string;name:string;slug:string;brand_name:string|null;status:string;plan:string;
 primary_color:string|null;accent_color:string|null;custom_domain:string|null;
 students_count:number|null;monthly_revenue:number|null;updated_at:string;
};
const slugRegex=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reserved=new Set(['admin','api','auth','login','student','students','www','dev','support','email','mail','tenant','centre','centres','portal','unipathway']);
export function validCentreSlug(slug:string){return slug.length>=3&&slug.length<=60&&slugRegex.test(slug)&&!reserved.has(slug);}
export function centrePublicUrl(slug:string){return slug==='unipathway'?'https://unipathway.pk/':`https://unipathway.pk/tenant/${encodeURIComponent(slug)}`;}
export default function CentreDirectory(){
 const {user}=useAuth();
 return <CentreWorkspace key={[user?.id,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function CentreWorkspace(){
 const {user}=useAuth();
 const allowed=Boolean(user?.id&&user.role==='superadmin'&&user.roles?.includes('superadmin'));
 const [centres,setCentres]=useState<Centre[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0),[query,setQuery]=useState('');
 const [createOpen,setCreateOpen]=useState(false),[editId,setEditId]=useState('');
 const [name,setName]=useState(''),[slug,setSlug]=useState(''),[plan,setPlan]=useState<'starter'|'professional'|'enterprise'>('starter');
 const [brand,setBrand]=useState(''),[primary,setPrimary]=useState('#0B2D5B'),[accent,setAccent]=useState('#D4A853');
 const [feedback,setFeedback]=useState('');
 const reset=()=>{setName('');setSlug('');setPlan('starter');setBrand('');setPrimary('#0B2D5B');setAccent('#D4A853');};
 useEffect(()=>{
  let active=true;setCentres([]);setError('');setLoading(true);
  if(!allowed){setLoading(false);return()=>{active=false;};}
  void(async()=>{
   try{
    const {data,error:loadError}=await supabase.from('tenants')
     .select('id,name,slug,brand_name,status,plan,primary_color,accent_color,custom_domain,students_count,monthly_revenue,updated_at')
     .order('name',{ascending:true});
    if(loadError||!Array.isArray(data))throw Error('Centre inventory could not be verified.');
    if(active)setCentres(data as Centre[]);
   }catch{if(active){setCentres([]);setError('Centre records are unavailable. No totals or changes can be confirmed until they load.');}}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[allowed,revision]);
 const shown=useMemo(()=>centres.filter(c=>[c.name,c.slug,c.brand_name||'',c.status,c.plan]
  .some(s=>s.toLowerCase().includes(query.trim().toLowerCase()))),[centres,query]);
 function startEdit(c:Centre){setEditId(c.id);setCreateOpen(false);setName(c.name);setBrand(c.brand_name||c.name);
  setPrimary(c.primary_color||'#0B2D5B');setAccent(c.accent_color||'#D4A853');setFeedback('');}
 async function create(event:React.FormEvent){
  event.preventDefault();if(!allowed||busy)return;
  const clean=name.trim(),normal=slug.trim().toLowerCase();
  if(clean.length<2||clean.length>120||!validCentreSlug(normal)){
   setFeedback('Enter a centre name (2–120 characters) and a unique safe reference (3–60 lowercase letters, numbers and hyphens).');return;
  }
  setBusy(true);setFeedback('');
  try{
   const {data,error:e}=await supabase.from('tenants').insert({
    name:clean,slug:normal,brand_name:brand.trim()||clean,plan,status:'onboarding',
    primary_color:primary,accent_color:accent,
   }).select('id,slug,status').single();
   if(e||!data?.id||data.slug!==normal||data.status!=='onboarding')throw Error('Centre creation not confirmed. Check existing centres before retrying.');
   setCreateOpen(false);reset();setFeedback('Centre record created in onboarding. Assign the director and complete compliance checks before launch.');setRevision(v=>v+1);
  }catch(e){setFeedback(e instanceof Error?e.message:'Centre record could not be created.');}
  finally{setBusy(false);}
 }
 async function save(event:React.FormEvent){
  event.preventDefault();if(!allowed||busy||!editId)return;
  const original=centres.find(c=>c.id===editId);if(!original)return;
  if(name.trim().length<2||name.trim().length>120||!brand.trim()||brand.trim().length>120){
   setFeedback('Enter valid centre and display names of at most 120 characters.');return;
  }
  setBusy(true);setFeedback('');
  try{
   const {data,error:e}=await supabase.from('tenants')
    .update({name:name.trim(),brand_name:brand.trim(),primary_color:primary,accent_color:accent})
    .eq('id',original.id).eq('updated_at',original.updated_at)
    .select('id,updated_at').maybeSingle();
   if(e||data?.id!==original.id)throw Error('Save could not be verified. The centre may have been changed elsewhere; refresh and review again.');
   setEditId('');reset();setFeedback('Centre name and branding confirmed in UniPathway database. Status, plan, slug and DNS were unchanged.');setRevision(v=>v+1);
  }catch(e){setFeedback(e instanceof Error?e.message:'Centre edit was not confirmed.');}
  finally{setBusy(false);}
 }
 if(!allowed)return <DashboardLayout title="Platform owner · Centre management"><section role="alert" className="rounded-xl border p-6">An active, assigned Platform Owner / Super Admin role is required. Centre directors cannot create, edit or remove other centres.</section></DashboardLayout>;
 return <DashboardLayout title="Platform owner · Centre management" subtitle="Verified centre records, creation, editable branding, and controlled lifecycle status">
  <div className="space-y-6">
   <section className="rounded-2xl border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
     <div className="max-w-2xl space-y-2">
      <h2 className="text-lg font-semibold">Centres and operational boundaries</h2>
      <p className="text-sm text-muted-foreground">Create centre records in onboarding or update centre names and branding. A centre reference is a URL path under <strong>unipathway.pk</strong>, not a DNS subdomain. The onboarding record does not automatically invite a director or activate courses.</p>
     </div>
     <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw className="mr-2 size-4"/>Refresh</Button>
      <Button disabled={busy||loading||!!error} onClick={()=>{setEditId('');reset();setFeedback('');setCreateOpen(p=>!p);}}><Building2 className="mr-2 size-4"/>New centre record</Button>
     </div>
    </div>
    <p className="mt-4 rounded-lg border p-3 text-sm"><ShieldCheck className="mr-2 inline size-4"/>
      <strong>Deletion is disabled.</strong> Existing centres may own enrolments, payments, results, safeguarding records or staff. Administrative `suspended` status alone has not been verified to revoke user access. Full archive/suspension requires a separate server-enforced, audited lifecycle rollout.
    </p>
   </section>
   {feedback&&<p role="status" className="rounded-lg border bg-card p-3">{feedback}</p>}
   {createOpen&&<section className="rounded-xl border bg-card p-5" aria-labelledby="centre-create-title">
    <h2 id="centre-create-title" className="font-semibold">Create an onboarding centre record</h2>
    <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
     <label className="text-sm font-medium">Centre name<Input className="mt-1" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label className="text-sm font-medium">Centre reference (not a domain)<Input className="mt-1" required maxLength={60} value={slug} onChange={e=>setSlug(e.target.value.toLowerCase())} placeholder="jhelum-learning-centre"/></label>
     <p className="sm:col-span-2 break-all rounded-lg bg-secondary p-3 text-sm">Public path: {validCentreSlug(slug)?centrePublicUrl(slug):'https://unipathway.pk/tenant/your-centre-reference'}</p>
     <label className="text-sm font-medium">Display name<Input className="mt-1" maxLength={120} value={brand} onChange={e=>setBrand(e.target.value)}/></label>
     <label className="text-sm font-medium">Recorded plan (does not provision billing)
      <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={plan} onChange={e=>setPlan(e.target.value as typeof plan)}>
       <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
      </select>
     </label>
     <label className="text-sm font-medium">Primary brand colour<Input type="color" className="mt-1 h-11 w-24" value={primary} onChange={e=>setPrimary(e.target.value)}/></label>
     <label className="text-sm font-medium">Accent brand colour<Input type="color" className="mt-1 h-11 w-24" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
     <div className="flex flex-wrap gap-2 sm:col-span-2">
      <Button type="submit" disabled={busy}>{busy?'Saving…':'Create onboarding record'}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={()=>setCreateOpen(false)}>Cancel</Button>
     </div>
    </form>
   </section>}
   {editId&&<section className="rounded-xl border bg-card p-5" aria-labelledby="centre-edit-title">
    <h2 id="centre-edit-title" className="font-semibold">Edit centre name and branding</h2>
    <p className="mt-2 text-sm text-muted-foreground">This does not change the immutable reference slug, account memberships, subscriptions, DNS, formal licence, billing or status.</p>
    <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
     <label className="text-sm font-medium">Centre name<Input className="mt-1" required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label className="text-sm font-medium">Public display name<Input className="mt-1" required maxLength={120} value={brand} onChange={e=>setBrand(e.target.value)}/></label>
     <label className="text-sm font-medium">Primary colour<Input className="mt-1 h-11 w-24" type="color" value={primary} onChange={e=>setPrimary(e.target.value)}/></label>
     <label className="text-sm font-medium">Accent colour<Input className="mt-1 h-11 w-24" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
     <div className="flex gap-2 sm:col-span-2">
      <Button type="submit" disabled={busy}>{busy?'Saving…':'Confirm centre changes'}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={()=>setEditId('')}>Cancel</Button>
     </div>
    </form>
   </section>}
   <section className="rounded-xl border bg-card p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <h2 className="font-semibold">Verified centre directory</h2>
     <label className="text-sm">Find centre
      <Input value={query} onChange={e=>setQuery(e.target.value)} maxLength={120} placeholder="Centre name, reference or status" className="mt-1"/>
     </label>
    </div>
    {loading&&<p role="status">Verifying platform centre records…</p>}
    {error&&<div role="alert">{error}<Button variant="outline" className="ml-3" onClick={()=>setRevision(v=>v+1)}>Retry</Button></div>}
    {!loading&&!error&&<p role="status" className="text-sm text-muted-foreground">{shown.length} of {centres.length} centres shown · {centres.filter(c=>c.status==='onboarding').length} in onboarding</p>}
    {!loading&&!error&&!shown.length&&<p className="rounded-lg border p-4 text-sm">No centres match these filters.</p>}
    {!loading&&!error&&<div className="grid gap-3 lg:grid-cols-2">
     {shown.map(c=><article key={c.id} className="min-w-0 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0">
        <h3 className="font-semibold">{c.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Reference: {c.slug} · {c.plan} plan (recorded)</p>
        <p className="mt-1 text-xs text-muted-foreground">Status: {c.status} · {c.students_count||0} reported students</p>
       </div>
       <span className="rounded-full border px-3 py-1 text-xs">{c.status}</span>
      </div>
      <p className="mt-3 break-all text-sm text-muted-foreground">{centrePublicUrl(c.slug)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{c.custom_domain?'Recorded domain: '+c.custom_domain:'Custom domain not verified'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
       <Button variant="outline" size="sm" onClick={()=>startEdit(c)}>Edit name &amp; branding</Button>
       <a className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm hover:bg-accent" href={centrePublicUrl(c.slug)} target="_blank" rel="noopener noreferrer">Public page <ExternalLink className="ml-2 size-3.5"/></a>
      </div>
      {c.status==='onboarding'&&<p className="mt-3 text-xs text-muted-foreground">Onboarding is not launch readiness; invite the director through verified staff setup and complete compliance checks.</p>}
     </article>)}
    </div>}
   </section>
   <section className="rounded-xl border bg-card p-5">
    <h2 className="font-semibold">Manage other platform operations</h2>
    <div className="mt-3 flex flex-wrap gap-2">
     {[
      {to:'/landlord/users',label:'Staff directory'},
      {to:'/landlord/readiness',label:'Go-live evidence'},
      {to:'/landlord/finance',label:'Financial records'},
      {to:'/landlord/audit',label:'Activity audit'},
      {to:'/landlord/course-content',label:'Course catalogue'}
     ].map(x=><Link key={x.to} to={x.to} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-accent">{x.label}</Link>)}
    </div>
   </section>
  </div>
 </DashboardLayout>;
}
