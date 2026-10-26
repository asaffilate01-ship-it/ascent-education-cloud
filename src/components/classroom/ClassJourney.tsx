import {NavLink} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pakistanDay} from '@/lib/staffTasks';
export default function ClassJourney({sessionId}:{sessionId:string}){
 const {user}=useAuth();const teacher=!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r));
 const data=useQuery({queryKey:['class-context',user?.id,user?.tenantId,sessionId],enabled:!!user?.tenantId,queryFn:async()=>{const r=await db.from('live_class_sessions').select('id,title,module_id,starts_at').eq('id',sessionId).eq('tenant_id',user!.tenantId).single();if(r.error)throw r.error;return r.data as {id:string;title:string;module_id:string;starts_at:string};}});
 if(data.isLoading)return <p role="status">Checking selected class…</p>;
 if(data.isError)return <p role="alert" className="mb-4 text-sm">Selected class context could not be verified. <button className="underline" onClick={()=>data.refetch()}>Retry</button></p>;
 const s=data.data;if(!s)return null;
 const query=new URLSearchParams({module:s.module_id,session:s.id,date:pakistanDay(new Date(s.starts_at))});
 const links=[['Teaching and recordings',`/classroom/teaching/${s.id}`],['Questions',`/classroom/discussion/${s.id}`],...(teacher?[['Register',`/lecturer/attendance?${query}`]]:[]),['Course workspace',`/${teacher?'lecturer':'student'}/module?${new URLSearchParams({module:s.module_id})}`]];
 return <nav className="mb-5 border-b pb-3" aria-label="Selected class"><p className="font-semibold">{s.title}</p><div className="mt-2 flex flex-wrap gap-1">{links.map(([label,to])=><NavLink key={label} to={to} className={({isActive})=>`inline-flex min-h-11 items-center rounded-lg px-3 text-sm ${isActive?'bg-primary/10 font-semibold text-primary':'text-muted-foreground hover:bg-accent'}`}>{label}</NavLink>)}</div></nav>;
}
