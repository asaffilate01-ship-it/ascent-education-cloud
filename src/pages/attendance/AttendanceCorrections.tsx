import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AttendanceCorrectionForm from '@/components/attendance/AttendanceCorrectionForm';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {db} from '@/lib/db';
type Correction={id:string;learner_name:string;module_title:string;attendance_date:string;original_status:string;requested_status:string;current_status:string;reason:string;requested_by:string;requester_name:string;created_at:string;state:string;reviewer_name:string|null;review_reason:string|null;reviewed_at:string|null};
const states=['pending','approved','rejected'];
export default function AttendanceCorrections(){
 const {user}=useAuth();
 const reviewer=!!user?.roles.some(r=>r==='centre_director'||r==='superadmin');
 return <Workspace key={`${user?.id}:${user?.tenantId}:${user?.roles.join(',')}`} userId={user?.id} reviewer={reviewer}/>;
}
export function Workspace({userId,reviewer}:{userId?:string;reviewer:boolean}){
 const [rows,setRows]=useState<Correction[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[search,setSearch]=useState(''),[state,setState]=useState('pending'),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setRows([]);setError('');setPage(0);
  void(async()=>{try{
   const all:Correction[]=[];let after:string|null=null;
   while(active){
    const r=await db.rpc('list_attendance_corrections',{p_after:after});
    if(!active)return;
    if(r.error||!Array.isArray(r.data)||r.data.some((c:Correction)=>!c||typeof c.id!=='string'||(after&&c.id<=after)||!states.includes(c.state)||typeof c.learner_name!=='string'||typeof c.module_title!=='string'))throw Error('Unverified');
    all.push(...r.data);if(r.data.length<100)break;after=r.data[r.data.length-1].id;
   }
   if(active)setRows(all.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id)));
  }catch{if(active)setError('Correction history could not be verified. Refresh to retry; no review controls are available until it loads.');}
  finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[revision]);
 const filtered=rows.filter(c=>(!state||c.state===state)&&`${c.learner_name} ${c.module_title}`.toLowerCase().includes(search.toLowerCase()));
 return <DashboardLayout title="Attendance corrections"><div className="space-y-5"><h1 className="text-2xl font-bold">Attendance corrections</h1><p>Lecturers request changes from their daily register. A different centre director or centre-authorised super administrator reviews the reason. Original marks and decisions remain in this history.</p>{!reviewer&&<Link className="underline" to="/lecturer/attendance">Back to attendance and daily register</Link>}
 <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Refresh correction history</Button><label>Correction status<select className="ml-2 rounded border bg-background p-2" value={state} onChange={e=>{setState(e.target.value);setPage(0);}}><option value="">All decisions</option>{states.map(s=><option key={s}>{s}</option>)}</select></label><label>Search learner or module<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label></div>
 {loading?<p role="status">Checking correction history…</p>:error?<p role="alert">{error}</p>:<>
 {!filtered.length&&<p>No corrections match this view.</p>}
 {filtered.slice(page*20,page*20+20).map(c=><article key={`${revision}:${c.id}`} className="space-y-2 rounded-xl border p-4"><h2 className="font-semibold">{c.learner_name} · {c.module_title}</h2><p>{c.attendance_date} · {c.original_status} → {c.requested_status} · {c.state}</p><p>Current saved mark: {c.current_status}</p><p className="whitespace-pre-wrap">Request reason: {c.reason}</p><p className="text-sm">Requested by {c.requester_name} · {new Date(c.created_at).toLocaleString()}</p>
 {c.state!=='pending'?<><p className="whitespace-pre-wrap">Review reason: {c.review_reason}</p><p className="text-sm">Reviewed by {c.reviewer_name} · {c.reviewed_at&&new Date(c.reviewed_at).toLocaleString()}</p></>:reviewer?(c.requested_by===userId?<p>Another administrator must review your request.</p>:<AttendanceCorrectionForm requestId={c.id} onSaved={()=>setRevision(v=>v+1)}/>):<p>Awaiting administrator review.</p>}
 </article>)}
 {filtered.length>20&&<nav aria-label="Correction pages" className="flex items-center gap-3"><Button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous corrections</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next corrections</Button></nav>}
 </>}
 </div></DashboardLayout>;
}
