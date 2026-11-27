import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {db} from '@/lib/db';
import {pakistanCalendarDate} from '@/lib/facilitiesPlanning';
import type {FacilityRegister} from '@/lib/facilitiesRegister';
import {followupTeams,openFollowupPayload,resolveFollowupPayload,verifyFollowups,verifyFollowupReceipt,type Followup,type FollowupTeam,type FollowupCommand,type OpenFollowupDraft} from '@/lib/facilitiesFollowups';

const empty=():OpenFollowupDraft=>({inspectionId:'',task:'',team:'facilities',targetDate:pakistanCalendarDate()});
const field='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2';
const label=(value:string)=>value.replace(/_/g,' ');
export default function FacilitiesFollowupWorkspace({tenant,register,writer}:{tenant:string;register:FacilityRegister|null;writer:boolean}){
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{register:FacilityRegister;revision:number;rows:Followup[]|null}|null>(null);
 const [draft,setDraft]=useState(empty);
 const [resolveId,setResolveId]=useState('');
 const [evidence,setEvidence]=useState('');
 const [filter,setFilter]=useState('open');
 const [pending,setPending]=useState<FollowupCommand|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const alive=useRef(false),lock=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  if(!register)return;
  let active=true;
  void (async()=>{
   try{
    const {data,error:e}=await db.rpc('get_unipathway_facilities_followups',{p_tenant:tenant});
    if(e)throw e;
    const rows=verifyFollowups(data,tenant,register);
    if(active)setState({register,revision,rows});
   }catch{if(active)setState({register,revision,rows:null});}
  })();
  return()=>{active=false;};
 },[tenant,register,revision]);
 const verified=!!register&&!!state&&state.register===register&&state.revision===revision;
 const rows=verified&&state?state.rows:null;
 const refresh=()=>setRevision(n=>n+1);
 const today=pakistanCalendarDate();
 const locked=!writer||!register||!rows||busy||!!pending;
 const open=rows?.filter(row=>!row.resolved_at)??[];
 const visible=rows?.filter(row=>filter==='all'||(filter==='open'&&!row.resolved_at)||(filter==='overdue'&&!row.resolved_at&&row.target_date<today)||(filter==='resolved'&&!!row.resolved_at))??[];
 const eligible=register?.inspections.filter(i=>['defect','not_verified'].includes(i.outcome)&&!open.some(row=>row.inspection_id===i.id))??[];
 const assetName=(id:string)=>register?.assets.find(a=>a.id===id)?.asset_code??'Unavailable asset';
 async function send(command:FollowupCommand){
  if(!writer||lock.current||!alive.current)return;
  lock.current=true;setBusy(true);setPending(command);setError('');setNotice('');
  try{
   const {data,error:e}=await db.rpc('unipathway_record_facilities_followup',{p_tenant:tenant,p_request:command.requestId,p_kind:command.kind,p_payload:command.payload});
   if(e)throw e;
   const action=verifyFollowupReceipt(data,tenant,command);
   if(!alive.current)return;
   setPending(null);setNotice('Database acknowledged '+(command.kind==='open'?'the follow-up':'the recorded resolution')+'. Reference: '+action+'.');
   if(command.kind==='open')setDraft(empty());else{setResolveId('');setEvidence('');}
   refresh();
  }catch{
   if(alive.current){setError('The result could not be confirmed. Retry the exact same request or ask an authorised operator to reconcile it before leaving.');refresh();}
  }finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>,kind:FollowupCommand['kind']){
  event.preventDefault();
  if(locked||!register||!rows||lock.current)return;
  try{
   if(kind==='open')void send({kind,requestId:crypto.randomUUID(),payload:openFollowupPayload(draft,register,rows,today)});
   else void send({kind,requestId:crypto.randomUUID(),payload:resolveFollowupPayload(resolveId,evidence,rows)});
  }catch(e){setError(e instanceof Error?e.message:'Invalid follow-up details.');}
 }
 return <section className="mt-5 min-w-0 rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="facilities-followup-title">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="facilities-followup-title" className="font-semibold">Maintenance follow-up register</h2><Button type="button" variant="outline" disabled={!register||!verified||busy} onClick={refresh}>Refresh follow-ups</Button></div>
  <p className="mt-2 text-sm text-muted-foreground">Track work needed after recorded defects or unverified inspections. A responsible team is a planning label, not a notification or individual staff assignment. Recording resolution evidence does not clear the original inspection or certify equipment safety.</p>
  {!register?<p role="status" className="mt-3 text-sm">Verify the facilities register before reviewing follow-ups.</p>:!verified?<p role="status" className="mt-3 text-sm">Verifying centre follow-up records…</p>:!rows?<p role="alert" className="mt-3 text-sm text-destructive">Follow-up records could not be verified. Check hosted activation and centre permissions, then refresh.</p>:null}
  {error&&<p role="alert" className="mt-3 rounded-lg border p-3 text-sm text-destructive">{error}</p>}
  {notice&&<p role="status" className="mt-3 break-words text-sm">{notice}</p>}
  {pending&&<div className="mt-3 rounded-lg border p-3"><p className="text-sm font-semibold">{busy?'Recording request':'Request awaiting confirmation'}</p><p className="mt-1 break-all text-xs">Request: {pending.requestId}</p><p className="mt-2 text-sm">Keep this workspace open until the request is reconciled. No new command can be submitted while this request is uncertain.</p><Button type="button" className="mt-3" variant="outline" disabled={busy||!writer} onClick={()=>void send(pending)}>Retry exact follow-up request</Button></div>}
  {rows&&<><div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Open follow-ups',open.length],['Overdue follow-ups',open.filter(row=>row.target_date<today).length],['Resolution records',rows.length-open.length]].map(([name,n])=><article key={name} className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">{name}</p><p className="text-xl font-semibold">{n}</p></article>)}</div>
   <label className="mt-4 block text-sm font-medium">Follow-up filter<select className={field} value={filter} onChange={e=>setFilter(e.target.value)}><option value="open">Open follow-ups</option><option value="overdue">Overdue follow-ups</option><option value="resolved">Resolution recorded</option><option value="all">All follow-ups</option></select></label>
   <p className="mt-2 text-sm text-muted-foreground">{visible.length} of {rows.length} records shown · Pakistan date {today}</p>
   {!visible.length&&<p className="mt-3 text-sm">No matching follow-ups in this verified register.</p>}
   <div className="mt-3 divide-y">{visible.map(row=><article key={row.id} className="min-w-0 space-y-2 py-3 [overflow-wrap:anywhere]"><h3 className="font-medium">{assetName(row.asset_id)} · {label(row.team)}</h3><p className="whitespace-pre-wrap text-sm">{row.task}</p><p className="text-sm text-muted-foreground">Target date: {row.target_date} · {row.resolved_at?'Resolution recorded':row.target_date<today?'Overdue':'Open'}</p>{row.resolution_evidence&&<div className="rounded-lg border p-3 text-sm"><p className="font-medium">Recorded resolution evidence</p><p className="whitespace-pre-wrap">{row.resolution_evidence}</p></div>}</article>)}</div></>}
  {writer&&<div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
   <form onSubmit={e=>submit(e,'open')} className="min-w-0 rounded-lg border p-3"><fieldset disabled={locked||!eligible.length||(rows?.length??0)>=500} className="min-w-0 space-y-3"><legend className="font-semibold">Create follow-up</legend>
    <label className="block text-sm font-medium">Inspection finding<select className={field} value={draft.inspectionId} required onChange={e=>setDraft(d=>({...d,inspectionId:e.target.value}))}><option value="">Choose an inspection</option>{eligible.map(i=><option key={i.id} value={i.id}>{assetName(i.asset_id)} — {i.inspected_on} — {label(i.outcome)}</option>)}</select></label>
    <label className="block text-sm font-medium">Required work<textarea required maxLength={1000} rows={3} className={field} value={draft.task} onChange={e=>setDraft(d=>({...d,task:e.target.value}))}/></label>
    <label className="block text-sm font-medium">Responsible team<select className={field} value={draft.team} onChange={e=>setDraft(d=>({...d,team:e.target.value as FollowupTeam}))}>{followupTeams.map(team=><option value={team} key={team}>{label(team)}</option>)}</select></label>
    <label className="block text-sm font-medium">Target date (Pakistan)<Input type="date" required min={today} className="mt-1" value={draft.targetDate} onChange={e=>setDraft(d=>({...d,targetDate:e.target.value}))}/></label>
    <Button type="submit" className="min-h-11">Record follow-up</Button>
   </fieldset></form>
   <form onSubmit={e=>submit(e,'resolve')} className="min-w-0 rounded-lg border p-3"><fieldset disabled={locked||!open.length} className="min-w-0 space-y-3"><legend className="font-semibold">Record resolution evidence</legend>
    <label className="block text-sm font-medium">Open follow-up<select required className={field} value={resolveId} onChange={e=>setResolveId(e.target.value)}><option value="">Choose a follow-up</option>{open.map(row=><option key={row.id} value={row.id}>{assetName(row.asset_id)} — {row.target_date} — {row.task.slice(0,80)}</option>)}</select></label>
    <label className="block text-sm font-medium">Resolution evidence<textarea required maxLength={2000} rows={4} className={field} value={evidence} onChange={e=>setEvidence(e.target.value)}/></label>
    <p className="text-xs text-muted-foreground">Record factual completed work or a report reference. Do not include personal data, provider credentials or unsupported safety claims. The original inspection is retained.</p><Button type="submit" className="min-h-11">Record resolution</Button>
   </fieldset></form>
  </div>}
  {!writer&&<p className="mt-3 text-sm text-muted-foreground">Read-only access. A verified centre director with the facilities write switch and hosted permissions is required to record follow-up work.</p>}
 </section>;
}
