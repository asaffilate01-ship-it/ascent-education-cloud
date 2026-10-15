import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import type {EducationTables} from '@/integrations/supabase/education-types';
import {workflowRows} from '@/lib/workflowRows';
import {evidenceCurrent,readinessGaps,type ReadinessCheck} from '@/lib/readiness';
import {localDateTime,supportDueValue} from '@/lib/supportDesk';
const db:SupabaseClient=supabase;
export default function ProductionReadiness(){
 const {user}=useAuth();const allowed=user?.roles.some(r=>['superadmin','centre_director'].includes(r));
 return <DashboardLayout title="Production Readiness" subtitle="Launch decisions require recorded operational evidence">{allowed&&user?.tenantId?<Workspace key={`${user.tenantId}-${user.id}`} tenant={user.tenantId}/>:<p>Centre leadership access required.</p>}</DashboardLayout>;
}
function Workspace({tenant}:{tenant:string}){
 const [integrations,setIntegrations]=useState<EducationTables['production_integrations']['Row'][]>([]),[checks,setChecks]=useState<ReadinessCheck[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[now,setNow]=useState(Date.now());const generation=useRef(0);
 const load=useCallback(async()=>{const token=++generation.current;setLoading(true);setError('');
  const current=()=>token===generation.current;
  const [i,c]=await Promise.all([workflowRows(db,'production_integrations',tenant,current,'*','category'),workflowRows(db,'production_readiness_checks',tenant,current,'*','category')]);
  if(!current())return;
  if(i.error||c.error)setError('Readiness evidence could not be loaded. Launch status is unknown.');else{setIntegrations(i.data as typeof integrations);setChecks(c.data as ReadinessCheck[]);setNow(Date.now());}setLoading(false);
 },[tenant]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 if(loading)return <p>Loading evidence…</p>;
 if(error)return <div role="alert">{error}<Button onClick={load}>Retry</Button></div>;
 const gaps=readinessGaps(checks,integrations,now);
 return <div className="space-y-5"><section className="surface-card p-5"><h2 className="font-semibold">{gaps.checks||gaps.integrations?`${gaps.checks} checks outstanding · ${gaps.integrations} required integrations unverified`:'Recorded gates complete — review evidence before launch'}</h2><p className="text-sm text-muted-foreground">Recorded reviews do not establish live provider health. Integration verification is managed separately.</p>{gaps.missing.length>0&&<p role="alert">Missing baseline checks: {gaps.missing.join(', ')}. Apply the launch-gate migration.</p>}<Button variant="outline" onClick={load}>Refresh evidence</Button></section>
 <section className="surface-card p-5 space-y-3"><h2 className="font-semibold">External integrations</h2>{integrations.map(i=><div key={i.id}><p>{i.integration_key.replace(/_/g,' ')} · {i.status}</p><p className="text-sm text-muted-foreground">{i.required_for_launch?'Required':'Optional'} · {i.last_health_at?`Last verified ${new Date(i.last_health_at).toLocaleString()}`:'No live verification recorded'}</p></div>)}</section>
 <section className="space-y-4"><h2 className="font-semibold">Launch checks</h2>{checks.map(c=><article key={c.id} className="surface-card p-5 space-y-2"><h3 className="font-semibold">{c.check_key.replace(/_/g,' ')}</h3><p>{c.status} · {evidenceCurrent(c,now)?'Evidence current':'Outstanding / evidence review required'}</p><p className="text-sm">{c.evidence_reference||'No evidence recorded'}</p>{c.notes&&<p>{c.notes}</p>}{c.valid_until&&<p>Review deadline: {new Date(c.valid_until).toLocaleString()}</p>}{c.checked_at&&<p className="text-xs text-muted-foreground">Reviewed {new Date(c.checked_at).toLocaleString()} by {c.checked_by} · Revision {c.revision}</p>}<Review check={c} reload={load}/></article>)}</section></div>;
}
function Review({check,reload}:{check:ReadinessCheck;reload:()=>Promise<void>}){
 const [status,setStatus]=useState(check.status),[evidence,setEvidence]=useState(check.evidence_reference||''),[notes,setNotes]=useState(check.notes||''),[expiry,setExpiry]=useState(localDateTime(check.valid_until));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState<EducationTables['production_readiness_reviews']['Row'][]|null>(null),[historyError,setHistoryError]=useState('');const lock=useRef(false),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function save(event:React.FormEvent){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const result=await db.rpc('review_production_check',{p_check:check.id,p_revision:check.revision,p_status:status,p_evidence:evidence,p_notes:notes,p_valid_until:status==='pass'?supportDueValue(expiry,check.valid_until):null});if(result.error)throw new Error(result.error.message);if(active.current)await reload();}
  catch(e){if(active.current)setError(e instanceof Error?e.message:'Review could not be saved. Refresh to confirm its status.');}
  finally{lock.current=false;if(active.current)setBusy(false);}
 }
 async function showHistory(){setHistoryError('');try{const result=await db.from('production_readiness_reviews').select('*').eq('tenant_id',check.tenant_id).eq('check_id',check.id).order('revision',{ascending:false}).limit(20);if(result.error)throw result.error;if(active.current)setHistory(result.data||[]);}catch{if(active.current)setHistoryError('Review history unavailable. Retry.');}}
 return <><details><summary className="cursor-pointer">Record a review</summary><form onSubmit={save} className="space-y-3 mt-3"><label className="block">Decision<select className="block border rounded p-2 bg-background" value={status} onChange={e=>setStatus(e.target.value)}>{['pending','pass','fail','blocked','not_applicable'].map(s=><option key={s}>{s}</option>)}</select></label><label className="block">Evidence reference<input className="block w-full border rounded p-2 bg-background" value={evidence} onChange={e=>setEvidence(e.target.value)} maxLength={500} required={['pass','not_applicable'].includes(status)}/></label><p className="text-xs text-muted-foreground">Use a document reference. Do not enter credentials or secrets.</p><label className="block">Review notes<textarea className="block w-full border rounded p-2 bg-background" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000} required={['fail','blocked','not_applicable'].includes(status)}/></label>{status==='pass'&&<label className="block">Review deadline (local time)<input className="block border rounded p-2 bg-background" type="datetime-local" required value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>}{error&&<p role="alert">{error} Your entries are retained; refresh evidence before retrying a conflicting review.</p>}<Button disabled={busy} type="submit">{busy?'Saving…':'Save review'}</Button></form></details><Button variant="outline" onClick={showHistory}>Load latest 20 reviews</Button>{historyError&&<p role="alert">{historyError}</p>}{history&&<ol className="space-y-2">{history.length===0&&<li>No reviews recorded.</li>}{history.map(r=><li key={r.id} className="text-sm border-t pt-2">Revision {r.revision}: {r.old_status} → {r.new_status} · {new Date(r.created_at).toLocaleString()} · {r.reviewed_by}<p>{r.evidence_reference}</p><p>{r.notes}</p>{r.valid_until&&<p>Valid until {new Date(r.valid_until).toLocaleString()}</p>}</li>)}</ol>}</>;
}
