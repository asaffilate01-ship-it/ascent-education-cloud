import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {accountRoles,parseAccountCsv,type AccountRow} from '@/lib/accountImport';
import {accountConfirmed,accountSettled,invitationOutcome} from '@/lib/accountInvitation';
type Invitation={id:string;email:string;full_name:string;role:string;status:string;email_sent:boolean;created_at:string;completed_at:string|null};
export default function AccountOperations(){
 const {user}=useAuth();
 if(!user?.roles.some(r=>['centre_director','superadmin'].includes(r)))return <p>Contact your centre director to invite or import accounts.</p>;
 if(!user.tenantId)return <p role="alert">Select an authorised centre before managing accounts.</p>;
 return <Workspace key={`${user.id}:${user.tenantId}:${user.roles.join(',')}`} tenant={user.tenantId} superadmin={user.roles.includes('superadmin')}/>;
}
function Workspace({tenant,superadmin}:{tenant:string;superadmin:boolean}){
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[role,setRole]=useState('student'),[rows,setRows]=useState<AccountRow[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [history,setHistory]=useState<Invitation[]>([]),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(true),[refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 const mounted=useRef(true),running=useRef(false),paused=useRef(false),fileGeneration=useRef(0);
 useEffect(()=>{const files=fileGeneration;mounted.current=true;return()=>{mounted.current=false;paused.current=true;files.current++;};},[]);
 useEffect(()=>{let active=true;setHistory([]);setHistoryError('');setHistoryLoading(true);setPage(0);
  void pagedRows<Invitation>(()=>db.from('unipathway_account_invitations').select('id,email,full_name,role,status,email_sent,created_at,completed_at').eq('tenant_id',tenant),()=>active)
   .then(data=>{if(active)setHistory(data.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id)));})
   .catch(()=>{if(active)setHistoryError('Account history could not be verified. Refresh to retry.');}).finally(()=>{if(active)setHistoryLoading(false);});
  return()=>{active=false;};
 },[tenant,refresh]);
 async function process(batch:AccountRow[]){
  if(running.current||!mounted.current)return;fileGeneration.current++;running.current=true;paused.current=false;setBusy(true);setError('');setNotice('');
  const current=batch.map(r=>({...r}));setRows(current);
  try{for(let i=0;i<current.length;i++){
   if(!mounted.current||paused.current)break;
   if(accountSettled(current[i].status))continue;
   current[i]={...current[i],status:'processing',error:undefined};setRows(current.map(r=>({...r})));
   try{
    const result=await supabase.functions.invoke('invite-staff',{body:{email:current[i].email,fullName:current[i].fullName,role:current[i].role,tenantId:tenant}});
    const status=await invitationOutcome(result);
    if(!mounted.current)return;current[i]={...current[i],status,error:undefined};
   }catch(e){if(!mounted.current)return;current[i]={...current[i],status:'failed',error:e instanceof Error?e.message:'Request could not be confirmed.'};paused.current=true;}
   setRows(current.map(r=>({...r})));
  }
  if(mounted.current){setNotice(paused.current?'Batch paused. Check the result, then retry or skip the affected row.':'Batch finished. Review each account result below.');setRefresh(v=>v+1);}
  }finally{running.current=false;if(mounted.current)setBusy(false);}
 }
 async function readFile(file?:File){
  if(!file)return;const token=++fileGeneration.current;setError('');setNotice('');
  try{if(file.size>100000)throw Error('CSV must be under 100 KB.');const parsed=parseAccountCsv(await file.text());if(mounted.current&&token===fileGeneration.current&&!running.current)setRows(parsed);}
  catch(e){if(mounted.current&&token===fileGeneration.current&&!running.current){setRows([]);setError(e instanceof Error?e.message:'Invalid CSV.');}}
 }
 const visible=history.filter(r=>`${r.email} ${r.full_name} ${r.role} ${r.status}`.toLowerCase().includes(search.toLowerCase()));
 return <section className="space-y-5"><h3 className="text-lg font-bold">Account invitations and imports</h3><p className="text-sm">New accounts receive an invitation email. Existing accounts in this centre receive the selected access role. Accounts from other centres cannot be reassigned here. Imports do not enrol learners in courses.</p>
  <form className="space-y-3" onSubmit={e=>{e.preventDefault();fileGeneration.current++;void process([{email:email.trim().toLowerCase(),fullName:name.trim(),role}]);}}><label className="block text-sm">Full name<Input required minLength={2} maxLength={120} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label className="block text-sm">Email<Input required type="email" maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm">Role<select className="block w-full rounded border bg-background p-2" disabled={busy} value={role} onChange={e=>setRole(e.target.value)}>{accountRoles.map(r=><option key={r}>{r}</option>)}</select></label><Button disabled={busy}>Assign access / invite account</Button></form>
  <div className="space-y-2 border-t pt-4"><h4 className="font-semibold">CSV import</h4><p className="text-sm">Headers: email,full_name,role. Up to 50 accounts; review the rows before sending invitations. Processing pauses on an error so you can check provider limits and account history before retrying.</p><Input type="file" accept=".csv,text/csv" disabled={busy} aria-label="Account CSV" onChange={e=>void readFile(e.target.files?.[0])}/></div>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {rows.length>0&&<><p className="text-sm">{rows.filter(r=>accountConfirmed(r.status)).length} confirmed · {rows.filter(r=>r.status==='skipped').length} skipped · {rows.filter(r=>!accountSettled(r.status)).length} pending or needing review</p><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Result</th><th>Action</th></tr></thead><tbody>{rows.map(r=><tr key={`${r.email}:${r.role}`} className="border-t"><td>{r.fullName}</td><td>{r.email}</td><td>{r.role}</td><td>{r.error||r.status||'Ready for review'}</td><td>{!accountSettled(r.status)&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>setRows(old=>old.map(x=>x===r?{...x,status:'skipped',error:undefined}:x))}>Skip {r.email}</Button>}</td></tr>)}</tbody></table></div>
   <div className="flex flex-wrap gap-2"><Button disabled={busy||rows.every(r=>accountSettled(r.status))} onClick={()=>void process(rows)}>{busy?'Processing accounts…':'Process pending / retry failed rows'}</Button>{busy&&<Button variant="outline" onClick={()=>{paused.current=true;setNotice('Pausing after the current request. An invitation already issued cannot be recalled.');}}>Pause after current account</Button>}</div>
   <p className="text-xs">“invited” records an email request, not delivery or acceptance. “access_assigned” and “already_assigned” do not send a new email. Skip affects this batch only. Keep the page open to retain unsent rows; after reload, re-upload the CSV or review server history.</p></>}
  <section className="space-y-3 rounded-xl border p-4" aria-label="Account request history"><h4 className="font-semibold">Account request history</h4><p className="text-sm">Saved requests for this centre. Prepared means completion is unconfirmed. Assigned is a recorded operation, not proof the person has signed in or still holds the role.</p>
   <div className="flex flex-wrap gap-3"><label className="text-sm">Search account history<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Name, email, role or status"/></label><Button variant="outline" disabled={busy||historyLoading} onClick={()=>setRefresh(v=>v+1)}>Refresh account history</Button></div>
   {historyLoading&&<p role="status">Checking saved account requests…</p>}{historyError&&<p role="alert">{historyError}</p>}{!historyLoading&&!historyError&&!visible.length&&<p>No matching account requests.</p>}
   {visible.slice(page*20,page*20+20).map(r=><article key={r.id} className="space-y-1 rounded border p-3"><p className="font-semibold">{r.full_name} · {r.email}</p><p className="text-sm">{r.role} · {r.status==='assigned'?'Assignment recorded':'Completion unconfirmed'} · {new Date(r.created_at).toLocaleString()}</p><p className="text-xs">{r.email_sent?'Invitation email issue recorded; delivery is not verified.':'No invitation email issue recorded.'}</p>
    {r.status!=='assigned'&&(accountRoles.includes(r.role as typeof accountRoles[number])?<Button size="sm" variant="outline" disabled={busy} onClick={()=>{fileGeneration.current++;setRows([{email:r.email,fullName:r.full_name,role:r.role}]);setNotice('Saved request loaded for review. Processing will recheck current permissions and account state.');}}>Load {r.email} for review</Button>:superadmin&&r.role==='centre_director'?<Link className="text-sm underline" to="/landlord/onboarding">Recover through centre setup</Link>:<p className="text-sm">Contact the authorised centre-setup administrator for this role.</p>)}
   </article>)}
   {visible.length>20&&<nav aria-label="Account history pages" className="flex items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous requests</Button><span>Page {page+1} of {Math.ceil(visible.length/20)}</span><Button variant="outline" disabled={(page+1)*20>=visible.length} onClick={()=>setPage(p=>p+1)}>Next requests</Button></nav>}
  </section>
 </section>;
}
