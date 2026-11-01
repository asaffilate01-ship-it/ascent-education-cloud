import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {POST_CLASS_EXPLANATION,ACCOMMODATION_EXPLANATION} from '@/lib/learning/classRelease';

type ClassRow={id:string;title:string;module_id:string;ends_at:string;
 starts_at:string;actual_ended_at:string|null;status:string;end_evidence_reference:string|null};
const enabled=import.meta.env.VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED==='true';
export default function ClassReleaseManager(){
 const {user}=useAuth();
 return <ReleaseWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function ReleaseWorkspace(){
 const {user}=useAuth();
 const role=user?.role||'';
 const permitted=!!user?.id&&!!user.tenantId&&user.roles?.includes(user.role)&&
  ['lecturer','programme_leader','centre_director'].includes(role);
 const manager=permitted&&['programme_leader','centre_director'].includes(role);
 const [classes,setClasses]=useState<ClassRow[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [selected,setSelected]=useState(''),[evidence,setEvidence]=useState(''),[urgentReason,setUrgentReason]=useState('');
 useEffect(()=>{
  let active=true;setClasses([]);setSelected('');setLoading(true);setError('');
  if(!permitted||!enabled){setLoading(false);return()=>{active=false;};}
  void(async()=>{
   try{
    let query=db.from('live_class_sessions').select('id,title,module_id,starts_at,ends_at,actual_ended_at,status,end_evidence_reference')
     .eq('tenant_id',user!.tenantId!).order('starts_at',{ascending:false}).limit(200);
    if(role==='lecturer'){
     const mine=await db.from('modules').select('id').eq('tenant_id',user!.tenantId!)
      .eq('lecturer_id',user!.id).limit(300);
     if(mine.error)throw Error('Assigned modules unavailable.');
     const ids=(mine.data||[]).map((x:{id:string})=>x.id);
     if(!ids.length){if(active)setClasses([]);return;}
     query=query.in('module_id',ids);
    }
    const result=await query;
    if(result.error||!Array.isArray(result.data))throw Error('Classes are not available to this centre and role.');
    if(active)setClasses(result.data as ClassRow[]);
   }catch{if(active)setError('Verified centre classes could not be loaded. No release approvals are available.');}
   finally{if(active)setLoading(false);}
  })();return()=>{active=false;};
 },[permitted,role,user?.id,user?.tenantId,refresh]);
 const item=classes.find(c=>c.id===selected);
 const currentClass=item&&item.status!=='cancelled'?item:null;
 async function complete(){
  if(!currentClass||busy||!enabled||!permitted||!!currentClass.actual_ended_at||evidence.trim().length<12)return;
  if(!window.confirm('Confirm that this class has ended and the recorded evidence reference is accurate? This begins the post-class waiting period.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const r=await (db.rpc as any)('confirm_unipathway_actual_class_end',{
    p_session:currentClass.id,p_evidence:evidence.trim(),
   });
   if(r.error||r.data?.sessionId!==currentClass.id||!r.data?.actualEnd)throw Error('Unconfirmed end time.');
   setEvidence('');setNotice('The backend confirmed the class-end record. Standard materials remain locked for 24 hours following the verified end.');
   setRefresh(x=>x+1);
  }catch{setError('Class end was not confirmed. Refresh the class status before retrying.');}
  finally{setBusy(false);}
 }
 async function approveUrgent(){
  if(!currentClass||busy||!manager||!currentClass.actual_ended_at||urgentReason.trim().length<20)return;
  if(!window.confirm('Approve an exceptionally urgent 12-hour release? This is not immediate access and your reason will be permanently recorded.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const r=await (db.rpc as any)('approve_unipathway_urgent_class_release',{
    p_session:currentClass.id,p_reason:urgentReason.trim(),
   });
   if(r.error||r.data?.sessionId!==currentClass.id||r.data?.hours!==12)throw Error('Approval was not confirmed.');
   setUrgentReason('');setNotice('The 12-hour exception was recorded. The same private storage and enrolment permissions remain in force.');
   setRefresh(x=>x+1);
  }catch{setError('Urgent release was not confirmed. Check the manager role, verified class end and current approval status.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Post-class material release" subtitle="Academic control of class completion and exceptional recorded release">
  <div className="space-y-5">
   <section className="rounded-xl border bg-card p-5 space-y-2">
    <h2 className="font-semibold">24 hours normally · 12 hours for an exceptional urgent approval</h2>
    <p className="text-sm">{POST_CLASS_EXPLANATION}</p>
    <p className="text-sm text-muted-foreground">{ACCOMMODATION_EXPLANATION}</p>
    <p className="text-xs text-muted-foreground">The delay is not a substitute for actual attendance records or accessibility provision. An authorised class-end record is necessary; a calendar entry or scheduled finish alone is insufficient.</p>
   </section>
   {!permitted?<p role="alert">Only an active Centre Director, Programme Leader or lecturer with a verified centre can use this academic control.</p>:
    !enabled?<p role="status" className="rounded-xl border p-5">This release manager is staged. The class-end, manager approval and storage embargo backend must be installed and verified before these actions are enabled.</p>:<>
     <section className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Classes within my authorised teaching scope</h2>
       <Button variant="outline" disabled={busy||loading} onClick={()=>setRefresh(x=>x+1)}>Refresh class list</Button></div>
      {loading&&<p role="status">Verifying class records…</p>}
      {error&&<p role="alert">{error}</p>}
      {notice&&<p role="status">{notice}</p>}
      {!loading&&!error&&!classes.length&&<p className="text-sm text-muted-foreground">No accessible class records are available. Use the approved class scheduler to create invitations first.</p>}
      <label className="block text-sm font-medium max-w-xl">Select the completed or upcoming class
       <select value={selected} onChange={e=>{setSelected(e.target.value);setEvidence('');setUrgentReason('');}}
        className="mt-2 w-full min-h-11 rounded-md border bg-background px-3" disabled={loading||busy}>
        <option value="">Choose class</option>
        {classes.map(c=><option key={c.id} value={c.id}>{c.title} · {c.status} · {new Date(c.ends_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}</option>)}
       </select>
      </label>
     </section>
     {currentClass&&<section className="rounded-xl border bg-card p-5 space-y-4" aria-label="Class resource release approval">
      <h2 className="font-semibold">{currentClass.title}</h2>
      <p className="text-sm">Class status: {currentClass.status}. {currentClass.actual_ended_at?
       `Actual end recorded: ${new Date(currentClass.actual_ended_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}.`:
       'The class has no verified actual end yet; students cannot view associated resources.'}</p>
      {!currentClass.actual_ended_at&&<>
       <label className="block text-sm font-medium">Evidence that this class actually finished
        <Input className="mt-2" maxLength={500} value={evidence} onChange={e=>setEvidence(e.target.value)}
         placeholder="Attendance register, meeting-end reference or signed teaching log"/>
       </label>
       <Button disabled={busy||evidence.trim().length<12} onClick={()=>void complete()}>Confirm actual class end</Button>
      </>}
      {manager&&currentClass.actual_ended_at&&<div className="border-t pt-4 space-y-3">
       <h3 className="font-semibold">Exceptionally urgent: manager approval</h3>
       <p className="text-sm text-muted-foreground">An urgent exception changes 24 hours to 12 hours after the verified end. It never releases immediately, bypasses enrolment or creates access to a cancelled class.</p>
       <label className="block text-sm font-medium">Reason and evidence for urgent 12-hour release
        <Textarea rows={3} maxLength={500} value={urgentReason} onChange={e=>setUrgentReason(e.target.value)}
         className="mt-2" placeholder="Document the exceptional educational need, authorisation and evidence reference."/>
       </label>
       <Button variant="outline" disabled={busy||urgentReason.trim().length<20} onClick={()=>void approveUrgent()}>Approve documented 12-hour exception</Button>
      </div>}
     </section>}
    </>}
   <nav className="flex flex-wrap gap-3">
    <Link to="/lecturer/materials" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm">Course materials</Link>
    <Link to={manager?'/programme/schedule':'/lecturer/class-scheduler'} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm">Class scheduling</Link>
   </nav>
  </div>
 </DashboardLayout>;
}
