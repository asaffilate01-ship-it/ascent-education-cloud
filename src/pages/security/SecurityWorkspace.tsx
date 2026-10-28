import {useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
type Camera={id:string;name:string;location:string;enabled:boolean;security_live:boolean;security_playback:boolean};
type Session={url:string;expiresAt:string;mimeType:string};
export default function SecurityWorkspace(){const {user}=useAuth();return <SecurityDesk key={`${user?.id}:${user?.tenantId}:${user?.roles.join(',')}`}/>;}
function SecurityDesk(){
 const {user}=useAuth();const manager=!!user?.roles.some(r=>['superadmin','centre_director'].includes(r));
 const [cameras,setCameras]=useState<Camera[]>([]),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [selected,setSelected]=useState(''),[mode,setMode]=useState<'live'|'playback'>('live'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState('');
 const [session,setSession]=useState<Session|null>(null),[busy,setBusy]=useState(false),[mediaError,setMediaError]=useState(false);
 const [draft,setDraft]=useState({name:'',location:'',provider_camera_id:'',enabled:false,security_live:false,security_playback:false});
 useEffect(()=>{let active=true;setLoading(true);setError('');setCameras([]);setSession(null);
  void db.from('unipathway_cctv_cameras').select('id,name,location,enabled,security_live,security_playback').order('name').then(({data,error:e})=>{if(!active)return;if(e)setError('Camera inventory unavailable. The CCTV migration may need deploying, or your account may need access.');else setCameras(data||[]);setLoading(false);});return()=>{active=false};
 },[refresh]);
 useEffect(()=>{if(!session)return;const timer=setTimeout(()=>{setSession(null);toast.info('Viewing session expired. Request a new session to continue.');},Math.max(0,Date.parse(session.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[session]);
 const camera=cameras.find(c=>c.id===selected);
 async function open(){if(!camera||busy)return;setBusy(true);setSession(null);setMediaError(false);setError('');try{
  const result=await supabase.functions.invoke('cctv-access',{body:{cameraId:camera.id,mode,startsAt:start?new Date(start).toISOString():null,endsAt:end?new Date(end).toISOString():null,reason}});
  if(result.error){let message='CCTV is unavailable. Ask your administrator to check the gateway connection.';try{message=(await result.error.context.json()).error||message;}catch{/* Non-JSON provider errors retain the safe fallback message. */}throw Error(message);}
  if(!result.data?.url||!result.data?.expiresAt)throw Error('No viewing session returned.');setSession(result.data);
 }catch(e){setError(e instanceof Error?e.message:'Unable to open camera');}finally{setBusy(false);}}
 async function save(){if(!manager||!user?.tenantId||busy)return;setBusy(true);try{const result=await db.from('unipathway_cctv_cameras').insert({...draft,tenant_id:user.tenantId});if(result.error)throw result.error;setDraft({name:'',location:'',provider_camera_id:'',enabled:false,security_live:false,security_playback:false});setRefresh(n=>n+1);toast.success('Camera registered');}catch{toast.error('Camera could not be saved. Check the centre and camera reference.');}finally{setBusy(false);}}
 return <DashboardLayout title="Security · CCTV" subtitle="Authorised live view and recorded playback">
  <section className="mb-5 rounded-2xl border bg-card p-5"><h2 className="font-bold">Centre camera workspace</h2><p className="mt-2 text-sm text-muted-foreground">Choose an authorised camera to request a short-lived viewing session. Playback requires a time range and reason. Viewing requests are logged. Video becomes available after your CCTV provider is connected.</p></section>
  {loading&&<p role="status">Loading cameras…</p>}
  {error&&<p role="alert" className="mb-4 rounded-xl border border-destructive p-4">{error}</p>}
  {!loading&&!cameras.length&&<p className="mb-4 rounded-xl border p-5">No cameras are available to this account. A centre administrator must register cameras and grant access.</p>}
  <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
   <label className="text-sm font-semibold">Camera<select disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={selected} onChange={e=>{setSelected(e.target.value);setSession(null);}}><option value="">Select a camera</option>{cameras.map(c=><option key={c.id} value={c.id}>{c.name} — {c.location}{!c.enabled?' (disabled)':''}</option>)}</select></label>
   <label className="text-sm font-semibold">View<select disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={mode} onChange={e=>{setMode(e.target.value as 'live'|'playback');setSession(null);}}><option value="live">Live</option><option value="playback">Playback</option></select></label>
   {mode==='playback'&&<><label>From (your device timezone)<Input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>To (maximum 24 hours)<Input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label><label className="sm:col-span-2">Reason for playback<Input value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} placeholder="Incident or review reference"/></label></>}
   <Button disabled={busy||!camera?.enabled||(!manager&&!(mode==='live'?camera?.security_live:camera?.security_playback))||(mode==='playback'&&(!start||!end||reason.trim().length<5))} onClick={()=>void open()}>{busy?'Requesting…':mode==='live'?'Open live view':'Open playback'}</Button>
   {session&&<div className="sm:col-span-2"><video key={session.url} controls autoPlay muted playsInline controlsList="nodownload" onError={()=>setMediaError(true)} className="aspect-video w-full rounded-xl bg-black"><source src={session.url} type={session.mimeType}/></video><Button className="mt-3" variant="outline" onClick={()=>setSession(null)}>Stop viewing</Button>{mediaError&&<p role="alert">This stream cannot play in your browser. Ask your CCTV administrator for a supported media format.</p>}</div>}
  </section>
  {manager&&cameras.length>0&&<section className="mt-6 space-y-3 rounded-2xl border bg-card p-5"><h2 className="font-bold">Camera permissions</h2>{cameras.map(c=><div key={c.id} className="flex flex-wrap items-center gap-4 border-b py-3"><span className="font-semibold">{c.name}</span>{(['enabled','security_live','security_playback'] as const).map(key=><label key={key} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={c[key]} onChange={async e=>{setBusy(true);setSession(null);const result=await db.from('unipathway_cctv_cameras').update({[key]:e.target.checked}).eq('id',c.id).select('id').single();if(result.error)toast.error('Permission update could not be confirmed.');setBusy(false);setRefresh(n=>n+1);}}/>{key==='enabled'?'Enabled':key==='security_live'?'Security live':'Security playback'}</label>)}</div>)}</section>}
  {manager&&<details className="mt-6 rounded-2xl border bg-card p-5"><summary className="cursor-pointer font-bold">Register a camera</summary><p className="my-3 text-sm text-muted-foreground">Register the provider camera reference only. Store passwords and gateway credentials server-side. Enable viewing only after connecting the gateway.</p><form onSubmit={e=>{e.preventDefault();void save();}} className="grid gap-3 sm:grid-cols-2">{(['name','location','provider_camera_id'] as const).map(key=><label key={key}>{key==='provider_camera_id'?'Provider camera reference':key==='name'?'Camera name':'Location'}<Input required maxLength={key==='name'?100:160} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}{(['enabled','security_live','security_playback'] as const).map(key=><label key={key} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/>{key==='enabled'?'Enable camera':key==='security_live'?'Allow security live view':'Allow security playback'}</label>)}<Button disabled={busy||!user?.tenantId} type="submit">Save camera</Button></form></details>}
 </DashboardLayout>;
}
