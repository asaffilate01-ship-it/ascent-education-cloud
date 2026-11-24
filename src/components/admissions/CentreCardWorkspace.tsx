import {useEffect,useRef,useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {calendarDay,calendarDayLabel} from '@/lib/academicCalendar';
import {cardDate,cardExpiryLimit,readCentreCard,readOwnCard,readCardRegistry,qrCardPayload,type CentreCard,type CardKind,type CardRegistry} from '@/lib/centreCards';
const enabled=import.meta.env.VITE_UNIPATHWAY_CENTRE_CARDS_ENABLED==='true';
const field='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base';
const statusLabel={active:'Active',revoked:'Revoked',expired:'Expired',eligibility_review:'Eligibility requires review'} as const;
export default function CentreCardWorkspace(){
 const {user,loading}=useAuth();
 if(loading||!user?.id||!user.tenantId||!user.roles?.includes(user.role)||!['student','lecturer','centre_director'].includes(user.role))return null;
 const role=user.role as CardKind|'centre_director';
 return <Workspace key={[user.id,user.tenantId,role,user.roles.join(',')].join(':')} uid={user.id} tenant={user.tenantId} role={role}/>;
}
function Workspace({uid,tenant,role}:{uid:string;tenant:string;role:CardKind|'centre_director'}){
 const today=calendarDay(),manager=role==='centre_director';
 const [open,setOpen]=useState(false),[kind,setKind]=useState<CardKind>(role==='lecturer'?'lecturer':'student'),[registry,setRegistry]=useState<CardRegistry|null>(null),[holder,setHolder]=useState<CentreCard|null|undefined>(undefined);
 const [person,setPerson]=useState(''),[expiry,setExpiry]=useState(''),[issueNote,setIssueNote]=useState(''),[revoking,setRevoking]=useState(''),[revokeNote,setRevokeNote]=useState(''),[page,setPage]=useState(0),[query,setQuery]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=useRef(true),lock=useRef(false),request=useRef<{fingerprint:string;id:string}|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 function clear(){setRegistry(null);setHolder(undefined);setPerson('');setRevoking('');setRevokeNote('');setPage(0);}
 async function run(action:()=>Promise<void>,failure:string){
  if(!enabled||lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch{if(active.current)setError(failure);}finally{lock.current=false;if(active.current)setBusy(false);}
 }
 async function load(){clear();await run(async()=>{
  if(manager){const r=await db.rpc('get_unipathway_centre_cards',{p_kind:kind});if(r.error)throw Error();const value=readCardRegistry(r.data,tenant,kind);if(active.current)setRegistry(value);}
  else{const r=await db.rpc('get_my_unipathway_centre_card',{p_kind:role});if(r.error)throw Error();const value=readOwnCard(r.data,tenant,role,uid);if(active.current)setHolder(value);}
 },'Card records could not be verified. No card or register is shown. Check centre activation and retry.');}
 const issueValid=manager&&!!registry?.people.some(p=>p.id===person)&&person!==uid&&cardDate(expiry)&&expiry>=today&&expiry<=cardExpiryLimit(today)&&issueNote.trim().length>=5;
 async function issue(){if(!issueValid)return;await run(async()=>{
  const fingerprint=JSON.stringify([tenant,person,kind,expiry,issueNote.trim()]);if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  const id=request.current.id;const r=await db.rpc('issue_unipathway_centre_card',{p_id:id,p_subject:person,p_kind:kind,p_expiry:expiry,p_reference:issueNote.trim()});
  if(r.error)throw Error();const card=readCentreCard(r.data,tenant,kind,{id,subject:person,expiry});
  if(active.current){clear();request.current=null;setIssueNote('');setExpiry('');setNotice('Card request recorded: '+statusLabel[card.status]+'. Reload the register before any further action.');}
 },'Issue not confirmed. Retry the exact request or reload to reconcile before changing it.');}
 async function revoke(){const target=registry?.cards.find(c=>c.id===revoking);if(!manager||!target||target.status==='revoked'||target.subject_id===uid||revokeNote.trim().length<5)return;
  await run(async()=>{const r=await db.rpc('revoke_unipathway_centre_card',{p_id:target.id,p_note:revokeNote.trim()});if(r.error)throw Error();
   readCentreCard(r.data,tenant,kind,{id:target.id,subject:target.subject_id,status:'revoked'});if(active.current){clear();setNotice('Card revoked. Reload the register before issuing a replacement.');}
  },'Revocation not confirmed. Retry the same reason or reload the register to reconcile.');}
 const visible=registry?.cards.filter(c=>[c.display_name,c.status,c.reference].some(v=>v.toLowerCase().includes(query.trim().toLowerCase())))||[],pages=Math.max(1,Math.ceil(visible.length/10));
 return <section className="my-5 min-w-0 space-y-4 rounded-xl border bg-card p-3 sm:p-5" aria-label="Centre identity cards">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{manager?'Centre identity card register':'My centre identity card'}</h2><p className="mt-1 text-sm text-muted-foreground">{manager?'Issue or revoke cards after reviewing the holder’s current identity and enrolment or appointment.':'View your current centre-issued digital card and QR reference.'}</p></div><Button type="button" variant="outline" aria-expanded={open} disabled={busy} onClick={()=>{setOpen(v=>!v);if(open)clear();}}>{open?'Hide identity cards':'Open identity cards'}</Button></div>
  {open&&(!enabled?<p role="status" className="text-sm">Centre identity cards require separate centre activation. No card has been issued by this screen.</p>:<>
   {manager&&<label className="block max-w-xs text-sm font-medium">Card holder type<select className={field} value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as CardKind);clear();setIssueNote('');setExpiry('');setQuery('');setError('');setNotice('');}}><option value="student">Student</option><option value="lecturer">Lecturer</option></select></label>}
   <Button variant="outline" type="button" disabled={busy} onClick={()=>void load()}>{manager?'Load centre card register':'Verify my card'}</Button>
   {!manager&&holder===null&&<p className="text-sm">No centre card has been issued for this role. Contact the centre director after your evidence has been reviewed.</p>}
   {!manager&&holder&&<article className="mx-auto max-w-md overflow-hidden rounded-2xl border bg-background" aria-label="Digital centre identity card">
    <header className="bg-primary p-4 text-primary-foreground"><p className="text-xs font-medium uppercase tracking-wider">UniPathway · Centre identity</p><h3 className="mt-2 break-words text-xl font-semibold">{holder.centre_name}</h3></header>
    <div className="space-y-3 p-4 [overflow-wrap:anywhere]"><p className="text-xs uppercase tracking-wide text-muted-foreground">{holder.kind} card</p><h3 className="text-lg font-semibold">{holder.display_name}</h3><p className="text-sm">Status: <strong>{statusLabel[holder.status]}</strong></p><p className="text-sm">Issued {calendarDayLabel(holder.issued_on)} · Expires {calendarDayLabel(holder.expires_on)}</p>
    {holder.status==='active'&&holder.expires_on>=today?<><div className="flex justify-center rounded-lg bg-white p-3"><QRCodeSVG value={qrCardPayload(holder.reference)} size={172} level="M" marginSize={4} title="Centre card reference QR code" className="h-auto max-w-full"/></div><p className="text-center text-xs font-mono break-all">{holder.reference}</p><p className="text-xs text-muted-foreground">Show this to your assigned lecturer. A copied QR is not proof of presence; staff must confirm identity and record attendance explicitly.</p></>:<p className="rounded-lg border p-3 text-sm">This card cannot be used for a current register lookup. Contact your centre for review.</p>}</div>
   </article>}
   {manager&&registry&&<>
    <section className="space-y-3 rounded-lg border p-3" aria-label="Issue centre card"><h3 className="font-semibold">Issue centre card</h3><p className="text-sm text-muted-foreground">Only holders with current independently verified identity evidence appear. Students also need active enrolment. Confirm the actual student admission or lecturer appointment, any applicable fee conditions and the issue reference independently; this screen does not create an enrolment or employment contract.</p>
     <div className="grid gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-medium">Verified holder<select className={field} value={person} disabled={busy} onChange={e=>setPerson(e.target.value)}><option value="">Choose holder</option>{registry.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="block min-w-0 text-sm font-medium">Expiry date (PKT)<input type="date" className={field} min={today} max={cardExpiryLimit(today)} value={expiry} disabled={busy} onChange={e=>setExpiry(e.target.value)}/></label><label className="block min-w-0 text-sm font-medium sm:col-span-2">Reviewed issue reference<input className={field} maxLength={500} value={issueNote} disabled={busy} onChange={e=>setIssueNote(e.target.value)} placeholder="Approved admission or appointment record"/></label></div><p className="text-xs text-muted-foreground">Use a record reference, never identity numbers, credentials or private document links.</p><Button type="button" disabled={busy||!issueValid} onClick={()=>void issue()}>Issue digital card</Button>
    </section>
    <section className="space-y-3" aria-label="Latest centre card records"><h3 className="font-semibold">Latest card per holder</h3><label className="block text-sm font-medium">Find issued cards<input className={field} type="search" maxLength={120} value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);setPage(0);setRevoking('');}}/></label><p role="status" className="text-sm text-muted-foreground">{visible.length} matching card records</p>
     {!visible.length?<p className="text-sm">No matching issued cards.</p>:<ul className="grid gap-3 xl:grid-cols-2">{visible.slice(page*10,page*10+10).map(c=><li key={c.id} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><h4 className="font-semibold">{c.display_name}</h4><p>{statusLabel[c.status]} · expires {calendarDayLabel(c.expires_on)}</p><p className="text-xs font-mono break-all">{c.reference}</p>{c.status!=='revoked'&&c.subject_id!==uid&&<Button type="button" variant="outline" disabled={busy} aria-expanded={revoking===c.id} onClick={()=>{setRevoking(v=>v===c.id?'':c.id);setRevokeNote('');}}>Revoke card<span className="sr-only"> {c.display_name}</span></Button>}{revoking===c.id&&<div className="space-y-2 border-t pt-2"><label className="block text-sm">Revocation reason<textarea className={field} rows={3} maxLength={500} disabled={busy} value={revokeNote} onChange={e=>setRevokeNote(e.target.value)}/></label><Button type="button" disabled={busy||revokeNote.trim().length<5} onClick={()=>void revoke()}>Confirm revocation</Button></div>}</li>)}</ul>}
     {pages>1&&<nav aria-label="Identity card pages" className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={busy||page===0} onClick={()=>{setPage(v=>v-1);setRevoking('');}}>Previous cards</Button><span className="text-sm">Page {page+1} of {pages}</span><Button type="button" variant="outline" disabled={busy||page+1>=pages} onClick={()=>{setPage(v=>v+1);setRevoking('');}}>Next cards</Button></nav>}
    </section>
   </>}
   {busy&&<p role="status">Verifying centre cards…</p>}{error&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}
   <p className="text-xs text-muted-foreground">Internal centre identity only, not a government identity document, official qualification, entry credential or automatic attendance mark. Refresh to verify current status.</p>
  </>)}
 </section>;
}
