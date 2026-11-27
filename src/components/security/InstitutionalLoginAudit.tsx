import {useEffect,useRef,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {INSTITUTIONAL_AUTH_ENABLED,institutionalEmail} from '@/lib/institutionalAuth';
import {LOGIN_AUDIT_DAYS,loginAuditCentre,verifyLoginAudit,type AuditDays,type LoginAuditSnapshot} from '@/lib/institutionalLoginAudit';

const labels={session_created:'Session created',assurance_changed:'MFA assurance changed',network_changed:'Network IP changed'};
export default function InstitutionalLoginAudit(){
 const {user}=useAuth();const centre=loginAuditCentre(user);
 if(!INSTITUTIONAL_AUTH_ENABLED||!centre)return null;
 return <AuditWorkspace key={user!.id+':'+centre+':'+user!.role} centre={centre}/>;
}
function AuditWorkspace({centre}:{centre:string}){
 const [days,setDays]=useState<AuditDays>(7),[email,setEmail]=useState('');
 const [snapshot,setSnapshot]=useState<LoginAuditSnapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef(false),generation=useRef(0),lock=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;generation.current++;};},[]);
 async function load(){
  if(lock.current||!active.current)return;
  const address=email.trim()?institutionalEmail(email):null;
  setSnapshot(null);setError('');
  if(email.trim()&&!address){setError('Enter an exact institutional email address, or leave the filter blank.');return;}
  lock.current=true;setBusy(true);const token=++generation.current;
  try{
   const result=await db.rpc('get_unipathway_login_audit',{p_centre:centre,p_days:days,p_email:address});
   if(result.error)throw Error();
   const verified=verifyLoginAudit(result.data,centre,days,address);
   if(active.current&&generation.current===token)setSnapshot(verified);
  }catch{if(active.current&&generation.current===token)setError('Login audit access or results could not be verified. Confirm the reviewer assignment and hosted audit activation.');}
  finally{lock.current=false;if(active.current&&generation.current===token)setBusy(false);}
 }
 return <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-6" aria-label="Institutional login audit">
  <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 shrink-0" aria-hidden="true"/>Institutional login audit</h2>
  <p className="text-sm text-muted-foreground">Restricted security review for this assigned centre. Server-recorded IP addresses do not establish a person's exact location. Only recorded session events with a historical centre assignment appear here; failed sign-in attempts remain in Auth audit logs.</p>
  <form className="grid min-w-0 gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void load();}}>
   <label className="block text-sm font-medium">Review period<select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={days} disabled={busy} onChange={e=>{setDays(Number(e.target.value) as AuditDays);setSnapshot(null);setError('');}}>{LOGIN_AUDIT_DAYS.map(day=><option key={day} value={day}>Last {day} days</option>)}</select></label>
   <label className="block min-w-0 text-sm font-medium">Institutional email (optional)<Input type="email" className="mt-1 min-h-11" autoComplete="off" maxLength={254} value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);setSnapshot(null);setError('');}} placeholder="name@unipathway.pk"/></label>
   <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={busy} className="min-h-11">{busy?'Verifying audit access…':'Review login events'}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>{setSnapshot(null);setEmail('');setDays(7);setError('');}}>Clear review</Button></div>
  </form>
  {error&&<p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}
  {snapshot&&<div className="space-y-3">
   <p role="status" className="text-sm font-medium">{snapshot.events.length} recorded events · {snapshot.days} days · reviewed {new Date(snapshot.reviewed_at).toLocaleString('en-GB',{timeZone:'Asia/Karachi'})} PKT</p>
   {snapshot.truncated&&<p className="rounded-lg border p-3 text-sm">Showing the latest 100 events. Narrow the period or enter an exact email. This is not a complete audit export.</p>}
   {!snapshot.events.length&&<p className="rounded-lg border p-3 text-sm">No matching recorded events were returned. This does not prove there were no sign-ins or security incidents.</p>}
   <div className="divide-y">{snapshot.events.map(event=><article key={event.id} className="grid min-w-0 gap-2 py-3 text-sm sm:grid-cols-2 xl:grid-cols-3 [overflow-wrap:anywhere]">
    <div><p className="font-medium">{event.email_at_event}</p><p className="text-muted-foreground">{labels[event.event_kind]}</p></div>
    <div><p className="font-medium">{event.ip||'IP not recorded'}</p><p className="text-muted-foreground">{event.aal==='aal2'?'MFA verified at event':event.aal==='aal1'?'AAL1 at event':'Assurance not established'}</p></div>
    <p className="text-muted-foreground">{new Date(event.occurred_at).toLocaleString('en-GB',{timeZone:'Asia/Karachi'})} PKT</p>
   </article>)}</div>
  </div>}
  <p className="text-xs text-muted-foreground">Reviews are recorded by the server. No bulk export, location inference, session tokens or unrestricted cross-centre browsing are available.</p>
 </section>;
}
