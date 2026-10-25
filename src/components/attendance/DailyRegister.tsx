import {Link} from 'react-router-dom';
import AttendanceCorrectionForm from './AttendanceCorrectionForm';
import {useEffect,useRef,useState} from 'react';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
type Learner={student_id:string;name:string;marks:{id:string;status:string;method:string|null}[]};
type Props={modules:{id:string;title:string}[]};
const statuses=['present','late','absent','excused'];
export default function DailyRegister({modules}:Props){
 const [saving,setSaving]=useState(false);
 const [module,setModule]=useState(''),[date,setDate]=useState(()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'}));
 return <details className="mb-5 rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Take daily register</summary><p className="my-3 text-sm">One mark per learner, module and date. Select each mark explicitly. This is a daily register, not attendance for individual Teams sessions. Request corrections below; a different centre administrator reviews each change.</p><Link className="block my-3 underline" to="/lecturer/attendance-corrections">View correction requests and decisions</Link><div className="flex flex-wrap gap-3"><label>Register module<select className="block rounded border bg-background p-2" disabled={saving} value={module} onChange={e=>setModule(e.target.value)}><option value="">Choose assigned module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>Register date (Pakistan)<Input type="date" disabled={saving} value={date} onChange={e=>setDate(e.target.value)}/></label></div>{module&&date&&<Roster key={`${module}:${date}`} module={module} date={date} onBusy={setSaving}/>}</details>;
}
function Roster({module,date,onBusy}:{module:string;date:string;onBusy:(busy:boolean)=>void}){
 const [learners,setLearners]=useState<Learner[]>([]),[choices,setChoices]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 const [pending,setPending]=useState<{student:string;status:string}|null>(null);
 const mounted=useRef(true),running=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;setLoading(true);setLearners([]);setError('');setPage(0);
  void(async()=>{try{
   const r=await db.rpc('get_unipathway_daily_register',{p_module:module,p_date:date});
   if(!active)return;
   const data=r.data as {module_id?:string;date?:string;learners?:Learner[]}|null;
   if(r.error||data?.module_id!==module||data?.date!==date||!Array.isArray(data.learners)||data.learners.some(l=>typeof l.student_id!=='string'||typeof l.name!=='string'||!Array.isArray(l.marks)||l.marks.some(m=>typeof m.id!=='string'||!statuses.includes(m.status))))throw Error('Unverified roster');
   setLearners(data.learners);
   setPending(old=>old&&data.learners!.some(l=>l.student_id===old.student&&l.marks.length)?null:old);
  }catch{if(active)setError('Register could not be verified. Refresh before recording marks.');}
  finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[module,date,refresh]);
 async function save(student:string,status:string){
  if(running.current||loading||error||!statuses.includes(status))return;
  running.current=true;setBusy(true);onBusy(true);setPending({student,status});setNotice('');
  try{
   const r=await db.rpc('save_unipathway_daily_mark',{p_module:module,p_student:student,p_date:date,p_status:status});
   if(!mounted.current)return;
   if(r.error||typeof r.data!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.data))throw Error('Unconfirmed');
   setPending(null);setNotice('Mark saved. Refresh attendance above to update the report.');setRefresh(v=>v+1);
  }catch{if(mounted.current)setNotice('Save could not be confirmed. Refresh to check the saved mark, or retry the same choice. Do not change an uncertain mark.');}
  finally{running.current=false;if(mounted.current){setBusy(false);onBusy(false);}}
 }
 const filtered=learners.filter(l=>l.name.toLowerCase().includes(search.toLowerCase()));
 return <section className="mt-4 space-y-3" aria-label="Daily register roster"><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy||loading} onClick={()=>setRefresh(v=>v+1)}>Refresh register</Button><label>Search register<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label></div>{notice&&<p role="status">{notice}</p>}{loading?<p role="status">Checking register…</p>:error?<p role="alert">{error}</p>:<>
 {pending&&<div className="rounded border p-3"><p>Unconfirmed choice: {learners.find(l=>l.student_id===pending.student)?.name||pending.student} — {pending.status}</p><Button disabled={busy} onClick={()=>void save(pending.student,pending.status)}>Retry same mark</Button><Button variant="outline" disabled={busy} onClick={()=>{setPending(null);setNotice('Local choice cleared. Any saved mark is unchanged; rechecking the register.');setRefresh(v=>v+1);}}>Clear pending choice</Button></div>}
 {!filtered.length&&<p>{search?'No matching learners.':'No active learners are enrolled in this module’s programme.'}</p>}
 {filtered.slice(page*20,page*20+20).map(l=><article className="rounded border p-3" key={l.student_id}><h3 className="font-semibold">{l.name}</h3>{l.marks.length?<><p>Recorded: {l.marks.map(m=>m.status).join(', ')}{l.marks.length>1?' — multiple historical records; contact your administrator.':''}</p>{l.marks.map(m=><details key={m.id}><summary className="cursor-pointer underline">Request correction to {m.status} ({m.method||'historical'})</summary><AttendanceCorrectionForm record={m}/></details>)}</>:<div className="flex flex-wrap gap-2"><label>Mark for {l.name}<select className="ml-2 rounded border bg-background p-2" disabled={busy||!!pending} value={choices[l.student_id]||''} onChange={e=>setChoices(c=>({...c,[l.student_id]:e.target.value}))}><option value="">Choose a mark</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><Button disabled={busy||!!pending||!choices[l.student_id]} onClick={()=>void save(l.student_id,choices[l.student_id])}>Save {l.name}</Button></div>}</article>)}
 {filtered.length>20&&<nav aria-label="Register pages" className="flex gap-3 items-center"><Button variant="outline" disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous register learners</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button variant="outline" disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next register learners</Button></nav>}
 </> }</section>;
}
