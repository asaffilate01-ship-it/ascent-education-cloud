import {useEffect,useState} from 'react';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Application={id:string;student_name:string;email:string;stage:string;programme_name:string|null};
type Options={candidates:{id:string;name:string;email:string}[];programmes:{id:string;title:string}[]};
function Review({application,onClose,onSaved}:{application:Application;onClose:()=>void;onSaved:()=>void}){
 const [options,setOptions]=useState<Options>({candidates:[],programmes:[]});
 const [student,setStudent]=useState(''),[programme,setProgramme]=useState(''),[note,setNote]=useState('');
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setStudent('');setProgramme('');
  void(async()=>{try{const r=await db.rpc('get_unipathway_admission_options',{p_application:application.id});if(r.error)throw r.error;
   if(active)setOptions(r.data);
  }catch{if(active)setError('The learner and programme could not be verified. Retry before enrolling.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[application.id,refresh]);
 async function submit(event:React.FormEvent){event.preventDefault();if(saving)return;setSaving(true);setError('');
  try{const r=await db.rpc('complete_unipathway_admission',{p_application:application.id,p_student:student,p_programme:programme,p_expected_stage:application.stage,p_note:note.trim()});
   if(r.error)throw r.error;if(!r.data)throw Error('Enrolment confirmation was not returned');onSaved();
  }catch(e){setError(e instanceof Error?e.message:(e as {message?:string})?.message||'Enrolment was not confirmed. Retry or contact your centre.');}finally{setSaving(false);}}
 return <form onSubmit={submit} className="mt-4 space-y-4 rounded-lg border p-4" aria-label={`Review enrolment for ${application.student_name}`}>
  <h3 className="font-semibold">{application.student_name} · {application.email}</h3>
  <p className="text-sm text-muted-foreground">Check the offer and identity evidence before granting course access. Only confirmed accounts matching the application email and active centre programmes are available. This action creates no invoice and does not confirm payment.</p>
  {loading&&<p role="status">Verifying admission options…</p>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {!loading&&<>
   {!options.candidates.length&&<p className="text-sm">No eligible confirmed learner account. Ask the applicant to register and confirm their email, then have admissions verify their centre membership.</p>}
   <label className="block text-sm">Confirmed learner<select required disabled={saving||!!error} className="mt-1 w-full rounded border bg-background p-2" value={student} onChange={e=>setStudent(e.target.value)}><option value="">Choose the confirmed account</option>{options.candidates.map(c=><option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select></label>
   <label className="block text-sm">Active programme<select required disabled={saving||!!error} className="mt-1 w-full rounded border bg-background p-2" value={programme} onChange={e=>setProgramme(e.target.value)}><option value="">Choose the approved programme</option>{options.programmes.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
   {!options.programmes.length&&<p className="text-sm">No eligible active programme. Ask the programme team to review the application’s programme link.</p>}
   <label className="block text-sm">Admission decision and evidence reference<textarea required minLength={20} maxLength={2000} disabled={saving} className="mt-1 w-full rounded border bg-background p-2" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Record the approved offer and identity evidence reference; do not paste identity documents."/></label>
  </>}
  <div className="flex flex-wrap gap-2"><Button type="submit" disabled={loading||saving||!student||!programme||note.trim().length<20||!!error}>{saving?'Confirming…':'Confirm academic enrolment'}</Button>
   <Button type="button" variant="outline" disabled={saving||loading} onClick={()=>setRefresh(x=>x+1)}>Recheck options</Button>
   <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button></div>
 </form>;
}
export default function AdmissionHandover({applications,onRefetch}:{applications:Application[];onRefetch:()=>void}){
 const [selected,setSelected]=useState<string|null>(null),[success,setSuccess]=useState('');
 const eligible=applications.filter(a=>['unconditional_offer','deposit_paid'].includes(a.stage));
 const current=eligible.find(a=>a.id===selected);
 return <section className="surface-card mb-6 p-5" aria-labelledby="admission-handover-title">
  <h2 id="admission-handover-title" className="font-semibold">Academic enrolment review</h2>
  <p className="mt-2 text-sm text-muted-foreground">Review approved offers before enabling learning access. Finance approval and classroom invitations remain separate steps.</p>
  {success&&<p role="status" className="mt-3 text-sm">{success}</p>}
  {!eligible.length&&<p className="mt-3 text-sm text-muted-foreground">No unconditional offers or recorded-deposit applications awaiting enrolment.</p>}
  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{eligible.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-2"><div><p className="text-sm font-medium">{a.student_name}</p><p className="text-xs text-muted-foreground">{a.programme_name||'Programme review required'}</p></div><Button size="sm" variant="outline" disabled={!!current} onClick={()=>{setSelected(a.id);setSuccess('');}}>Review enrolment<span className="sr-only"> for {a.student_name}</span></Button></div>)}</div>
  {current&&<Review key={current.id} application={current} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setSuccess('Academic enrolment confirmed. Course access is enabled; class invitations and finance still require their own checks.');onRefetch();}}/>}
 </section>;
}
