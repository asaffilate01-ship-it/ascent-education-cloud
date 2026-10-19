import {useCallback,useEffect,useState} from 'react';
import {Building2,BriefcaseBusiness,ShieldCheck,Users} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

type Organisation={id:string;name:string;sector:string;city:string|null;status:string;verification_reference:string|null};
type Membership={id:string;organisation_id:string;user_id:string;status:string;role:string};
type Opportunity={id:string;organisation_id:string;title:string;status:string;opportunity_type:string;role_description:string;employer_display_name:string};
type Application={id:string;opportunity_id:string;student_id:string;statement:string|null;status:string};
export default function EmployerPartnershipsPage(){
 const {user}=useAuth();
 const canView=Boolean(user?.roles.some(r=>['superadmin','centre_director','admissions_admin'].includes(r)));
 const canManage=Boolean(user?.roles.some(r=>['superadmin','centre_director'].includes(r)));
 const superadmin=Boolean(user?.roles.includes('superadmin'));
 const [tenantChoice,setTenantChoice]=useState(''),[tenants,setTenants]=useState<{id:string;name:string}[]>([]);
 const tenant=superadmin?(tenantChoice||user?.tenantId):user?.tenantId;
 const [orgs,setOrgs]=useState<Organisation[]>([]),[members,setMembers]=useState<Membership[]>([]),[jobs,setJobs]=useState<Opportunity[]>([]),[apps,setApps]=useState<Application[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [name,setName]=useState(''),[sector,setSector]=useState('Technology'),[city,setCity]=useState('');
 const [memberOrg,setMemberOrg]=useState(''),[memberUser,setMemberUser]=useState(''),[memberRole,setMemberRole]=useState('recruiter'),[memberProof,setMemberProof]=useState('');
 const [selectedOrg,setSelectedOrg]=useState(''),[jobTitle,setJobTitle]=useState(''),[jobDescription,setJobDescription]=useState(''),[jobType,setJobType]=useState('internship');
 const [evidence,setEvidence]=useState<Record<string,string>>({});
 useEffect(()=>{if(!superadmin)return;let active=true;void db.from('tenants').select('id,name').order('name').then(({data}:{data:{id:string;name:string}[]})=>{if(active)setTenants(data||[])});return()=>{active=false};},[superadmin]);
 const load=useCallback(async()=>{
  setLoading(true);setError('');setOrgs([]);setMembers([]);setJobs([]);setApps([]);
  if(!tenant||!canView){setError('A centre assignment and staff permissions are required.');setLoading(false);return;}
  try{
   const results=await Promise.all([
     db.from('unipathway_employer_organisations').select('id,name,sector,city,status,verification_reference').eq('tenant_id',tenant).order('name'),
     db.from('unipathway_employer_memberships').select('id,organisation_id,user_id,status,role').eq('tenant_id',tenant),
     db.from('unipathway_employer_opportunities').select('id,organisation_id,title,status,opportunity_type,role_description,employer_display_name').eq('tenant_id',tenant).order('created_at',{ascending:false}),
     db.from('unipathway_employer_applications').select('id,opportunity_id,student_id,statement,status').eq('tenant_id',tenant),
   ]);
   if(results.some(x=>x.error))throw new Error('The verified employer placement tables are not available yet. Reconcile the Lovable-connected Supabase migrations, RLS and policies before onboarding employers.');
   setOrgs(results[0].data||[]);setMembers(results[1].data||[]);setJobs(results[2].data||[]);setApps(results[3].data||[]);
   setMemberOrg(v=>(results[0].data||[]).some((x:Organisation)=>x.id===v)?v:results[0].data?.[0]?.id||'');
   setSelectedOrg(v=>(results[0].data||[]).some((x:Organisation)=>x.id===v)?v:results[0].data?.[0]?.id||'');
  }catch(e){setError(e instanceof Error?e.message:'Employer data unavailable.');}
  finally{setLoading(false);}
 },[tenant,canView,refresh]);
 useEffect(()=>{void load()},[load]);
 async function execute(fn:()=>Promise<void>){
  if(busy)return;setError('');setNotice('');setBusy(true);
  try{await fn();setNotice('Saved to the centre-scoped employer register. Verified roles still require leadership approval.');setRefresh(n=>n+1)}
  catch(e){setError(e instanceof Error?e.message:'The update was not saved.')}
  finally{setBusy(false)}
 }
 async function createOrganisation(){
  if(!tenant||name.trim().length<3)return setError('Enter a valid organisation name.');
  await execute(async()=>{
   const r=await db.from('unipathway_employer_organisations').insert({tenant_id:tenant,name:name.trim(),sector,city:city.trim()||null,status:'prospect'});
   if(r.error)throw r.error;setName('');
  });
 }
 async function verifyOrganisation(o:Organisation){
  if(!tenant||!user)return;
  const proof=(evidence[o.id]||'').trim();
  if(!proof)return setError('Enter the official organisation verification reference before approval.');
  await execute(async()=>{
   const r=await db.from('unipathway_employer_organisations').update({status:'verified',verification_reference:proof,verified_by:user.id,verified_at:new Date().toISOString()}).eq('id',o.id).eq('tenant_id',tenant).select('id');
   if(r.error)throw r.error;if(!r.data?.length)throw new Error('Organisation approval was not permitted or the record has changed.');
  });
 }
 async function addMember(){
  if(!tenant||!user||!memberOrg||!memberUser||!memberProof.trim())return setError('Choose the verified employer, staff-verified user ID and approval evidence.');
  if(!/^[0-9a-fA-F-]{36}$/.test(memberUser))return setError('Enter a valid user UUID from the verified account register.');
  await execute(async()=>{
   const r=await db.from('unipathway_employer_memberships').insert({tenant_id:tenant,organisation_id:memberOrg,user_id:memberUser,role:memberRole,status:'verified',verification_reference:memberProof.trim(),verified_by:user.id,verified_at:new Date().toISOString()});
   if(r.error)throw r.error;setMemberUser('');setMemberProof('');
  });
 }
 async function createOpportunity(){
  if(!tenant||!selectedOrg||jobTitle.trim().length<5||jobDescription.trim().length<25)return setError('Choose an employer, role title and meaningful training/job description.');
  await execute(async()=>{
   const r=await db.from('unipathway_employer_opportunities').insert({tenant_id:tenant,organisation_id:selectedOrg,title:jobTitle.trim(),opportunity_type:jobType,role_description:jobDescription.trim(),country:'Pakistan',status:'draft',created_by:user?.id});
   if(r.error)throw r.error;setJobTitle('');setJobDescription('');
  });
 }
 async function publish(job:Opportunity){
  if(!tenant||!user)return;
  const proof=(evidence[job.id]||'').trim();if(!proof)return setError('Document the employer agreement, supervision and recruitment approval before publication.');
  await execute(async()=>{
   const r=await db.from('unipathway_employer_opportunities').update({status:'published',verification_reference:proof,approved_by:user.id,approved_at:new Date().toISOString()}).eq('id',job.id).eq('tenant_id',tenant).select('id');
   if(r.error)throw r.error;if(!r.data?.length)throw new Error('Vacancy publication was denied. Verify employer status and staff permissions.');
  });
 }
 const count=(id:string)=>apps.filter(a=>a.opportunity_id===id).length;
 return <DashboardLayout title="Pakistan Employer Partnerships" subtitle="Verify businesses, recruitment contacts, safe placements and consenting applications">
  {!canView?<p role="alert">Employer partnership management requires centre leadership or admissions permissions.</p>
  :<div className="space-y-6">
   {superadmin&&tenants.length>0&&<label className="block rounded-xl border p-4 text-sm font-semibold">Centre<select className="mt-2 block h-10 w-full max-w-md rounded-md border bg-background px-3" value={tenant||''} onChange={e=>setTenantChoice(e.target.value)}>{tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <section className="rounded-xl border bg-card p-5"><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Verified employer access only</h2><p className="mt-2 text-sm text-muted-foreground">Organisations, representatives and vacancy approvals are independently recorded. The employer portal cannot browse ordinary student admissions records. Only applications explicitly submitted for a published opportunity are available to its verified organisation members.</p>{loading&&<p role="status" className="mt-3">Loading employer records…</p>}{error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm text-success">{notice}</p>}<Button className="mt-4" variant="outline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Refresh</Button></section>
   {!loading&&!error&&<>
     <section className="grid gap-3 md:grid-cols-4">{[{label:'Employer organisations',n:orgs.length},{label:'Verified organisations',n:orgs.filter(o=>o.status==='verified').length},{label:'Published opportunities',n:jobs.filter(j=>j.status==='published').length},{label:'Consenting applicants',n:apps.length}].map(s=><article key={s.label} className="rounded-xl border p-5"><p className="text-sm text-muted-foreground">{s.label}</p><p className="mt-2 text-2xl font-bold">{s.n}</p></article>)}</section>
     {canManage&&<section className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Register employer for KYB review</h2><div className="mt-3 space-y-3"><label className="block text-sm">Organisation name<Input className="mt-1" value={name} onChange={e=>setName(e.target.value)}/></label><label className="block text-sm">Sector<Input className="mt-1" value={sector} onChange={e=>setSector(e.target.value)}/></label><label className="block text-sm">City<Input className="mt-1" value={city} onChange={e=>setCity(e.target.value)}/></label></div><Button className="mt-4" disabled={busy} onClick={()=>void createOrganisation()}>Save unverified employer</Button></div>
       <div className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Verify employer user membership</h2><p className="mt-1 text-xs text-muted-foreground">Approve only after verifying identity, employer authority and assigned employer_partner role. Do not copy user IDs from public enquiries.</p><div className="mt-3 space-y-3"><label className="block text-sm">Organisation<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={memberOrg} onChange={e=>setMemberOrg(e.target.value)}>{orgs.map(o=><option value={o.id} key={o.id}>{o.name} ({o.status})</option>)}</select></label><label className="block text-sm">Verified account UUID<Input className="mt-1" value={memberUser} onChange={e=>setMemberUser(e.target.value)}/></label><label className="block text-sm">Representative role<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={memberRole} onChange={e=>setMemberRole(e.target.value)}><option>recruiter</option><option>owner</option><option>mentor</option></select></label><label className="block text-sm">Evidence reference<Input className="mt-1" value={memberProof} onChange={e=>setMemberProof(e.target.value)}/></label></div><Button className="mt-4" disabled={busy||!orgs.length} onClick={()=>void addMember()}>Verify employer member</Button></div>
     </section>}
     <section><h2 className="text-xl font-bold">Employer register</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{orgs.map(o=><article key={o.id} className="rounded-xl border bg-card p-5"><Building2 className="size-6 text-success"/><h3 className="mt-2 font-bold">{o.name}</h3><p className="mt-1 text-sm text-muted-foreground">{o.sector} · {o.city||'Pakistan'} · {o.status}</p><p className="mt-1 text-xs text-muted-foreground">{members.filter(m=>m.organisation_id===o.id&&m.status==='verified').length} verified members</p>{canManage&&o.status!=='verified'&&<div className="mt-3"><label className="block text-sm">KYB evidence reference<Input className="mt-1" value={evidence[o.id]||''} onChange={e=>setEvidence(v=>({...v,[o.id]:e.target.value}))}/></label><Button className="mt-2" size="sm" disabled={busy} onClick={()=>void verifyOrganisation(o)}>Verify organisation</Button></div>}</article>)}</div>{!orgs.length&&<p className="mt-2 text-sm text-muted-foreground">No employers have been submitted for vetting.</p>}</section>
     {canManage&&<section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Create a vacancy draft</h2><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="block text-sm">Employer<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label className="block text-sm">Type<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={jobType} onChange={e=>setJobType(e.target.value)}><option value="internship">Internship</option><option value="workplace_learning">Workplace learning</option><option value="job">Job</option></select></label><label className="block text-sm">Role title<Input className="mt-1" value={jobTitle} onChange={e=>setJobTitle(e.target.value)}/></label><label className="block text-sm md:col-span-2">Training tasks, location, supervision and duties<Textarea className="mt-1" value={jobDescription} onChange={e=>setJobDescription(e.target.value)}/></label></div><Button className="mt-3" disabled={busy||!orgs.length} onClick={()=>void createOpportunity()}>Save draft role</Button></section>}
     <section><h2 className="text-xl font-bold">Roles awaiting or holding approval</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{jobs.map(j=><article className="rounded-xl border bg-card p-5" key={j.id}><BriefcaseBusiness className="size-6 text-success"/><h3 className="mt-2 font-bold">{j.title}</h3><p className="mt-1 text-sm text-muted-foreground">{j.employer_display_name||'Employer'} · {j.opportunity_type} · {j.status}</p><p className="mt-2 text-xs text-muted-foreground">{count(j.id)} consenting applications. These are not general admissions records.</p>{canManage&&j.status!=='published'&&<div className="mt-4"><label className="block text-sm">Employer agreement and placement approval reference<Input className="mt-1" value={evidence[j.id]||''} onChange={e=>setEvidence(v=>({...v,[j.id]:e.target.value}))}/></label><Button size="sm" className="mt-2" disabled={busy} onClick={()=>void publish(j)}>Approve verified vacancy</Button></div>}</article>)}</div>{!jobs.length&&<p className="mt-2 text-sm text-muted-foreground">No opportunities are ready for review.</p>}</section>
   </>}
  </div>}
 </DashboardLayout>;
}
