import {useCallback,useEffect,useState} from 'react';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
type Person={user_id:string;full_name:string};
type Job={id:string;user_id:string;role_type:string;status:string;error_code:string|null;attempts:number};
export default function MicrosoftAccountQueue({tenantId}:{tenantId?:string|null}){
 const [people,setPeople]=useState<Person[]>([]),[jobs,setJobs]=useState<Job[]>([]);
 const [selected,setSelected]=useState(''),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  if(!tenantId){setLoading(false);return;}setLoading(true);setError('');
  try{
   const [p,j]=await Promise.all([
    db.from('profiles').select('user_id,full_name').eq('tenant_id',tenantId).order('full_name').limit(200),
    db.from('unipathway_microsoft_jobs').select('id,user_id,role_type,status,error_code,attempts').eq('tenant_id',tenantId).order('updated_at',{ascending:false}).limit(100)
   ]);
   if(p.error||j.error)throw Error('Unable to load the account queue. Check centre permissions and the provisioning migration.');
   setPeople(p.data||[]);setJobs(j.data||[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load account queue');setPeople([]);setJobs([]);}finally{setLoading(false);}
 },[tenantId]);
 useEffect(()=>{void load();},[load]);
 async function request(userId:string){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const {error:e}=await db.rpc('request_unipathway_microsoft_account',{p_user:userId});if(e)throw Error(e.message);
   setNotice('Account request queued. It will run only when your Microsoft worker is configured.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Request failed. Please retry.');}finally{setBusy(false);}
 }
 return <section className="rounded-xl border bg-card p-5 space-y-4" aria-labelledby="microsoft-queue-title">
  <div><h2 id="microsoft-queue-title" className="font-semibold">Institutional account requests</h2>
   <p className="mt-2 text-sm text-muted-foreground">Queue an eligible staff member or actively enrolled learner. The worker creates and licenses a disabled Microsoft account. Your Microsoft administrator completes password setup and activation; a completed request does not mean Teams is ready.</p></div>
  {loading&&<p role="status">Loading account requests…</p>}{error&&<p role="alert" className="text-destructive">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!loading&&!error&&<div className="grid gap-3 sm:grid-cols-2">
   <label className="text-sm font-medium">Find a person<Input className="mt-1" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter the first 200 centre users"/></label>
   <label className="text-sm font-medium">Account holder<select className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={selected} onChange={e=>setSelected(e.target.value)}>
    <option value="">Select a person</option>{people.filter(p=>p.user_id===selected||p.full_name?.toLowerCase().includes(search.toLowerCase())).map(p=><option key={p.user_id} value={p.user_id}>{p.full_name||'Unnamed user'} · {p.user_id.slice(-6)}</option>)}
   </select></label>
  </div>}
  <div className="flex flex-wrap gap-2"><Button disabled={!tenantId||!selected||busy||loading||!!error} onClick={()=>void request(selected)}>{busy?'Saving…':'Queue Microsoft account'}</Button><Button variant="outline" disabled={busy||loading} onClick={()=>void load()}>Refresh queue</Button></div>
  {!loading&&jobs.length===0&&!error&&<p className="text-sm text-muted-foreground">No account requests yet.</p>}
  <div className="grid gap-3 lg:grid-cols-2">{jobs.map(j=><article key={j.id} className="rounded-lg border p-4">
   <h3 className="font-medium">{people.find(p=>p.user_id===j.user_id)?.full_name||'Centre account'}</h3>
   <p className="mt-1 text-sm">{j.role_type} · {j.status==='completed'?'Created and licensed — activation required':j.status} · {j.attempts} attempts</p>
   {j.error_code&&<p className="mt-2 text-sm text-destructive">Setup issue: {j.error_code.replace(/_/g,' ')}</p>}
   {j.status==='failed'&&<Button className="mt-3" variant="outline" disabled={busy} onClick={()=>void request(j.user_id)}>Retry account request</Button>}
  </article>)}</div>
 </section>;
}
