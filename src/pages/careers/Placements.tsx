import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import PlacementActionForm from '@/components/placements/PlacementActionForm';
type Placement={id:string;student_id:string;supervisor_id:string;title:string;student_name:string;supervisor_name:string;programme_title:string;employer_name:string;status:string;starts_on:string;ends_on:string;required:boolean;required_minutes:number;learning_goals:string};
type Option={id:string;name:string};
type Log={id:string;worked_on:string;minutes:number;notes:string;status:string;review_reason:string|null;reviewed_at:string|null};
type Audit={id:string;action:string;actor_id:string;created_at:string;payload:{reason?:string}};
export default function Placements(){const {user}=useAuth();return <Workspace key={`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')}`}/>;}
function Workspace(){
 const {user}=useAuth();const manager=!!user?.roles.some(r=>['centre_director','superadmin','programme_leader'].includes(r));
 const [rows,setRows]=useState<Placement[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[selected,setSelected]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[notice,setNotice]=useState('');
 const [people,setPeople]=useState<Option[]>([]),[students,setStudents]=useState<Option[]>([]),[employers,setEmployers]=useState<Option[]>([]);
 useEffect(()=>{let active=true;setLoading(true);setRows([]);setError('');setPage(0);
 void(async()=>{try{
  if(!user?.tenantId)throw Error('Missing centre');
  const data=await pagedRows<Placement>(()=>db.from('unipathway_placements').select('*').eq('tenant_id',user.tenantId),()=>active);
  if(data.some(p=>!p||typeof p.id!=='string'||typeof p.title!=='string'||typeof p.student_name!=='string'||typeof p.supervisor_name!=='string'||typeof p.employer_name!=='string'||!['planned','active','completed','cancelled'].includes(p.status)||!Number.isFinite(p.required_minutes)))throw Error('Unverified placements');
  if(manager){
   const choices=await db.rpc('get_unipathway_placement_options');
   if(choices.error||!choices.data||['students','supervisors','employers'].some(k=>!Array.isArray(choices.data[k])||choices.data[k].some((o:Option)=>!o||typeof o.id!=='string'||typeof o.name!=='string')))throw Error('Unverified planning choices');
   if(active){setPeople(choices.data.supervisors);setStudents(choices.data.students);setEmployers(choices.data.employers);}
  }
  if(active){setRows(data);setSelected(old=>data.some(p=>p.id===old)?old:data[0]?.id||'');}
 }catch{if(active)setError('Placements could not be verified. Refresh to retry; no partial records are shown.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[user?.tenantId,manager,revision]);
 const saved=()=>{setNotice('Action saved. Rechecking placement records.');setRevision(v=>v+1);};
 const current=rows.find(p=>p.id===selected);const filtered=rows.filter(p=>`${p.title} ${p.student_name} ${p.employer_name} ${p.status}`.toLowerCase().includes(search.toLowerCase()));
 return <DashboardLayout title="Supervised placements" subtitle="Requirements, dates, activity logs and completion review"><div className="space-y-4"><p>Centre staff allocate a placement with an academic supervisor. Vacancy applications do not create placements. Logged time counts only after review; completing a placement does not award a qualification.</p><Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Refresh placements</Button>{notice&&<p role="status">{notice}</p>}
 {loading?<p role="status">Checking placements…</p>:error?<p role="alert">{error}</p>:<>
 {manager&&<details><summary className="cursor-pointer font-semibold">Plan a placement</summary><p className="my-3 text-sm">Choose an actively enrolled learner and a lecturer in this centre. The server verifies enrolment, supervisor role and employer status. Names below are centre account records.</p><PlacementActionForm action="create" label="Save placement plan" onSaved={saved} payload={form=>({...Object.fromEntries(form.entries()),student_id:String(form.get('enrolment')).split(':')[0],programme_id:String(form.get('enrolment')).split(':')[1],required:form.get('required')==='yes',required_minutes:Number(form.get('hours'))*60})}>
 <Pick name="enrolment" label="Learner and programme" options={students}/><Pick name="supervisor_id" label="Academic supervisor" options={people}/><Pick name="organisation_id" label="Verified employer" options={employers}/>
 <label className="block">Placement title<Input name="title" required minLength={3} maxLength={200}/></label><label className="block">Learning goals<Textarea name="learning_goals" required minLength={20} maxLength={4000}/></label><label className="block">Requirement<select name="required" className="ml-2 rounded border p-2 bg-background"><option value="yes">Required</option><option value="no">Optional</option></select></label><label className="block">Target hours<Input name="hours" type="number" required min={1} max={10000} step={1}/></label><label className="block">Start date<Input name="starts_on" type="date" required/></label><label className="block">End date<Input name="ends_on" type="date" required/></label>
 </PlacementActionForm></details>}
 <label className="block">Search placements<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>
 {!filtered.length&&<p>No placements match this view.</p>}<div className="grid gap-2 sm:grid-cols-2">{filtered.slice(page*20,page*20+20).map(p=><Button variant={selected===p.id?'default':'outline'} className="h-auto whitespace-normal justify-start p-3 text-left" key={p.id} onClick={()=>setSelected(p.id)}>{p.title} · {p.student_name} · {p.status}</Button>)}</div>
 {filtered.length>20&&<nav className="flex gap-3 items-center"><Button disabled={!page} onClick={()=>setPage(v=>v-1)}>Previous placements</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(v=>v+1)}>Next placements</Button></nav>}
 {current&&filtered.some(p=>p.id===current.id)&&<Detail key={`${revision}:${current.id}`} placement={current} manager={manager} userId={user?.id} saved={saved}/>}
 </>}
 </div></DashboardLayout>;
}
function Pick({name,label,options}:{name:string;label:string;options:Option[]}){return <label className="block">{label}<select name={name} required className="ml-2 max-w-full rounded border bg-background p-2" defaultValue=""><option value="">Choose {label.toLowerCase()}</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>;}
function Reason(){return <label className="block">Decision reason<Textarea name="reason" required minLength={10} maxLength={2000}/></label>;}
function Detail({placement:p,manager,userId,saved}:{placement:Placement;manager:boolean;userId?:string;saved:()=>void}){
 const [logs,setLogs]=useState<Log[]>([]),[audit,setAudit]=useState<Audit[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;void(async()=>{try{
  const l=await pagedRows<Log>(()=>db.from('unipathway_placement_logs').select('*').eq('placement_id',p.id),()=>active);
  const a=await pagedRows<Audit>(()=>db.from('unipathway_placement_actions').select('id,action,actor_id,created_at,payload').eq('placement_id',p.id),()=>active);
  if(l.some(x=>!x||typeof x.id!=='string'||typeof x.worked_on!=='string'||typeof x.notes!=='string'||!Number.isFinite(x.minutes)||!['pending','approved','rejected'].includes(x.status)))throw Error('Unverified logs');
  if(active){setLogs(l.sort((a,b)=>b.worked_on.localeCompare(a.worked_on)));setAudit(a.sort((a,b)=>b.created_at.localeCompare(a.created_at)));}
 }catch{if(active)setError('Placement logs could not be verified. Refresh placements to retry.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[p.id]);
 const reviewer=(manager||p.supervisor_id===userId)&&p.student_id!==userId;
 const approved=logs.filter(l=>l.status==='approved').reduce((s,l)=>s+l.minutes,0),pending=logs.filter(l=>l.status==='pending').length;
 const transition=(action:string,label:string)=><PlacementActionForm action={action} label={label} onSaved={saved} payload={form=>({placement_id:p.id,reason:form.get('reason')})}><Reason/></PlacementActionForm>;
 return <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">{p.title}</h2><p>{p.student_name} · {p.programme_title} · {p.required?'Required':'Optional'}</p><p>{p.employer_name} · Supervisor: {p.supervisor_name}</p><p>{p.starts_on} to {p.ends_on} · {p.status}</p><p className="whitespace-pre-wrap">{p.learning_goals}</p>
 {loading?<p role="status">Checking logs…</p>:error?<p role="alert">{error}</p>:<><p>Approved hours: {approved/60} / {p.required_minutes/60} · Pending logs: {pending}</p>
 {manager&&p.status==='planned'&&transition('start','Start placement')}{manager&&['planned','active'].includes(p.status)&&transition('cancel','Cancel placement')}
 {reviewer&&p.status==='active'&&approved>=p.required_minutes&&!pending&&transition('complete','Confirm placement complete')}
 {p.student_id===userId&&p.status==='active'&&<PlacementActionForm action="log" label="Submit activity log" onSaved={saved} payload={form=>({placement_id:p.id,...Object.fromEntries(form.entries()),minutes:Number(form.get('minutes'))})}><label className="block">Activity date (Pakistan)<Input name="worked_on" type="date" min={p.starts_on} max={p.ends_on} required/></label><label className="block">Minutes worked<Input name="minutes" type="number" min={1} max={1440} step={1} required/></label><label className="block">Activities and learning evidence<Textarea name="notes" required minLength={20} maxLength={4000}/></label><p className="text-sm">One pending or approved log per day. Rejected entries can be replaced with a new log; approved entries require centre review for corrections.</p></PlacementActionForm>}
 <h3 className="font-semibold">Activity history</h3>{!logs.length&&<p>No activity logs submitted yet.</p>}{logs.map(l=><article key={l.id} className="rounded border p-3"><p>{l.worked_on} · {l.minutes} minutes · {l.status}</p><p className="whitespace-pre-wrap">{l.notes}</p>{l.review_reason&&<p>Review: {l.review_reason}</p>}{reviewer&&p.status==='active'&&l.status==='pending'&&<PlacementActionForm action="approve" label="Save log review" onSaved={saved} payload={form=>({placement_id:p.id,log_id:l.id,reason:form.get('reason')})}><p>Approval confirms these minutes. Use rejection below when the evidence needs correction.</p><Reason/></PlacementActionForm>}{reviewer&&p.status==='active'&&l.status==='pending'&&<details><summary className="cursor-pointer">Reject this log</summary><PlacementActionForm action="reject" label="Reject activity log" onSaved={saved} payload={form=>({placement_id:p.id,log_id:l.id,reason:form.get('reason')})}><Reason/></PlacementActionForm></details>}</article>)}
 <details><summary className="cursor-pointer font-semibold">Decision audit history</summary>{audit.map(a=><p className="my-2 text-sm" key={a.id}>{new Date(a.created_at).toLocaleString()} · {a.action} · Actor {a.actor_id}{a.payload.reason?` · ${a.payload.reason}`:''}</p>)}</details>
 </>}
 </section>;
}
