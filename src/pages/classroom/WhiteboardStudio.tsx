import {useEffect,useMemo,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
import {AlertTriangle,BookOpen,Lock,PenTool,Plus,Users} from 'lucide-react';
type Session={id:string;title:string;module_id:string|null;tenant_id:string;starts_at:string;capacity:number;organiser_user_id:string};
type Board={id:string;title:string;session_id:string;prepared_by:string|null;locked_after_class:boolean;current_sequence:number};
export default function WhiteboardStudio(){
 const {user}=useAuth();const navigate=useNavigate();
 const [sessions,setSessions]=useState<Session[]>([]);
 const [boards,setBoards]=useState<Board[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [selected,setSelected]=useState('');const [title,setTitle]=useState('');
 const [saving,setSaving]=useState(false);
 const [tenant,setTenant]=useState(user?.tenantId||'');
 const manager=!!user?.roles.some(r=>['superadmin','centre_director','programme_leader'].includes(r));
 useEffect(()=>{
  if(!user?.id)return;
  if(user.tenantId){setTenant(user.tenantId);return;}
  if(user.roles.includes('superadmin'))void db.from('tenants').select('id').eq('slug','unipathway').maybeSingle()
    .then(({data})=>setTenant(data?.id||''));
 },[user?.id,user?.tenantId]);
 useEffect(()=>{
  if(!tenant||!user?.id)return;
  let active=true;setLoading(true);setError('');
  void Promise.all([
   db.from('live_class_sessions').select('id,title,module_id,tenant_id,starts_at,capacity,organiser_user_id')
    .eq('tenant_id',tenant).order('starts_at',{ascending:false}).limit(100),
   db.from('lesson_whiteboards').select('id,title,session_id,prepared_by,locked_after_class,current_sequence')
    .eq('tenant_id',tenant).order('updated_at',{ascending:false}).limit(150),
  ]).then(([classes,whiteboards])=>{
   if(!active)return;
   const problem=classes.error||whiteboards.error;
   if(problem){setError(problem.message);setLoading(false);return;}
   const available=manager?(classes.data||[]):(classes.data||[]).filter((s:Session)=>s.organiser_user_id===user.id);
   setSessions(available as Session[]);setBoards((whiteboards.data||[]) as Board[]);setLoading(false);
  }).catch(()=>{if(active){setError('Whiteboard service unavailable');setLoading(false);}});
  return()=>{active=false};
 },[tenant,user?.id,manager]);
 const availableSessions=useMemo(()=>sessions.filter(s=>s.module_id&&!boards.some(b=>b.session_id===s.id)),[sessions,boards]);
 const create=async()=>{
  const session=availableSessions.find(s=>s.id===selected);
  if(!session||!user?.id||!title.trim()){toast.error('Choose a scheduled class and board title');return;}
  setSaving(true);
  const {data,error:e}=await db.from('lesson_whiteboards').insert({
   tenant_id:session.tenant_id,session_id:session.id,module_id:session.module_id,
   title:title.trim(),prepared_by:user.id,template:'blank',locked_after_class:false
  }).select('id').single();
  setSaving(false);
  if(e||!data){toast.error('Permission denied or board not created: '+(e?.message||'Unknown error'));return;}
  toast.success('One shared classroom board created.');navigate('/classroom/whiteboard/'+data.id);
 };
 const lock=async(b:Board)=>{
  if(!user?.id)return;
  if(!window.confirm('Lock this whiteboard after the lecture? Existing recordings remain available to authorised students.'))return;
  const {error:e}=await db.from('lesson_whiteboards').update({locked_after_class:true}).eq('id',b.id);
  if(e){toast.error('Unable to lock board: '+e.message);return;}
  setBoards(p=>p.map(x=>x.id===b.id?{...x,locked_after_class:true}:x));
 };
 return <DashboardLayout title="UniPathway Whiteboard Studio" subtitle="Private collaborative teaching boards for large Teams lectures">
  <div className="mb-5 rounded-xl border bg-primary/5 p-5">
   <h2 className="flex items-center gap-2 font-bold"><Users className="size-5"/>One board, 100+ invited students</h2>
   <p className="mt-2 text-sm text-muted-foreground">Create one presenter-controlled whiteboard for each scheduled lecture. All eligible students view the same board; one stroke is stored once and delivered through a private live channel. Saved changes form a revision replay, separate from any Teams video recording.</p>
  </div>
  {loading&&<p role="status">Checking your authorised lectures and whiteboards…</p>}
  {error&&<div className="rounded-xl border border-destructive p-5" role="alert"><AlertTriangle className="mr-2 inline size-4"/>{error}. The classroom and security migrations must be deployed to staging before this is usable.</div>}
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
