import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, GraduationCap, MapPin, Search, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Opportunity={id:string;tenant_id:string;employer_display_name:string;title:string;opportunity_type:string;city:string|null;country:string;remote:boolean;role_description:string;safety_requirements:string|null;stipend_details:string|null;application_deadline:string|null;status:string};
type Application={id:string;opportunity_id:string;status:string;created_at:string};
export default function CareerMarketplace(){
 const {user}=useAuth();const tenant=user?.tenantId;
 const [jobs,setJobs]=useState<Opportunity[]>([]),[applications,setApplications]=useState<Application[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[search,setSearch]=useState('');
 const [selected,setSelected]=useState(''),[statement,setStatement]=useState(''),[consent,setConsent]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError('');setJobs([]);setApplications([]);
  if(!tenant||!user){setError('A confirmed student account and centre assignment are required.');setLoading(false);return;}
  try{
   const [o,a]=await Promise.all([
    db.from('unipathway_employer_opportunities').select('id,tenant_id,employer_display_name,title,opportunity_type,city,country,remote,role_description,safety_requirements,stipend_details,application_deadline,status').eq('tenant_id',tenant).eq('status','published').order('created_at',{ascending:false}),
    db.from('unipathway_employer_applications').select('id,opportunity_id,status,created_at').eq('tenant_id',tenant).eq('student_id',user.id),
   ]);
   if(o.error||a.error)throw new Error('The verified employer opportunities backend is not ready on the connected Lovable Supabase. No unverified vacancies are being displayed; ask admissions for support.');
   setJobs((o.data||[]) as Opportunity[]);setApplications((a.data||[]) as Application[]);
  }catch(e){setError(e instanceof Error?e.message:'Opportunities could not be loaded.');}
  finally{setLoading(false);}
 },[tenant,user,refresh]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>jobs.filter(o=>
  `${o.title} ${o.employer_display_name} ${o.city||''} ${o.country} ${o.opportunity_type}`.toLowerCase().includes(search.trim().toLowerCase())
 ),[jobs,search]);
 const existing=new Set(applications.map(a=>a.opportunity_id));
 async function apply(){
  if(!user||!tenant||!selected||!consent||statement.trim().length<20){setError('Choose an open opportunity, add at least 20 characters explaining your interest and agree to share this application with the verified employer.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const r=await db.from('unipathway_employer_applications').insert({
    tenant_id:tenant,opportunity_id:selected,student_id:user.id,
    applicant_consent_at:new Date().toISOString(),statement:statement.trim(),status:'submitted',
   });
   if(r.error)throw r.error;
   setNotice('Application submitted for centre-controlled recruitment review. An application does not guarantee placement.');
   setSelected('');setStatement('');setConsent(false);setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Could not submit the application.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Verified Careers & Internships" subtitle="Tenant-scoped vacancies and student-consented applications">
   <div className="space-y-6">
    <section className="rounded-xl border bg-card p-5"><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Verified opportunities only</h2><p className="mt-2 text-sm text-muted-foreground">Only vacancies published after centre review and employer identity checks are eligible. Your full student file is not shared with recruiters. Only information you explicitly submit for a chosen vacancy can be accessed by its verified employer members.</p>
      {loading&&<p className="mt-3 text-sm" role="status">Checking available verified roles…</p>}{error&&<p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}{notice&&<p className="mt-3 text-sm text-success" role="status">{notice}</p>}<Button variant="outline" className="mt-3" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Refresh</Button>
    </section>
    {!loading&&!error&&<><section className="grid gap-3 md:grid-cols-3">{[
       {label:'Published roles',value:jobs.length},{label:'Internships',value:jobs.filter(j=>j.opportunity_type==='internship').length},{label:'My applications',value:applications.length},
    ].map(x=><div key={x.label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{x.label}</p><p className="mt-2 text-2xl font-bold">{x.value}</p></div>)}</section>
    <label htmlFor="opportunity-search" className="block max-w-lg text-sm font-semibold"><Search className="mr-1 inline size-4"/>Search approved vacancies<Input id="opportunity-search" className="mt-1" value={search} onChange={e=>setSearch(e.target.value)} placeholder="QA, accountant, Islamabad…"/></label>
    {!jobs.length&&<div className="rounded-xl border bg-secondary/40 p-7"><BriefcaseBusiness className="size-7 text-success"/><h3 className="mt-2 text-lg font-bold">No verified vacancies are open yet</h3><p className="mt-2 text-sm text-muted-foreground">Our employer network is being developed. This is not a hidden jobs list: a role will only appear when its employer, duties, safety and approval have been verified.</p></div>}
    <div className="grid gap-4 lg:grid-cols-2">{filtered.map(o=><article key={o.id} className="rounded-xl border bg-card p-6"><p className="text-xs font-bold uppercase text-success">{o.opportunity_type.replace(/_/g,' ')}</p><h3 className="mt-2 text-xl font-bold">{o.title}</h3><p className="mt-2 text-sm text-muted-foreground">{o.employer_display_name||'Verified employer'} · {o.city||o.country}{o.remote?' · Remote':''}</p><p className="mt-3 text-sm">{o.role_description}</p>{o.safety_requirements&&<p className="mt-3 text-xs text-muted-foreground">Requirements: {o.safety_requirements}</p>}{o.stipend_details&&<p className="mt-2 text-xs text-muted-foreground">Stipend/pay information: {o.stipend_details}</p>}{o.application_deadline&&<p className="mt-2 text-xs text-muted-foreground">Advertised deadline: {o.application_deadline}</p>}{existing.has(o.id)?<p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="size-4"/>Application already submitted</p>:<Button variant="outline" className="mt-5" onClick={()=>{setSelected(o.id);setStatement('');setConsent(false);}}>Apply with consent</Button>}</article>)}</div>
    {selected&&<section className="rounded-xl border bg-secondary/40 p-6"><GraduationCap className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Apply for the selected opportunity</h2><p className="mt-2 text-sm text-muted-foreground">This shares your applicant ID and statement with authorised staff and verified members of the selected employer only. Your general education file, health records and financial details are not part of this application.</p><label className="mt-4 block text-sm font-semibold">Why are you suitable?<Textarea className="mt-1" maxLength={2000} value={statement} onChange={e=>setStatement(e.target.value)} placeholder="Relevant skills, availability and learning goals…"/></label><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to share this application statement and my applicant identifier with the verified employer for this vacancy. I can ask the admissions team about my privacy and withdrawal rights.</span></label><Button className="mt-4" disabled={busy||!consent} onClick={()=>void apply()}>{busy?'Submitting…':'Submit application'}</Button></section>}
   </>}
   </div>
 </DashboardLayout>;
}
