import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {db} from '@/lib/db';
import {calendarDateInPakistan,deadlineKinds,deadlineStatus,validateDeadline,type DeadlineKind} from '@/lib/scholarshipResearch';
import {verifyStudentPlans,type StudentPlan} from '@/lib/studentApplicationPlans';

const enabled=import.meta.env.VITE_UNIPATHWAY_STUDENT_PLANS_ENABLED==='true';
const table='unipathway_student_application_plans';
const blank={title:'',kind:'University application' as DeadlineKind,date:'',source:''};
const statusText={completed:'Completed',past:'Past planning date',today:'Today','next-seven-days':'Within 7 days',upcoming:'Upcoming'};

export default function StudentApplicationPlans({tenant,owner}:{tenant:string;owner:string}){
 return <Workspace key={tenant+':'+owner} tenant={tenant} owner={owner}/>;
}
function Workspace({tenant,owner}:{tenant:string;owner:string}){
 const [revision,setRevision]=useState(0);
 const [snapshot,setSnapshot]=useState<{revision:number;items:StudentPlan[]|null;error:boolean}>({revision:-1,items:null,error:false});
 const [draft,setDraft]=useState(blank);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [deleteId,setDeleteId]=useState('');
 const lock=useRef(false),alive=useRef(false);
 const request=useRef<{id:string;key:string}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;
  void (async()=>{
   try{
    const {data,error}=await db.rpc('get_unipathway_student_application_plans',{p_tenant:tenant});
    if(error)throw error;
    const items=verifyStudentPlans(data,tenant,owner);
    if(active)setSnapshot({revision,items,error:false});
   }catch{if(active)setSnapshot({revision,items:null,error:true});}
  })();
  return()=>{active=false;};
 },[tenant,owner,revision]);
 const items=snapshot.revision===revision?snapshot.items:null;
 const failed=snapshot.revision===revision&&snapshot.error;
 const today=calendarDateInPakistan();
 const refresh=()=>setRevision(n=>n+1);
 async function mutate(operation:()=>PromiseLike<{data:unknown;error:unknown}>,id:string,onSuccess:()=>void){
  if(!enabled||!items||lock.current||!alive.current)return;
  lock.current=true;setBusy(true);setNotice('');setError('');
  try{
   const result=await operation();
   const data=result.data as {id?:unknown;tenant_id?:unknown;owner_id?:unknown}|null;
   if(result.error||data?.id!==id||data.tenant_id!==tenant||data.owner_id!==owner)throw Error('Unconfirmed mutation');
   if(alive.current)onSuccess();
  }catch{if(alive.current)setError('The change could not be confirmed. Review the refreshed list before trying again.');}
  finally{lock.current=false;if(alive.current){setBusy(false);refresh();}}
 }
 function add(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(lock.current||!items)return;
  const valid=validateDeadline(draft);
  if(!valid||valid.date<'1900-01-01'||valid.date>'9999-12-31'){setError('Enter a valid planning title and date.');return;}
  const key=JSON.stringify(valid);
  if(!request.current||request.current.key!==key)request.current={id:crypto.randomUUID(),key};
  const id=request.current.id;
  if(items.some(item=>item.id===id)){request.current=null;setDraft(blank);setError('');setNotice('This planning entry is already recorded.');return;}
  if(items.some(item=>item.title.toLowerCase()===valid.title.toLowerCase()&&item.date===valid.date&&item.kind===valid.kind)){setError('This planning entry is already recorded.');return;}
  void mutate(()=>db.from(table).insert({tenant_id:tenant,id,title:valid.title,category:valid.kind,planning_date:valid.date}).select('id,tenant_id,owner_id').single(),id,()=>{request.current=null;setDraft(blank);setNotice('Planning entry saved.');});
 }
 function complete(item:StudentPlan){
  void mutate(()=>db.from(table).update({completed:!item.completed}).eq('tenant_id',tenant).eq('owner_id',owner).eq('id',item.id).select('id,tenant_id,owner_id').maybeSingle(),item.id,()=>setNotice(item.completed?'Planning entry reopened.':'Planning entry completed.'));
 }
 function remove(item:StudentPlan){
  void mutate(()=>db.from(table).delete().eq('tenant_id',tenant).eq('owner_id',owner).eq('id',item.id).select('id,tenant_id,owner_id').maybeSingle(),item.id,()=>{setDeleteId('');setNotice('Planning entry removed.');});
 }
 return <section className="mb-5 rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="student-application-plans">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="student-application-plans" className="text-lg font-bold">My application planning dates</h2>{enabled&&<Button variant="outline" disabled={busy||(!items&&!failed)} onClick={refresh}>Refresh plans</Button>}</div>
  <p className="mt-2 text-sm text-muted-foreground">Personal study and funding planning, separate from centre-wide calendar events. Use generic titles; do not enter passport numbers, financial details or documents. Dates use Pakistan time and are not official application cutoffs.</p>
  {!enabled?<p className="mt-3 text-sm text-muted-foreground">Account-based planning is not activated. <Link className="underline" to="/scholarships#international-scholarship-research">Use the temporary scholarship planner</Link>.</p>:failed?<p role="alert" className="mt-3 text-sm text-destructive">Your private planning register could not be verified. Check your access or retry.</p>:!items?<p role="status" className="mt-3 text-sm">Verifying your private planning records…</p>:<>
   <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
    <label className="block text-sm font-medium">Planning title<Input required maxLength={120} className="mt-1 min-h-11" value={draft.title} onChange={e=>setDraft(old=>({...old,title:e.target.value}))} disabled={busy}/></label>
    <label className="block text-sm font-medium">Category<select className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={draft.kind} onChange={e=>setDraft(old=>({...old,kind:e.target.value as DeadlineKind}))} disabled={busy}>{deadlineKinds.map(k=><option key={k}>{k}</option>)}</select></label>
    <label className="block text-sm font-medium">Personal planning date<Input required type="date" min="1900-01-01" max="9999-12-31" className="mt-1 min-h-11" value={draft.date} onChange={e=>setDraft(old=>({...old,date:e.target.value}))} disabled={busy}/></label>
    <Button type="submit" className="self-end min-h-11" disabled={busy||items.length>=500}>Save planning entry</Button>
   </form>
   {!items.length&&<p className="mt-4 text-sm text-muted-foreground">No private planning records were returned for your verified account.</p>}
   <div className="mt-4 divide-y">{items.map(item=><article key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.kind} · {item.date} · {statusText[deadlineStatus(item.date,today,item.completed)]}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>complete(item)}>{item.completed?'Reopen':'Complete'}</Button>{deleteId===item.id?<><Button variant="destructive" disabled={busy} onClick={()=>remove(item)}>Confirm remove</Button><Button variant="outline" disabled={busy} onClick={()=>setDeleteId('')}>Cancel</Button></>:<Button variant="outline" disabled={busy} aria-label={'Remove '+item.title} onClick={()=>setDeleteId(item.id)}>Remove</Button>}</div></article>)}</div>
  </>}
  {notice&&<p role="status" className="mt-3 text-sm">{notice}</p>}{error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
 </section>;
}
