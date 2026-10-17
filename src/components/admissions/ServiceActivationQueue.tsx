import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {CheckCircle2,ShieldCheck,UserCheck,RefreshCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';

const db:SupabaseClient=supabase;
type Lead={id:string;student_name:string;email:string;source:string|null;stage:string;user_id:string|null;created_at:string};
type Account={user_id:string;full_name:string;email:string};
type Service={id:string;enquiry_id:string;student_id:string;service_type:string;billing_mode:string;status:string};
const acceptedSource=(s:string|null)=>s==='ielts_preparation'||s?.startsWith('university_progression_')
  ||s==='consultancy_uk'||s==='consultancy_germany';

export default function ServiceActivationQueue(){
 const {user}=useAuth();
 const tenant=user?.tenantId;
 const isStaff=user?.roles.some(x=>['admissions_admin','centre_director','superadmin'].includes(x))??false;
 const manager=user?.roles.some(x=>['centre_director','superadmin'].includes(x))??false;
 const [leads,setLeads]=useState<Lead[]>([]);
 const [services,setServices]=useState<Service[]>([]);
 const [candidates,setCandidates]=useState<Account[]>([]);
 const [selectedLead,setSelectedLead]=useState<Lead|null>(null);
 const [candidateId,setCandidateId]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('all');
 const fetchRows=useCallback(async()=>{
  if(!tenant||!isStaff)return;
  setLoading(true);setError('');
  try{
   const [l,s]=await Promise.all([
    db.from('applications').select('id,student_name,email,source,stage,user_id,created_at')
     .eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(200),
    db.from('international_service_enrolments').select('id,enquiry_id,student_id,service_type,billing_mode,status')
     .eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(200),
   ]);
   if(l.error||s.error)throw l.error||s.error;
   setLeads(((l.data||[]) as Lead[]).filter(r=>acceptedSource(r.source)));
   setServices((s.data||[]) as Service[]);
  }catch{setError('Service matching is not available. Check that the UniPathway service-activation migration has been applied.');}
  finally{setLoading(false);}
 },[tenant,isStaff]);
 useEffect(()=>{void fetchRows();},[fetchRows]);
 const linked=useMemo(()=>new Map(services.map(s=>[s.enquiry_id,s])),[services]);
 const pending=leads.filter(x=>!linked.has(x.id)).length;
 const visible=leads.filter(x=>status==='all'||(status==='pending'?!linked.has(x.id):linked.has(x.id)));
 async function openMatch(lead:Lead){
  if(!tenant||busy)return;
  setError('');setSelectedLead(lead);setCandidates([]);setCandidateId('');setBusy(true);
  try{
   // Exact email only; the database RPC independently checks the confirmed Auth email.
   const r=await db.from('profiles').select('user_id,full_name,email')
     .eq('tenant_id',tenant).ilike('email',lead.email.trim()).limit(5);
   if(r.error)throw r.error;
   setCandidates((r.data||[]) as Account[]);
   if(r.data?.length===1)setCandidateId(r.data[0].user_id);
  }catch{setError('Could not find registered centre learners. Check admissions access.');}
  finally{setBusy(false);}
 }
 async function activate(){
  if(!selectedLead||!candidateId||!tenant||busy)return;
  setError('');setBusy(true);
  try{
   const r=await db.rpc('activate_international_service_from_lead',{
    p_enquiry:selectedLead.id,p_student:candidateId
   });
   if(r.error)throw r.error;
   setSelectedLead(null);setCandidates([]);setCandidateId('');
   await fetchRows();
  }catch(e){setError(e instanceof Error?e.message:'Could not activate learner service.');}
  finally{setBusy(false);}
 }
 async function updateStatus(row:Service,next:string){
  if(!tenant||!manager||busy)return;
  setBusy(true);setError('');
  try{
   const r=await db.from('international_service_enrolments').update({status:next})
      .eq('id',row.id).eq('tenant_id',tenant);
   if(r.error)throw r.error;await fetchRows();
  }catch(e){setError(e instanceof Error?e.message:'Could not update service status.');}
  finally{setBusy(false);}
 }
 if(!isStaff||!tenant)return null;
 return <section className="surface-card p-5 space-y-4" aria-label="Activate verified international student services">
  <div className="flex justify-between items-start flex-wrap gap-3">
   <div><h2 className="font-semibold text-lg flex gap-2 items-center"><UserCheck className="h-5 w-5 text-primary"/>External and internal student service activation</h2>
    <p className="text-sm text-muted-foreground mt-1">Match IELTS or university counselling enquiries to an existing, email-verified student login in this centre. Do not convert an enquiry to a diploma enrolment, exam booking, university offer or paid contract.</p></div>
   <Button variant="outline" size="sm" disabled={loading||busy} onClick={()=>void fetchRows()}><RefreshCcw className="h-4 w-4 mr-1"/>Refresh</Button>
  </div>
  <div className="flex gap-3 items-center flex-wrap text-sm">
   <span>{pending} unmatched enquiries (first 200 records)</span>
   <label>Show
    <select aria-label="Filter service activations" className="ml-2 bg-background border rounded p-2" value={status} onChange={e=>setStatus(e.target.value)}>
     <option value="all">All</option><option value="pending">Unmatched</option><option value="linked">Activated</option>
    </select></label>
  </div>
  {error&&<p className="text-sm text-destructive" role="alert">{error}</p>}
  {loading?<p role="status">Loading admission enquiries…</p>:visible.length?
   <div className="grid gap-2 md:grid-cols-2">
    {visible.map(lead=>{const service=linked.get(lead.id);return <article key={lead.id} className="rounded-lg border p-3 space-y-2">
     <div className="flex justify-between gap-2 items-start">
       <div><p className="font-semibold text-sm">{lead.student_name}</p><p className="text-xs text-muted-foreground break-all">{lead.email}</p></div>
       <span className="text-xs rounded-full bg-secondary px-2 py-1">{service?.status||'Not matched'}</span>
     </div>
     <p className="text-xs">{lead.source==='ielts_preparation'?'IELTS preparation':'University counselling'} · Admission stage {lead.stage}</p>
     {service?<div className="space-y-2">
       <p className="text-xs flex gap-1 items-center"><CheckCircle2 className="h-4 w-4 text-success"/>Verified account matched · {service.billing_mode}</p>
       {manager&&<select className="bg-background border rounded p-2 text-xs w-full" aria-label={'Update service for '+lead.student_name}
        disabled={busy||service.status==='completed'} value={service.status} onChange={e=>void updateStatus(service,e.target.value)}>
         <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
       </select>}
     </div>:<Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void openMatch(lead)}><ShieldCheck className="h-4 w-4 mr-1"/>Match registered student</Button>}
    </article>})}
   </div>:<p className="text-sm text-muted-foreground">No IELTS or university counselling enquiries match this filter.</p>}
  {selectedLead&&<div className="border rounded-xl p-4 space-y-3">
    <h3 className="font-semibold">Verify learner identity for {selectedLead.student_name}</h3>
    <p className="text-xs text-muted-foreground">Students must independently register, verify their email and have a UniPathway student role. This lookup does not invite a user or create an account. Staff should confirm applicant consent before activation.</p>
    <label className="block text-sm font-semibold">Matching centre account
      <select className="block border rounded bg-background p-2 w-full mt-1" value={candidateId} onChange={e=>setCandidateId(e.target.value)}>
       <option value="">Select a registered learner</option>
       {candidates.map(c=><option key={c.user_id} value={c.user_id}>{c.full_name} · {c.email}</option>)}
      </select>
    </label>
    {!candidates.length&&<p className="text-sm text-muted-foreground">No matching verified account appears in this centre. Ask the applicant to register using the same email, then refresh.</p>}
    <div className="flex gap-2">
      <Button disabled={!candidateId||busy} onClick={()=>void activate()}>{busy?'Verifying…':'Activate student service'}</Button>
      <Button variant="outline" disabled={busy} onClick={()=>{setSelectedLead(null);setCandidates([]);}}>Cancel</Button>
    </div>
  </div>}
 </section>;
}
