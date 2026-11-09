import {useEffect,useMemo,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {ROLE_HOME,useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
import {activeClassroomCentre,activeWhiteboardManager,verifyClassroomRows} from '@/lib/classroomScope';
import {AlertTriangle,BookOpen,Lock,PenTool,Plus,Users} from 'lucide-react';
type Session={id:string;title:string;module_id:string|null;tenant_id:string;starts_at:string;capacity:number;organiser_user_id:string};
type Board={id:string;tenant_id:string;title:string;session_id:string;prepared_by:string|null;locked_after_class:boolean;current_sequence:number};
export default function WhiteboardStudio(){
 const {user}=useAuth();return <Studio key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`}/>;
}
function Studio(){
 const {user}=useAuth();const navigate=useNavigate();
 const [sessions,setSessions]=useState<Session[]>([]);
 const [boards,setBoards]=useState<Board[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [refresh,setRefresh]=useState(0);
 const [selected,setSelected]=useState('');const [title,setTitle]=useState('');
 const [saving,setSaving]=useState(false);
 const [tenant,setTenant]=useState(user?.tenantId||'');
 const manager=activeWhiteboardManager(user);
 const centre=activeClassroomCentre(user);
 useEffect(()=>{
  if(!user?.id)return;
  if(user.tenantId){setTenant(user.tenantId);return;}
  // Platform owners must explicitly select a centre; a hidden UniPathway default would disclose the wrong tenant.
  if(user.role==='superadmin')setTenant('');
 },[user?.id,user?.tenantId]);
 useEffect(()=>{
  if(!tenant||!centre||tenant!==centre||!user?.id){setSessions([]);setBoards([]);setLoading(false);setError('Your centre and selected teaching role could not be verified. Return to your dashboard or contact support.');return;}
  let active=true;setLoading(true);setError('');setSessions([]);setBoards([]);setSelected('');
  void Promise.all([
   db.from('live_class_sessions').select('id,title,module_id,tenant_id,starts_at,capacity,organiser_user_id')
    .eq('tenant_id',tenant).order('starts_at',{ascending:false}).limit(100),
   db.from('lesson_whiteboards').select('id,tenant_id,title,session_id,prepared_by,locked_after_class,current_sequence')
    .eq('tenant_id',tenant).order('updated_at',{ascending:false}).limit(150),
  ]).then(([classes,whiteboards])=>{
   if(!active)return;
   const problem=classes.error||whiteboards.error;
   if(problem){setError('Whiteboards are unavailable for your centre. Your administrator needs to check classroom access and setup. You can continue using your dashboard.');setLoading(false);return;}
   const scopedSessions=verifyClassroomRows<Session>(classes.data||[],tenant);
   const scopedBoards=verifyClassroomRows<Board>(whiteboards.data||[],tenant);
   const available=manager?scopedSessions:scopedSessions.filter(s=>s.organiser_user_id===user.id);
   const authorized=new Set(available.map(s=>s.id));
   setSessions(available);setBoards(scopedBoards.filter(b=>authorized.has(b.session_id)));setLoading(false);
  }).catch(()=>{if(active){setError('The whiteboard service could not be reached. Retry or continue to your dashboard.');setLoading(false);}});
  return()=>{active=false};
 },[tenant,centre,user?.id,manager,refresh]);
 const availableSessions=useMemo(()=>sessions.filter(s=>s.module_id&&!boards.some(b=>b.session_id===s.id)),[sessions,boards]);
 const create=async()=>{
  const session=availableSessions.find(s=>s.id===selected);
  if(!session||!user?.id||!title.trim()||!centre||session.tenant_id!==centre||
    (!manager&&session.organiser_user_id!==user.id)){toast.error('Choose an authorised scheduled class and board title');return;}
  setSaving(true);
  const {data,error:e}=await db.from('lesson_whiteboards').insert({
   tenant_id:session.tenant_id,session_id:session.id,module_id:session.module_id,
   title:title.trim(),prepared_by:user.id,template:'blank',locked_after_class:false
  }).select('id,tenant_id,session_id').single();
  setSaving(false);
  if(e||!data||data.tenant_id!==tenant||data.session_id!==session.id||!data.id){toast.error('Board creation could not be verified for this class and centre. Refresh the board list.');return;}
  toast.success('One shared classroom board created.');navigate('/classroom/whiteboard/'+data.id);
 };
 const lock=async(b:Board)=>{
  if(!user?.id||!manager||!centre||b.tenant_id!==centre)return;
  if(!window.confirm('Lock this whiteboard after the lecture? Existing recordings remain available to authorised students.'))return;
  const {data,error:e}=await db.from('lesson_whiteboards').update({locked_after_class:true})
   .eq('id',b.id).eq('tenant_id',centre).select('id,tenant_id,locked_after_class').single();
  if(e||!data||data.id!==b.id||data.tenant_id!==centre||data.locked_after_class!==true){toast.error('Lock confirmation could not be verified for this board and centre.');return;}
  setBoards(p=>p.map(x=>x.id===b.id?{...x,locked_after_class:true}:x));
 };
 return <DashboardLayout title="UniPathway Whiteboard Studio" subtitle="Private collaborative teaching boards for large Teams lectures">
  <div className="mb-5 rounded-xl border bg-primary/5 p-5">
   <h2 className="flex items-center gap-2 font-bold"><Users className="size-5"/>One board, 100+ invited students</h2>
   <p className="mt-2 text-sm text-muted-foreground">Create one presenter-controlled whiteboard for each scheduled lecture. All eligible students view the same board; one stroke is stored once and delivered through a private live channel. Saved changes form a revision replay, separate from any Teams video recording.</p>
  </div>
  {loading&&<p role="status">Checking your authorised lectures and whiteboards…</p>}
  {error&&<div className="rounded-xl border border-destructive p-5" role="alert"><AlertTriangle className="mr-2 inline size-4"/>{error}<div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" onClick={()=>setRefresh(value=>value+1)}>Retry whiteboards</Button><Button variant="outline" asChild><Link to={user?ROLE_HOME[user.role]||'/':'/login'}>Return to my dashboard</Link></Button></div></div>}
  {!loading&&!error&&<div className="space-y-7">
   {availableSessions.length>0&&<section className="rounded-xl border bg-card p-5">
    <h2 className="font-semibold">Create a lecture whiteboard</h2>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
     <label className="text-sm font-medium">Scheduled lecture<select aria-label="Scheduled lecture" className="mt-1 w-full rounded-md border bg-background p-2" value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="">Choose your class</option>{availableSessions.map(s=><option key={s.id} value={s.id}>{s.title} — {new Date(s.starts_at).toLocaleString()} (planned {s.capacity} learners)</option>)}
     </select></label>
     <label className="text-sm font-medium">Board title<Input className="mt-1" value={title} maxLength={160} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Week 2 — Algebra exercises"/></label>
    </div><Button className="mt-3" onClick={()=>void create()} disabled={saving||!selected||!title.trim()}><Plus className="mr-2 size-4"/>Create private board</Button>
   </section>}
   <section><h2 className="mb-3 text-xl font-bold">My class whiteboards</h2>
    {boards.length===0?<p className="rounded-xl border p-6 text-sm text-muted-foreground">No authorised boards yet. Schedule a Teams lecture and create its whiteboard here.</p>:
     <div className="grid gap-3 md:grid-cols-2">{boards.map(b=><article key={b.id} className="rounded-xl border bg-card p-4">
      <h3 className="flex gap-2 font-semibold"><BookOpen className="size-4"/>{b.title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{b.current_sequence||0} saved updates · {b.locked_after_class?'Locked after lecture':'Editable by authorised presenter'}</p>
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" asChild><Link to={'/classroom/whiteboard/'+b.id}><PenTool className="mr-1 size-4"/>Open board</Link></Button>
       {manager&&!b.locked_after_class&&<Button size="sm" variant="outline" onClick={()=>void lock(b)}><Lock className="mr-1 size-4"/>Lock</Button>}
      </div>
     </article>)}</div>}
   </section>
  </div>}
 </DashboardLayout>;
}
