import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {db} from '@/lib/db';
import {readAllocationContext,readAllocationReceipt,type AllocationContext} from '@/lib/reviewedModuleAllocation';
const field='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base';
export default function ReviewedModuleAllocation({uid,tenant,moduleId,onSaved}:{uid:string;tenant:string;moduleId:string;onSaved:()=>void}){
 const [open,setOpen]=useState(false),[context,setContext]=useState<AllocationContext|null>(null),[selected,setSelected]=useState(''),[review,setReview]=useState(''),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const alive=useRef(true),lock=useRef(false),request=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function run(action:()=>Promise<void>,failure:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch{if(alive.current)setError(failure);}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function clearReview(){setReview('');setNote('');setConfirmed(false);}
 async function load(target:string|null){
  setContext(null);clearReview();
  await run(async()=>{
   const r=await db.rpc('get_unipathway_reviewed_allocation',{p_module:moduleId,p_lecturer:target});
   if(r.error)throw Error();const c=readAllocationContext(r.data,tenant,moduleId,target,uid);
   if(alive.current){setContext(c);setSelected(target||'');}
  },'Allocation evidence could not be verified. No assignment action is available. Check centre activation or retry.');
 }
 const valid=!!context&&context.writes_enabled&&confirmed&&note.trim().length>=5&&note.trim().length<=1000&&context.selected_lecturer===(selected||null)&&(selected?context.reviews.some(r=>r.id===review):context.current_lecturer!==null);
 async function save(){
  if(!context||!valid)return;
  await run(async()=>{
   const payload={p_module:moduleId,p_lecturer:selected||null,p_review:selected?review:null,p_expected:context.updated_at,p_scope:context.module_scope,p_note:note.trim()};
   const key=JSON.stringify(payload);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
   const id=request.current.id;
   const r=await db.rpc('record_unipathway_reviewed_allocation',{p_id:id,...payload});if(r.error)throw Error();
   readAllocationReceipt(r.data,tenant,moduleId,{id,lecturer:payload.p_lecturer,review:payload.p_review,previous:context.current_lecturer,scope:context.module_scope,actor:uid});
   if(alive.current){setContext(null);clearReview();request.current=null;setNotice('Reviewed allocation recorded. Reload to confirm current evidence; review class invitations separately.');onSaved();}
  },'Allocation was not confirmed. Retry the same decision or reload to reconcile. A changed module, stale competency or conflicting timetable must be reviewed.');
 }
 return <section className="mt-3 min-w-0 space-y-3 border-t pt-3" aria-label="Reviewed lecturer allocation">
  <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Reviewed lecturer allocation</h3><p className="mt-1 text-xs text-muted-foreground">Match the actual module, framework and level to approved current evidence before assignment.</p></div><Button type="button" variant="outline" className="min-h-11" disabled={busy} aria-expanded={open} onClick={()=>{setOpen(v=>!v);if(open){setContext(null);clearReview();setNotice('');setError('');}}}>{open?'Close allocation':'Open allocation review'}</Button></div>
  {open&&<>
   <Button variant="outline" type="button" disabled={busy} onClick={()=>void load(null)}>Load module and eligible lecturers</Button>
   {context&&<>
    <div className="space-y-2 rounded-lg border bg-background p-3 text-sm [overflow-wrap:anywhere]"><p className="font-semibold">{context.module_scope.module_title}</p><p>{context.module_scope.programme_title} · {context.module_scope.level||'Level not recorded'} · {context.module_scope.awarding_body||'Framework not recorded'}</p><p>Current assignment: {context.current_lecturer?context.people.find(p=>p.id===context.current_lecturer)?.name||'Existing lecturer — membership requires review':'Unassigned'}</p><p className="font-medium">{context.decision_current?'Recorded allocation evidence is current':'No current verified module-specific decision'}</p>{!context.writes_enabled&&<p role="status">Read-only review. Allocation writes require centre activation.</p>}</div>
    <label className="block min-w-0 text-sm font-medium">Lecturer for reviewed allocation<select className={field} value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);clearReview();void load(e.target.value||null);}}><option value="">Unassign module</option>{context.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {selected&&(context.reviews.length? <fieldset className="min-w-0 space-y-2"><legend className="mb-2 text-sm font-semibold">Current approved competency</legend>{context.reviews.map(r=><label key={r.id} className="flex min-h-11 min-w-0 gap-2 rounded-lg border p-3 text-sm"><input type="radio" name={'allocation-review-'+moduleId} checked={review===r.id} disabled={busy} onChange={()=>{setReview(r.id);setConfirmed(false);}} className="mt-1 shrink-0 accent-primary"/><span className="min-w-0 [overflow-wrap:anywhere]"><strong>{r.subject}</strong> — {r.framework} · {r.maximum_level}</span></label>)}</fieldset>:<p className="text-sm">No current independently approved competency is available for the selected lecturer. Review the teaching application first.</p>)}
    {(selected?!!review:!!context.current_lecturer)&&<div className="space-y-3"><label className="block text-sm font-medium">{selected?'Module-specific academic fit and evidence reference':'Reason for removing the lecturer'}<textarea className={field} rows={3} maxLength={1000} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="Record the reviewed module and relevant evidence, not personal data"/></label><label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 shrink-0 accent-primary"/><span>{selected?'I have independently checked the subject, awarding framework, level and appointment scope for this specific module.':'I have reviewed the timetable and academic consequences of removing this lecturer.'}</span></label><Button type="button" disabled={busy||!valid} onClick={()=>void save()}>{selected?'Record reviewed assignment':'Record unassignment'}</Button></div>}
   </>}
   {busy&&<p role="status">Checking allocation records…</p>}{error&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
   <p className="text-xs text-muted-foreground">This is a human academic decision, not automatic accreditation or qualification equivalence. Existing allocations, revoked competencies, timetable changes and class invitations require continued review.</p>
  </>}
 </section>;
}
