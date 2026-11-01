import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';

type Signal={state:'recorded'|'empty'|'missing'|'error';count:number;label:string};
type Snapshot={modules:Signal;schedule:Signal;live:Signal;whiteboard:Signal;microsoft:Signal;labs:Signal};
const emptySignal=(label:string):Signal=>({state:'missing',count:0,label});
const initial=():Snapshot=>({
 modules:emptySignal('Assigned modules'),schedule:emptySignal('Weekly plan'),
 live:emptySignal('Live Teams/classroom sessions'),whiteboard:emptySignal('Whiteboard backend'),
 microsoft:emptySignal('Microsoft account'),labs:emptySignal('Practical lab sessions'),
});
type Row={id:string};
const read=async(request:()=>PromiseLike<{data?:unknown;error?:{message?:string}|null}>,label:string):Promise<Signal>=>{
 try{
  const result=await request();
  if(result.error)return {state:'missing',count:0,label};
  if(!Array.isArray(result.data))return {state:'error',count:0,label};
  return {state:result.data.length?'recorded':'empty',count:result.data.length,label};
 }catch{return {state:'error',count:0,label};}
};
const activeRole=(u:{role:string;roles?:string[]}|null|undefined)=>u?.role==='lecturer'&&u.roles?.includes('lecturer')===true;
export default function LecturerDeliveryReadiness(){
 const {user}=useAuth();
 return <DeliveryWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function DeliveryWorkspace(){
 const {user}=useAuth(),tenant=user?.tenantId||'',uid=user?.id||'';
 const allowed=!!uid&&!!tenant&&activeRole(user);
 const [snapshot,setSnapshot]=useState(initial),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 const load=useCallback(async(current:()=>boolean)=>{
  setLoading(true);setSnapshot(initial());
  if(!allowed){setLoading(false);return;}
  const make=(table:string,columns:string,filters:{field:string;value:string}[],label:string)=>{
   let q=db.from(table).select(columns).eq('tenant_id',tenant);
   filters.forEach(f=>{q=q.eq(f.field,f.value);});
   return read(()=>q.limit(100),label);
  };
  const [modules,schedule,live,whiteboard,microsoft,labs]=await Promise.all([
   make('modules','id',[{field:'lecturer_id',value:uid}],'Assigned modules'),
   make('scheduled_lectures','id',[{field:'lecturer_id',value:uid},{field:'is_active',value:'true'}],'Weekly plan'),
   make('live_class_sessions','id',[{field:'organiser_user_id',value:uid}],'Live Teams/classroom sessions'),
   make('lesson_whiteboards','id',[],'Whiteboard backend'),
   make('microsoft_education_accounts','id',[{field:'user_id',value:uid}],'Microsoft account'),
   make('lab_sessions','id',[{field:'lecturer_id',value:uid}],'Practical lab sessions'),
  ]);
  if(current())setSnapshot({modules,schedule,live,whiteboard,microsoft,labs});
  if(current())setLoading(false);
 },[allowed,tenant,uid]);
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[load,revision]);
 const checks=[
  {key:'modules',heading:'Module allocation',description:'You can prepare only modules assigned to this lecturer account. A programme list alone does not grant teaching or marking rights.',to:'/lecturer/teaching'},
  {key:'schedule',heading:'Timetable and calendar',description:'Weekly lecture slots are local Pakistan-time plans. Check real effective dates, room allocation and live invitations.',to:'/lecturer/class-scheduler'},
  {key:'live',heading:'Teams and live classes',description:'An authenticated organiser, matching class invitation and Microsoft Graph/Teams provider activation are required before a meeting is considered available.',to:'/lecturer/classroom'},
  {key:'whiteboard',heading:'Collaborative whiteboards',description:'Whiteboard tables, membership policies and real-time broadcast must be deployed before collaborative boards can be saved or replayed.',to:'/lecturer/whiteboards'},
  {key:'microsoft',heading:'Microsoft Education account',description:'An institutional Microsoft account record is not proof that an A1/A3 licence or Teams meeting connector is provisioned.',to:'/lecturer/classroom'},
  {key:'labs',heading:'Cloud and tech labs',description:'A course module or lab template is not a deployed safe container, virtual machine or authorised AWS Academy account.',to:'/lecturer/labs'},
 ] as const;
 const labels={recorded:'Records found — provider not verified',empty:'No records',missing:'Backend unavailable or read denied',error:'Source not verified'};
 return <DashboardLayout title="Teaching delivery & connection readiness" subtitle="Role-scoped Teams, whiteboard, timetable, language and technology checks">
  <div className="space-y-5">
   {!allowed?<section role="alert" className="rounded-xl border p-5">A verified active Lecturer role and centre membership are required to inspect teaching services.</section>:<>
    <section className="rounded-xl border bg-card p-5">
     <h2 className="font-semibold">Prepare classes; do not mistake a saved plan for a live service</h2>
     <p className="mt-2 text-sm text-muted-foreground">A successful database read only proves that a record is available to this lecturer. It does not verify Microsoft Graph permissions, a Teams meeting, whiteboard real-time policies, cloud budgets or exam-provider accreditation. Missing or inaccessible data is labelled unavailable, not zero readiness.</p>
     <Button variant="outline" className="mt-4" disabled={loading} onClick={()=>setRevision(x=>x+1)}>Recheck teaching connections</Button>
    </section>
    {loading&&<p role="status">Checking your assigned centre, meetings and learning services…</p>}
    {!loading&&<div className="grid gap-4 md:grid-cols-2">
     {checks.map(item=><section key={item.key} className="rounded-xl border bg-card p-5 space-y-2">
      <h2 className="font-semibold">{item.heading}</h2>
      <p className="text-xs font-medium text-muted-foreground">{labels[snapshot[item.key].state]} · {snapshot[item.key].state==='recorded'?snapshot[item.key].count+' record(s)':'no verified count'}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      <Link to={item.to} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent">Open relevant workspace</Link>
     </section>)}
    </div>}
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Language lab and IELTS preparation</h2>
     <p className="text-sm text-muted-foreground">IELTS reading, listening, speaking and writing practice have dedicated teaching screens. A separate multi-language audio laboratory, saved lesson recordings and exam registration integrations require their own connection tests and permissions.</p>
     <div className="flex flex-wrap gap-2">
      <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent" to="/lecturer/ielts">IELTS practice</Link>
      <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent" to="/lecturer/lesson-archive">Recorded lessons</Link>
      <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent" to="/lecturer/materials">Teaching resources</Link>
     </div>
    </section>
   </>}
  </div>
 </DashboardLayout>;
}
