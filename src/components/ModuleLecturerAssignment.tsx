import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Lecturer={user_id:string;full_name:string};
export default function ModuleLecturerAssignment({moduleId,tenantId,lecturerId,onSaved}:{moduleId:string;tenantId:string;lecturerId:string|null;onSaved:()=>void}){
 const {user}=useAuth();const [lecturers,setLecturers]=useState<Lecturer[]>([]),[selected,setSelected]=useState(lecturerId||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const allowed=!!user&&['superadmin','centre_director','programme_leader'].includes(user.role)&&(user.role==='superadmin'||user.tenantId===tenantId);
 useEffect(()=>{let active=true;setReady(false);setError('');setLecturers([]);setSelected(lecturerId||'');if(!allowed)return;void(async()=>{
  const r=await db.from('user_roles').select('user_id').eq('role','lecturer');if(r.error)throw r.error;
  const ids=[...new Set((r.data||[]).map((x:{user_id:string})=>x.user_id))];
  const p=ids.length?await db.from('profiles').select('user_id,full_name').eq('tenant_id',tenantId).in('user_id',ids).order('full_name'):{data:[],error:null};if(p.error)throw p.error;
  if(active){setLecturers(p.data||[]);setReady(true);}
 })().catch(()=>{if(active)setError('Lecturer choices could not be loaded. Check your role and centre assignment.');});return()=>{active=false};},[allowed,tenantId,lecturerId,moduleId,user?.id]);
 if(!allowed)return null;
 async function save(){if(busy||!ready)return;setBusy(true);setError('');try{
  const r=await db.from('modules').update({lecturer_id:selected||null}).eq('id',moduleId).eq('tenant_id',tenantId).select('id').single();if(r.error||!r.data)throw Error();onSaved();
 }catch{setError('Assignment was not saved. Only an authorised manager can assign a lecturer from this centre.');}finally{setBusy(false);}}
 return <div className="mt-3 w-full border-t pt-3"><label htmlFor={`lecturer-${moduleId}`} className="text-xs font-semibold">Assigned lecturer</label><div className="mt-1 flex flex-wrap gap-2"><select id={`lecturer-${moduleId}`} value={selected} onChange={e=>setSelected(e.target.value)} disabled={!ready||busy} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"><option value="">Unassigned</option>{lecturerId&&!lecturers.some(l=>l.user_id===lecturerId)&&<option value={lecturerId}>Current assignment — verify staff role</option>}{lecturers.map(l=><option value={l.user_id} key={l.user_id}>{l.full_name}</option>)}</select><Button disabled={!ready||busy||selected===(lecturerId||'')} onClick={save} variant="outline">{busy?'Saving…':'Save lecturer'}</Button></div>{error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}<p className="mt-2 text-xs text-muted-foreground">Review existing schedules and class invitations separately after changing the lecturer.</p></div>;
}
