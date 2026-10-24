import {GuardianDiscussion} from './GuardianDiscussion';
export {GuardianDiscussion} from './GuardianDiscussion';
import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Scope='attendance'|'schedule'|'communication';
type Link={id:string;parent_name:string;verified:boolean;scopes:Scope[]};
export function GuardianScopeSharing(){
 const {user}=useAuth();const [links,setLinks]=useState<Link[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLinks([]);setError('');void Promise.resolve(db.rpc('get_unipathway_guardian_scopes')).then(r=>{if(!active)return;if(r.error)setError('Guardian permissions could not be loaded.');else setLinks(r.data||[]);}).catch(()=>{if(active)setError('Guardian permissions unavailable.');});return()=>{active=false;};},[user?.id,user?.tenantId,refresh]);
 async function change(link:Link,scope:Scope){setBusy(true);setError('');try{const r=await db.rpc('set_unipathway_guardian_scope',{p_link:link.id,p_scope:scope,p_share:!link.scopes.includes(scope)});if(r.error)throw r.error;setRefresh(x=>x+1);}catch{setError('Permission change was not saved.');}finally{setBusy(false);}}
 return <section className="my-5 space-y-3 rounded-xl border p-5"><h2 className="font-semibold">Other parent and guardian permissions</h2><p className="text-sm">Choose each permission separately. Schedule sharing does not share Teams joining links. Communication enables a private discussion with authorised centre staff. Turning a permission off stops future access; previously saved copies cannot be recalled.</p>{error&&<p role="alert">{error}</p>}{links.map(l=><div key={l.id} className="border-t pt-3"><p>{l.parent_name} · {l.verified?'Centre verified':'Awaiting verification'}</p><div className="mt-2 flex flex-wrap gap-2">{(['attendance','schedule','communication'] as Scope[]).map(scope=><Button key={scope} size="sm" variant={l.scopes.includes(scope)?'default':'outline'} disabled={busy||!l.verified} onClick={()=>void change(l,scope)}>{l.scopes.includes(scope)?'Stop sharing':'Share'} {scope}</Button>)}</div></div>)}<Button variant="outline" disabled={busy} onClick={()=>setRefresh(x=>x+1)}>Refresh permissions</Button></section>;
}
type Activity={id:string;student_name:string|null;attendance_shared:boolean;schedule_shared:boolean;communication_shared:boolean;attendance:{date:string;status:string;module:string}[];schedule:{title:string;starts_at:string;ends_at:string;status:string}[]};
export function GuardianActivity({view='all'}:{view?:'all'|'attendance'|'schedule'|'communication'}) {
 const {user}=useAuth();
 const [items,setItems]=useState<Activity[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setItems([]);setError('');setLoading(true);
 void Promise.resolve(db.rpc('get_unipathway_guardian_activity')).then(r=>{if(!active)return;if(r.error)setError('Shared activity is unavailable. Please retry.');else {const list:Activity[]=r.data||[];setItems(list);setSelected(previous=>list.some(a=>a.id===previous)?previous:list[0]?.id||'');}}).catch(()=>{if(active)setError('Shared activity is unavailable. Please retry.');}).finally(()=>{if(active)setLoading(false);});
 return()=>{active=false;};},[user?.id,user?.tenantId,refresh]);
 const current=items.find(a=>a.id===selected);
 return <section className="my-5 space-y-4">
  <Button variant="outline" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh shared activity</Button>
  {loading&&<p role="status">Loading shared activity…</p>}
  {error&&<p role="alert">{error}</p>}
  {!loading&&!error&&!items.length&&<p className="rounded-xl border p-6">No shared activity yet. Ask admissions to verify your learner link, then ask your learner to choose what to share.</p>}
  {!!items.length&&<div><label htmlFor="guardian-learner" className="mb-2 block text-sm font-medium">Learner</label><select id="guardian-learner" value={selected} onChange={e=>setSelected(e.target.value)} className="w-full rounded-lg border bg-background p-3 sm:max-w-sm">{items.map((a,i)=><option key={a.id} value={a.id}>{a.student_name||`Linked learner ${i+1}`}</option>)}</select></div>}
  {current&&<article className="space-y-5 rounded-xl border p-5">
   {(view==='all'||view==='attendance')&&<section><h2 className="font-semibold">Attendance</h2>{current.attendance_shared?<><p className="my-2 text-xs text-muted-foreground">Latest 100 recorded entries; missing records do not mean absence.</p>{current.attendance.length?current.attendance.map((a,i)=><p key={i} className="border-b py-3 text-sm">{a.date} · {a.module||'Class'} · {a.status}</p>):<p>No recorded attendance shared yet.</p>}</>:<p className="mt-2 text-sm">Attendance permission has not been granted.</p>}</section>}
   {(view==='all'||view==='schedule')&&<section><h2 className="font-semibold">Class schedule</h2>{current.schedule_shared?<>{current.schedule.length?current.schedule.map((a,i)=><p key={i} className="border-b py-3 text-sm">{a.title} · {new Date(a.starts_at).toLocaleString()} – {new Date(a.ends_at).toLocaleTimeString()} · {a.status}</p>):<p>No invited classes in the shared date window.</p>}</>:<p className="mt-2 text-sm">Schedule permission has not been granted.</p>}</section>}
   {(view==='all'||view==='communication')&&(current.communication_shared?<GuardianDiscussion key={current.id} linkId={current.id}/>:<p className="text-sm">Communication permission has not been granted.</p>)}
  </article>}
 </section>;
}
