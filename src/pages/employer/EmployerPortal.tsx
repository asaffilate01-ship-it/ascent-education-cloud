import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, ClipboardCheck, FileCheck2, ShieldCheck, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Membership={organisation_id:string;unipathway_employer_organisations:{name:string;sector:string;status:string}|null};
type Opportunity={id:string;organisation_id:string;title:string;status:string;opportunity_type:string;city:string|null;role_description:string;created_at:string};
type Application={opportunity_id:string;status:string};
export default function EmployerPortal(){
 const {user}=useAuth();const tenant=user?.tenantId;
 const [members,setMembers]=useState<Membership[]>([]),[opps,setOpps]=useState<Opportunity[]>([]),[applications,setApplications]=useState<Application[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [organisation,setOrganisation]=useState(''),[title,setTitle]=useState(''),[city,setCity]=useState(''),[kind,setKind]=useState('internship'),[summary,setSummary]=useState(''),[safety,setSafety]=useState(''),[stipend,setStipend]=useState('');
 const load=useCallback(async()=>{
  setError('');setLoading(true);setMembers([]);setOpps([]);setApplications([]);
  if(!user || !tenant){setError('A verified centre assignment is required. No student records are available.');setLoading(false);return;}
  try{
   const m=await db.from('unipathway_employer_memberships').select('organisation_id,unipathway_employer_organisations(name,sector,status)').eq('tenant_id',tenant).eq('user_id',user.id).eq('status','verified');
   if(m.error)throw new Error('Employer organisation verification is not available in Supabase. The approved employer schema must be deployed and checked before recruitment is enabled.');
   const verified=(m.data||[]).filter((x:Membership)=>x.unipathway_employer_organisations?.status==='verified') as Membership[];
   setMembers(verified);
   if(!verified.length){setLoading(false);return;}
   const orgs=verified.map(x=>x.organisation_id);
   const [jobs,apps]=await Promise.all([
    db.from('unipathway_employer_opportunities').select('id,organisation_id,title,status,opportunity_type,city,role_description,created_at').eq('tenant_id',tenant).in('organisation_id',orgs).order('created_at',{ascending:false}),
    db.from('unipathway_employer_applications').select('opportunity_id,status').eq('tenant_id',tenant)
   ]);
   if(jobs.error||apps.error)throw new Error('Employer vacancies or consent-scoped applicant workflow is not available. Ask the centre to verify RLS and migrations.');
   setOpps((jobs.data||[]) as Opportunity[]);setApplications((apps.data||[]) as Application[]);
   setOrganisation(v=>orgs.includes(v)?v:orgs[0]);
  }catch(e){setError(e instanceof Error?e.message:'Employer account unavailable.');}
  finally{setLoading(false);}
 },[user,tenant,refresh]);
 useEffect(()=>{void load();},[load]);
 const counts=useMemo(()=>new Map(opps.map(o=>[o.id,applications.filter(x=>x.opportunity_id===o.id).length])),[opps,applications]);
 async function submit(){
  if(!tenant||!user||!organisation||title.trim().length<5||summary.trim().length<25){
   setError('Choose a verified employer and enter a specific role title and description (at least 25 characters).');return;
  }
  setBusy(true);setError('');setNotice('');
  try{
   const result=await db.from('unipathway_employer_opportunities').insert({
    tenant_id:tenant,organisation_id:organisation,title:title.trim(),
    city:city.trim()||null,role_description:summary.trim(),safety_requirements:safety.trim()||null,
    stipend_details:stipend.trim()||null,opportunity_type:kind,country:'Pakistan',
    status:'draft',created_by:user.id,
   });
   if(result.error)throw result.error;
   setNotice('Draft submitted. Only centre leadership may approve and publish a verified vacancy.');
   setTitle('');setSummary('');setCity('');setStipend('');setSafety('');setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Draft could not be created.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Employer Partner Workspace" subtitle="Verified organisations, draft opportunities and consent-limited recruitment">
  <div className="space-y-6">
   <div className="rounded-xl border bg-card p-5"><ShieldCheck className="size-6 text-success"/><h2 className="mt-3 text-xl font-bold">Employer identity and student privacy</h2><p className="mt-2 text-sm text-muted-foreground">An employer account must be attached to a verified organisation by authorised UniPathway staff. General student admissions data is not an employer candidate list. Only actual applications submitted with student consent to a verified opportunity may be considered.</p>{loading&&<p className="mt-3 text-sm" role="status">Verifying organisation permissions…</p>}{error&&<p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}{notice&&<p className="mt-3 text-sm text-success" role="status">{notice}</p>}<Button variant="outline" className="mt-4" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Refresh verification</Button></div>
   {!loading&&!error&&!members.length&&<div className="rounded-xl border bg-secondary/40 p-6"><Building2 className="size-7 text-success"/><h2 className="mt-2 text-lg font-bold">Organisation approval pending</h2><p className="mt-2 text-sm text-muted-foreground">No verified employer membership is connected to this account yet. Centre staff must check the organisation, representative, agreed role and training commitments before access is granted. Student information remains hidden.</p></div>}
   {!loading&&!error&&members.length>0&&<>
     <section className="grid gap-3 md:grid-cols-3">{[{label:'Verified organisations',value:members.length},{label:'Draft or review roles',value:opps.filter(o=>o.status==='draft'||o.status==='review').length},{label:'Published roles',value:opps.filter(o=>o.status==='published').length}].map(x=><article key={x.label} className="rounded-xl border p-5"><p className="text-sm text-muted-foreground">{x.label}</p><p className="mt-2 text-2xl font-bold">{x.value}</p></article>)}</section>
     <section className="rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">Submit an opportunity for centre review</h2><p className="mt-2 text-sm text-muted-foreground">Employers can prepare an internship, supervised work experience or job draft. It will not appear to students before centre verification.</p><div className="mt-4 grid gap-4 md:grid-cols-2">
       <label className="block text-sm font-semibold">Organisation<select className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={organisation} onChange={e=>setOrganisation(e.target.value)}>{members.map(m=><option key={m.organisation_id} value={m.organisation_id}>{m.unipathway_employer_organisations?.name}</option>)}</select></label>
       <label className="block text-sm font-semibold">Type<select className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={kind} onChange={e=>setKind(e.target.value)}><option value="internship">Internship</option><option value="workplace_learning">Workplace learning</option><option value="job">Job</option></select></label>
       <label className="block text-sm font-semibold">Role title<Input className="mt-1" value={title} onChange={e=>setTitle(e.target.value)}/></label>
       <label className="block text-sm font-semibold">City / region<Input className="mt-1" value={city} onChange={e=>setCity(e.target.value)}/></label>
       <label className="block text-sm font-semibold md:col-span-2">Work duties, educational outcomes and supervision<Textarea className="mt-1" value={summary} onChange={e=>setSummary(e.target.value)}/></label>
       <label className="block text-sm font-semibold">Safety and eligibility requirements<Textarea className="mt-1" value={safety} onChange={e=>setSafety(e.target.value)}/></label>
       <label className="block text-sm font-semibold">Salary/stipend arrangement (confirm in writing)<Textarea className="mt-1" value={stipend} onChange={e=>setStipend(e.target.value)}/></label>
     </div><Button className="mt-4" disabled={busy} onClick={()=>void submit()}>{busy?'Submitting…':'Save draft for approval'}</Button></section>
     <section className="rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">Your organisation's opportunities</h2>{!opps.length?<p className="mt-2 text-sm text-muted-foreground">No verified opportunities or drafts are recorded.</p>:<div className="mt-4 grid gap-3 lg:grid-cols-2">{opps.map(o=><article key={o.id} className="rounded-lg border p-4"><BriefcaseBusiness className="size-5 text-success"/><h3 className="mt-2 font-bold">{o.title}</h3><p className="mt-1 text-sm text-muted-foreground">{o.city||'Pakistan'} · {o.opportunity_type.replace(/_/g,' ')} · {o.status}</p><p className="mt-2 text-xs text-muted-foreground">Consenting applicant records: {counts.get(o.id)||0}. Applications are read-only here; employment decisions require the centre's controlled workflow.</p></article>)}</div>}</section>
   </>}
  </div>
 </DashboardLayout>;
}
