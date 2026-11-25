import ReviewedModuleAllocation from '@/components/admissions/ReviewedModuleAllocation';
import LecturerAllocationEvidence from '@/components/admissions/LecturerAllocationEvidence';
import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Lecturer={user_id:string;full_name:string};
type AssignmentProps={moduleId:string;tenantId:string;lecturerId:string|null;onSaved:()=>void};
const reviewedEnabled=import.meta.env.VITE_UNIPATHWAY_REVIEWED_ALLOCATION_ENABLED==='true';
export default function ModuleLecturerAssignment(props:AssignmentProps){
 const {user,loading}=useAuth();
 if(loading||!user?.id||!user.roles?.includes(user.role)||!['superadmin','centre_director','programme_leader'].includes(user.role))return null;
 const key=[user.id,user.tenantId,user.role,user.roles.join(','),props.tenantId,props.moduleId].join(':');
 if(reviewedEnabled){
  if(user.tenantId!==props.tenantId||user.role==='programme_leader')return <p className="mt-3 text-xs text-muted-foreground">Reviewed allocations require a verified director or platform owner in this centre.</p>;
  return <ReviewedModuleAllocation key={key} uid={user.id} tenant={props.tenantId} moduleId={props.moduleId} onSaved={props.onSaved}/>;
 }
 return <LegacyAssignment key={key} {...props}/>;
}
function LegacyAssignment({moduleId,tenantId,lecturerId,onSaved}:AssignmentProps){
 const {user}=useAuth();const [lecturers,setLecturers]=useState<Lecturer[]>([]),[selected,setSelected]=useState(lecturerId||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const allowed=!!user&&['superadmin','centre_director','programme_leader'].includes(user.role)&&(user.role==='superadmin'||user.tenantId===tenantId);
 useEffect(()=>{let active=true;setReady(false);setError('');setLecturers([]);setSelected(lecturerId||'');if(!allowed)return;void(async()=>{
  const r=await db.from('user_roles').select('user_id').eq('role','lecturer').eq('tenant_id',tenantId);if(r.error)throw r.error;
  const ids=[...new Set((r.data||[]).map((x:{user_id:string})=>x.user_id))];
  const p=ids.length?await db.from('profiles').select('user_id,full_name').eq('tenant_id',tenantId).in('user_id',ids).order('full_name'):{data:[],error:null};if(p.error)throw p.error;
  if(active){setLecturers(p.data||[]);setReady(true);}
 })().catch(()=>{if(active)setError('Lecturer choices could not be loaded. Check your role and centre assignment.');});return()=>{active=false};},[allowed,tenantId,lecturerId,moduleId,user?.id]);
 if(!allowed)return null;
 async function save(){if(busy||!ready||(selected&&!lecturers.some(l=>l.user_id===selected)))return;setBusy(true);setError('');try{
  const r=await db.from('modules').update({lecturer_id:selected||null}).eq('id',moduleId).eq('tenant_id',tenantId).select('id').single();if(r.error||!r.data)throw Error();onSaved();
 }catch{setError('Assignment was not saved. Only an authorised manager can assign a lecturer from this centre.');}finally{setBusy(false);}}
 return <div className="mt-3 w-full border-t pt-3"><label htmlFor={`lecturer-${moduleId}`} className="text-xs font-semibold">Assigned lecturer</label><div className="mt-1 flex flex-wrap gap-2"><select id={`lecturer-${moduleId}`} value={selected} onChange={e=>setSelected(e.target.value)} disabled={!ready||busy} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"><option value="">Unassigned</option>{lecturerId&&!lecturers.some(l=>l.user_id===lecturerId)&&<option value={lecturerId}>Current assignment — verify staff role</option>}{lecturers.map(l=><option value={l.user_id} key={l.user_id}>{l.full_name}</option>)}</select><Button disabled={!ready||busy||selected===(lecturerId||'')||(!!selected&&!lecturers.some(l=>l.user_id===selected))} onClick={save} variant="outline">{busy?'Saving…':'Save lecturer'}</Button></div>{selected&&ready&&user?.tenantId===tenantId&&user.roles?.includes(user.role)&&['centre_director','superadmin'].includes(user.role)&&<LecturerAllocationEvidence key={user.id+':'+tenantId+':'+selected} tenantId={tenantId} lecturerId={selected}/>} {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}<p className="mt-2 text-xs text-muted-foreground">Review existing schedules and class invitations separately after changing the lecturer.</p></div>;
}
