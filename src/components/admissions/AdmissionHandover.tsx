import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Application={id:string;student_name:string;email:string;stage:string;programme_name:string|null};
type Options={candidates:{id:string;name:string;email:string}[];programmes:{id:string;title:string}[]};
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid=(id:unknown):id is string=>typeof id==='string'&&UUID_RE.test(id);
function verifiedOptions(value:unknown):Options {
 if(!value||typeof value!=='object')throw Error('Admission options were not confirmed');
 const obj=value as {candidates?:unknown;programmes?:unknown};
 if(!Array.isArray(obj.candidates)||!Array.isArray(obj.programmes))throw Error('Admission options were not confirmed');
 const candidates=obj.candidates as Options['candidates'];
 const programmes=obj.programmes as Options['programmes'];
 if(candidates.some(item=>!item||typeof item.id!=='string'||!item.id||typeof item.name!=='string'||typeof item.email!=='string')||
    programmes.some(item=>!item||typeof item.id!=='string'||!item.id||typeof item.title!=='string'))
  throw Error('Admission options were not confirmed');
 return {candidates,programmes};
}
function Review({application,onClose,onSaved}:{application:Application;onClose:()=>void;onSaved:()=>void}){
 const {user}=useAuth();
 const [options,setOptions]=useState<Options>({candidates:[],programmes:[]});
 const [student,setStudent]=useState(''),[programme,setProgramme]=useState(''),[note,setNote]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const [uncertain,setUncertain]=useState(false),[checking,setChecking]=useState(false);
 const requestLock=useRef(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;setLoading(true);setError('');setStudent('');setProgramme('');
  void(async()=>{try{const r=await db.rpc('get_unipathway_admission_options',{p_application:application.id});if(r.error)throw r.error;
   if(active)setOptions(verifiedOptions(r.data));
  }catch{if(active)setError('The learner and programme could not be verified. Retry before enrolling.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[application.id,refresh]);
 async function submit(event:React.FormEvent){
  event.preventDefault();
  if(requestLock.current||saving||uncertain)return;
  if(!options.candidates.some(candidate=>candidate.id===student)||
     !options.programmes.some(item=>item.id===programme)||
     note.trim().length<20)return;
  requestLock.current=true;setSaving(true);setError('');
  try{
   const r=await db.rpc('complete_unipathway_admission',{
    p_application:application.id,p_student:student,p_programme:programme,
    p_expected_stage:application.stage,p_note:note.trim(),
   });
   if(r.error)throw r.error;
   // A truthy JSON object or acknowledgement is not a transaction receipt.
   // The existing RPC returns the UUID of the committed enrolment.
   if(!isUuid(r.data))throw Error('No verifiable enrolment receipt was returned');
   if(mounted.current)onSaved();
  }catch(e){
   if(mounted.current){
    setUncertain(true);
    setError(e instanceof Error?e.message:(typeof (e as {message?:unknown})?.message==='string'?(e as {message:string}).message:'Enrolment result could not be confirmed'));
   }
  }finally{
   requestLock.current=false;
   if(mounted.current)setSaving(false);
  }
 }
 async function checkStatus(){
  if(!uncertain||checking||saving||!user?.tenantId||!student||!programme)return;
  setChecking(true);setError('');
  try{
   // Read-only exact-case recovery. RLS must separately authorise this staff
   // member; an absent or partial row never becomes a positive confirmation.
   const response=await db.from('student_enrolments')
    .select('id,application_id,student_id,programme_id,tenant_id,status')
    .eq('application_id',application.id).eq('student_id',student)
    .eq('programme_id',programme).eq('tenant_id',user.tenantId)
    .eq('status','active').limit(2);
   if(response.error||!Array.isArray(response.data))throw Error('Status evidence could not be verified');
   const rows=response.data as Array<{id:unknown;application_id:string;student_id:string;programme_id:string;tenant_id:string;status:string}>;
   if(rows.length===1&&isUuid(rows[0].id)&&rows[0].application_id===application.id&&
      rows[0].student_id===student&&rows[0].programme_id===programme&&
      rows[0].tenant_id===user.tenantId&&rows[0].status==='active'){
    if(mounted.current)onSaved();
   }else if(mounted.current){
    setError('No matching active enrolment could be confirmed. Ask an authorised centre officer to review before trying again.');
   }
  }catch(e){
   if(mounted.current)setError(e instanceof Error?e.message:'Status could not be verified');
  }finally{if(mounted.current)setChecking(false);}
 }
 return <form onSubmit={submit} className="mt-4 space-y-4 rounded-lg border p-4" aria-label={`Review enrolment for ${application.student_name}`}>
  <h3 className="font-semibold">{application.student_name} · {application.email}</h3>
  <p className="text-sm text-muted-foreground">Check the offer and identity evidence before granting course access. Only confirmed accounts matching the application email and active centre programmes are available. This action creates no invoice and does not confirm payment.</p>
  {loading&&<p role="status">Verifying admission options…</p>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {uncertain&&<section className="rounded-lg border border-destructive/40 p-3" aria-label="Unconfirmed enrolment result">
    <h4 className="text-sm font-semibold">Enrolment result not yet confirmed</h4>
    <p className="mt-2 text-sm text-muted-foreground">The submission may have reached the server. Do not submit it again without checking the existing enrolment receipt or asking an authorised officer.</p>
    <Button type="button" variant="outline" className="mt-2 min-h-11" disabled={checking||saving} onClick={()=>void checkStatus()}>
      {checking?'Checking status…':'Check recorded enrolment status'}
    </Button>
  </section>}
  {!loading&&<>
   {!options.candidates.length&&<p className="text-sm">No eligible confirmed learner account. Ask the applicant to register and confirm their email, then have admissions verify their centre membership.</p>}
   <label className="block text-sm">Confirmed learner<select required disabled={saving||!!error} className="mt-1 w-full rounded border bg-background p-2" value={student} onChange={e=>setStudent(e.target.value)}><option value="">Choose the confirmed account</option>{options.candidates.map(c=><option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select></label>
   <label className="block text-sm">Active programme<select required disabled={saving||!!error} className="mt-1 w-full rounded border bg-background p-2" value={programme} onChange={e=>setProgramme(e.target.value)}><option value="">Choose the approved programme</option>{options.programmes.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
   {!options.programmes.length&&<p className="text-sm">No eligible active programme. Ask the programme team to review the application’s programme link.</p>}
   <label className="block text-sm">Admission decision and evidence reference<textarea required minLength={20} maxLength={2000} disabled={saving} className="mt-1 w-full rounded border bg-background p-2" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Record the approved offer and identity evidence reference; do not paste identity documents."/></label>
  </>}
  <div className="flex flex-wrap gap-2"><Button type="submit" disabled={loading||saving||uncertain||!student||!programme||note.trim().length<20||!!error}>{saving?'Confirming…':'Confirm academic enrolment'}</Button>
   <Button type="button" variant="outline" disabled={saving||loading||uncertain} onClick={()=>setRefresh(x=>x+1)}>Recheck options</Button>
   <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button></div>
 </form>;
}
export default function AdmissionHandover({applications,onRefetch}:{applications:Application[];onRefetch:()=>void}){
 const [selected,setSelected]=useState<string|null>(null),[success,setSuccess]=useState('');
 const eligible=applications.filter(a=>['unconditional_offer','deposit_paid'].includes(a.stage));
 const current=eligible.find(a=>a.id===selected);
 return <section className="surface-card mb-6 p-5" aria-labelledby="admission-handover-title">
  <h2 id="admission-handover-title" className="font-semibold">Academic enrolment review</h2>
  <p className="mt-2 text-sm text-muted-foreground">The existing server transaction confirms a matching student, an active programme and the application stage, but does not itself verify every KYC, signed offer, funding decision or class allocation. Require those independent records before accepting an enrolment decision; finance and classroom invitations remain separate steps.</p>
  {success&&<p role="status" className="mt-3 text-sm">{success}</p>}
  {!eligible.length&&<p className="mt-3 text-sm text-muted-foreground">No unconditional offers or recorded-deposit applications awaiting enrolment.</p>}
  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{eligible.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-2"><div><p className="text-sm font-medium">{a.student_name}</p><p className="text-xs text-muted-foreground">{a.programme_name||'Programme review required'}</p></div><Button size="sm" variant="outline" disabled={!!current} onClick={()=>{setSelected(a.id);setSuccess('');}}>Review enrolment<span className="sr-only"> for {a.student_name}</span></Button></div>)}</div>
  {current&&<Review key={current.id} application={current} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setSuccess('Academic enrolment receipt confirmed. Check the learner’s active course access separately; class invitations and finance require their own verification.');onRefetch();}}/>}
 </section>;
}
