import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
const db:SupabaseClient=supabase;
type Credential={id:string;staff_id:string;credential_name:string;provider_name:string;credential_number:string|null;issued_on:string|null;expires_on:string|null;evidence_reference:string|null;status:string};
type Staff={user_id:string;full_name:string};
const options=[['British Council','UK agent and counsellor training'],['British Council','IELTS registration-partner orientation'],['Cambridge English','CELTA English teacher qualification'],['Other','English-language teaching qualification'],['Other','International education counsellor development']] as const;
export default function StaffCredentialTracker({tenant,manager}:{tenant:string;manager:boolean}){
 const [items,setItems]=useState<Credential[]>([]),[staff,setStaff]=useState<Staff[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [draft,setDraft]=useState({staff_id:'',provider_name:'British Council',credential_name:'UK agent and counsellor training',issued_on:'',expires_on:'',credential_number:'',evidence_reference:''});
 async function reload(){
  const [c,p]=await Promise.all([
   db.from('education_staff_credentials').select('id,staff_id,credential_name,provider_name,credential_number,issued_on,expires_on,evidence_reference,status').eq('tenant_id',tenant).limit(200),
   manager?db.from('profiles').select('user_id,full_name').eq('tenant_id',tenant).order('full_name').limit(300):Promise.resolve({data:[],error:null})
  ]);
  if(c.error||p.error)setError('Staff training records could not be loaded.');else{
   setItems((c.data||[]) as Credential[]);setStaff((p.data||[]) as Staff[]);
  }
 }
 useEffect(()=>{void reload();},[tenant,manager]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!manager||busy)return;setBusy(true);setError('');
  const r=await db.from('education_staff_credentials').insert({
   tenant_id:tenant,staff_id:draft.staff_id,provider_name:draft.provider_name,
   credential_name:draft.credential_name,credential_number:draft.credential_number||null,
   issued_on:draft.issued_on||null,expires_on:draft.expires_on||null,
   evidence_reference:draft.evidence_reference||null
  });
  if(r.error)setError(r.error.message);else{setDraft(x=>({...x,staff_id:'',issued_on:'',expires_on:'',credential_number:'',evidence_reference:''}));await reload();}
  setBusy(false);
 }
 async function verify(item:Credential){
  if(!manager||busy)return;
  if(!item.evidence_reference)return setError('Documentary proof must be recorded before a staff credential can be verified.');
  setBusy(true);setError('');
  const r=await db.from('education_staff_credentials').update({status:'reviewed'}).eq('id',item.id).eq('tenant_id',tenant);
  if(r.error)setError(r.error.message);else await reload();
  setBusy(false);
 }
 return <section className="space-y-4">
  <h2 className="font-semibold">Education counsellor and IELTS teaching credentials</h2>
  <p className="text-sm text-muted-foreground">Document staff training and renewal deadlines. A staff certificate does not by itself mean that UniPathway is endorsed by the British Council or appointed as an IELTS test centre.</p>
  {manager&&<form onSubmit={e=>void submit(e)} className="border rounded-lg p-4 grid gap-3 md:grid-cols-2">
   <label className="text-sm">Staff member<select required className="block bg-background border rounded p-2 w-full" value={draft.staff_id} onChange={e=>setDraft(x=>({...x,staff_id:e.target.value}))}><option value="">Select centre staff</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}</select></label>
   <label className="text-sm">Training programme<select className="block bg-background border rounded p-2 w-full" value={draft.provider_name+'|'+draft.credential_name} onChange={e=>{const [provider_name,credential_name]=e.target.value.split('|');setDraft(x=>({...x,provider_name,credential_name}));}}>
    {options.map(([provider,name])=><option key={provider+name} value={provider+'|'+name}>{provider}: {name}</option>)}
   </select></label>
   <label className="text-sm">Certificate/reference number<Input maxLength={100} value={draft.credential_number} onChange={e=>setDraft(x=>({...x,credential_number:e.target.value}))}/></label>
   <label className="text-sm">Evidence file/reference (staff only)<Input maxLength={500} value={draft.evidence_reference} onChange={e=>setDraft(x=>({...x,evidence_reference:e.target.value}))}/></label>
   <label className="text-sm">Issued on<Input type="date" value={draft.issued_on} onChange={e=>setDraft(x=>({...x,issued_on:e.target.value}))}/></label>
   <label className="text-sm">Expires / renew by<Input type="date" value={draft.expires_on} onChange={e=>setDraft(x=>({...x,expires_on:e.target.value}))}/></label>
   <div className="md:col-span-2"><Button disabled={busy}>Add unverified credential</Button></div>
  </form>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <div className="grid gap-3 md:grid-cols-2">{items.map(item=><article key={item.id} className="border rounded-lg p-4 space-y-2">
   <h3 className="font-semibold">{item.credential_name}</h3>
   <p className="text-sm">{item.provider_name} · {staff.find(s=>s.user_id===item.staff_id)?.full_name||'Staff member'}</p>
   <p className="text-xs text-muted-foreground">{item.status} · Renewal: {item.expires_on||'Not specified'}</p>
   {manager&&item.status!=='reviewed'&&<Button size="sm" disabled={busy||!item.evidence_reference} variant="outline" onClick={()=>void verify(item)}>Verify supporting evidence</Button>}
  </article>)}</div>
  {!items.length&&<p className="text-sm text-muted-foreground">No training records entered yet.</p>}
 </section>;
}