import LearnerSupportAgenda from '@/components/progression/LearnerSupportAgenda';
import {learnerSupport} from '@/lib/learnerSupport';
import type {SupportTask} from '@/lib/supportDesk';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import SupportTasks from '@/components/progression/SupportTasks';
import {Link} from 'react-router-dom';
type Case={id:string;programme:string;destination_country:string;intake:string|null;status:string;career_organisations:{name:string}|null};
const db:SupabaseClient=supabase;
export default function GlobalProgression(){
 const {user}=useAuth();
 return <DashboardLayout title="Universities Abroad" subtitle="Your applications and institutional support tasks">{user?.tenantId?<Workspace key={`${user.tenantId}-${user.id}`} tenant={user.tenantId} student={user.id}/>:<p role="alert">A centre assignment is required.</p>}</DashboardLayout>;
}
function Workspace({tenant,student}:{tenant:string;student:string}){
 const [tasks,setTasks]=useState<SupportTask[]>([]),[taskError,setTaskError]=useState(''),[now,setNow]=useState(Date.now());
 const applicationRefs=useRef(new Map<string,HTMLElement>());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 const [cases,setCases]=useState<Case[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);const generation=useRef(0);
 const load=useCallback(async()=>{
  const token=++generation.current;setCases([]);setTasks([]);setTaskError('');setError('');setLoading(true);
  if(!tenant||!student){setLoading(false);return;}
  try{const rows:Case[]=[];
   for(let offset=0;;offset+=100){const result=await db.from('international_university_applications').select('id,programme,destination_country,intake,status,career_organisations(name)').eq('tenant_id',tenant).eq('student_id',student).order('updated_at',{ascending:false}).order('id').range(offset,offset+99);
    if(token!==generation.current)return;if(result.error)throw result.error;rows.push(...(result.data||[]).map(row=>({...row,career_organisations:Array.isArray(row.career_organisations)?row.career_organisations[0]||null:row.career_organisations})));if((result.data||[]).length<100)break;}
   const support=await learnerSupport(db,tenant,rows.map(r=>r.id),()=>token===generation.current);
   if(token!==generation.current)return;setCases(rows);setTasks(support.data);setTaskError(support.error||'');setNow(Date.now());
  }catch{if(token===generation.current)setError('Applications could not be loaded. Please retry or contact admissions through the LMS.');}finally{if(token===generation.current)setLoading(false);}
 },[tenant,student]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 return <div className="space-y-4"><Button variant="outline" asChild><Link to="/student/progression">Pathways and sharing consent</Link></Button>
 {!tenant?<p role="alert">A centre assignment is required.</p>:loading?<p role="status">Loading applications…</p>:error?<div><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry applications</Button></div>:<>
 <p>{cases.filter(c=>!['withdrawn','rejected'].includes(c.status)).length} active applications · {cases.filter(c=>['withdrawn','rejected'].includes(c.status)).length} closed</p>
 {cases.length===0&&<p>No university applications have been recorded. Contact admissions through the LMS to discuss verified pathways.</p>}
 {taskError?<p role="alert">{taskError}</p>:<LearnerSupportAgenda tasks={tasks} programmes={new Map(cases.map(c=>[c.id,c.programme]))} now={now} onOpen={id=>{const target=applicationRefs.current.get(id);target?.scrollIntoView?.({behavior:'smooth',block:'start'});target?.focus();}}/>}
 {cases.map(c=><article tabIndex={-1} aria-label={`Application ${c.id}`} ref={node=>{if(node)applicationRefs.current.set(c.id,node);else applicationRefs.current.delete(c.id);}} key={`${tenant}-${c.id}`} className="surface-card p-5 space-y-3"><h2 className="font-semibold">{c.career_organisations?.name||'University application'}</h2><p>{c.programme}</p><p>{c.destination_country} · {c.intake||'Intake to be confirmed'}</p><p>Status: {c.status.replace(/_/g,' ')}</p><p className="text-xs break-all">Application: {c.id}</p><SupportTasks tenant={tenant} application={c.id} student/></article>)}
 <Button variant="outline" onClick={()=>void load()}>Refresh applications</Button>
 </>}</div>;
}
