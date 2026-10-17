import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
const db:SupabaseClient=supabase;
type Entry={id:string;organisation_name:string;country:string;programme:string;stage:string;official_application_url:string|null;next_action:string|null;next_action_at:string|null;approval_reference:string|null};
const countries=['Pakistan','UK','USA','Canada','Australia','Germany','Global'];
const programmes=[['ielts_registration_partner','IELTS registration partner'],['ielts_test_venue','IELTS test venue'],['university_recruitment_agent','University recruitment agency'],['academic_articulation','Academic progression agreement'],['education_agent_network','Agency recruitment network'],['other','Other']] as const;
export default function PartnerApplicationsTracker({tenant,manager}:{tenant:string;manager:boolean}){
 const [items,setItems]=useState<Entry[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [approvalEvidence,setApprovalEvidence]=useState<Record<string,string>>({});
 const [draft,setDraft]=useState({organisation_name:'',country:'Pakistan',programme:'ielts_registration_partner',official_application_url:'',next_action:'',next_action_at:''});
 async function refresh(){
  const r=await db.from('education_partner_applications').select('id,organisation_name,country,programme,stage,official_application_url,next_action,next_action_at,approval_reference').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(200);
  if(r.error)setError('Partner tracking is awaiting database setup or access.');else setItems((r.data||[]) as Entry[]);
 }
 useEffect(()=>{void refresh();},[tenant]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!manager||busy)return;setBusy(true);setError('');
  const r=await db.from('education_partner_applications').insert({
   tenant_id:tenant,organisation_name:draft.organisation_name.trim(),country:draft.country,programme:draft.programme,
   official_application_url:draft.official_application_url||null,next_action:draft.next_action||null,
   next_action_at:draft.next_action_at?new Date(draft.next_action_at+'T12:00:00Z').toISOString():null
  });
  if(r.error)setError(r.error.message);else{setDraft(x=>({...x,organisation_name:'',next_action:'',next_action_at:'',official_application_url:''}));await refresh();}
  setBusy(false);
 }
 async function advance(item:Entry,stage:string){
  if(!manager||busy)return;
  if(stage==='approved'&&(!approvalEvidence[item.id]||approvalEvidence[item.id].trim().length<8))
    return setError('Verify original third-party decision and enter its written approval reference.');
  setBusy(true);setError('');
  const changes:Record<string,unknown>={stage};
  if(stage==='approved')changes.approval_reference=approvalEvidence[item.id].trim();
  const r=await db.from('education_partner_applications').update(changes).eq('id',item.id).eq('tenant_id',tenant);
  if(r.error)setError(r.error.message);else await refresh();
  setBusy(false);
 }
 return <section className="space-y-4">
  <h2 className="font-semibold">University and IELTS partner applications</h2>
  <p className="text-sm text-muted-foreground">Research and outreach records only. Registration partnerships, test venues and university commission agreements require different approvals. No record here represents approval by a third party.</p>
  {manager&&<form onSubmit={e=>void submit(e)} className="rounded-lg border p-4 grid gap-3 md:grid-cols-2">
   <label className="text-sm">Organisation<Input required value={draft.organisation_name} onChange={e=>setDraft(x=>({...x,organisation_name:e.target.value}))}/></label>
   <label className="text-sm">Country<select className="block w-full border rounded p-2 bg-background" value={draft.country} onChange={e=>setDraft(x=>({...x,country:e.target.value}))}>{countries.map(c=><option key={c}>{c}</option>)}</select></label>
   <label className="text-sm">Application type<select className="block w-full border rounded p-2 bg-background" value={draft.programme} onChange={e=>setDraft(x=>({...x,programme:e.target.value}))}>{programmes.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
   <label className="text-sm">Official application URL<Input type="url" value={draft.official_application_url} onChange={e=>setDraft(x=>({...x,official_application_url:e.target.value}))}/></label>
   <label className="text-sm">Next action<Input value={draft.next_action} onChange={e=>setDraft(x=>({...x,next_action:e.target.value}))}/></label>
   <label className="text-sm">Follow-up date<Input type="date" value={draft.next_action_at} onChange={e=>setDraft(x=>({...x,next_action_at:e.target.value}))}/></label>
   <div className="md:col-span-2"><Button disabled={busy}>Record application prospect</Button></div>
  </form>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <div className="grid gap-3 md:grid-cols-2">{items.map(item=><article key={item.id} className="border rounded-lg p-4 space-y-2">
   <h3 className="font-semibold">{item.organisation_name}</h3>
   <p className="text-xs text-muted-foreground">{item.country} · {item.programme.replace(/_/g,' ')} · {item.stage}</p>
   <p className="text-sm">Next action: {item.next_action||'Not recorded'}</p>
   {item.official_application_url&&<a className="text-sm text-primary underline" href={item.official_application_url} target="_blank" rel="noopener noreferrer">Official application page</a>}
   {manager&&item.stage==='due_diligence'&&<div className="space-y-2">
    <label className="text-xs font-semibold block">Verified provider approval reference
      <Input className="mt-1" value={approvalEvidence[item.id]||''} maxLength={500} onChange={e=>setApprovalEvidence(v=>({...v,[item.id]:e.target.value}))}/>
    </label>
    <Button type="button" size="sm" variant="outline" disabled={busy||!approvalEvidence[item.id]?.trim()} onClick={()=>void advance(item,'approved')}>Record evidenced approval</Button>
   </div>}
   {manager&&<select className="block w-full rounded border p-2 bg-background text-sm" disabled={busy} value={item.stage} onChange={e=>void advance(item,e.target.value)}>
     {['research','contacted','submitted','due_diligence','rejected','withdrawn','expired',...(item.stage==='approved'?['approved']:[])].map(s=><option key={s}>{s}</option>)}
   </select>}
  </article>)}</div>
  {!items.length&&<p className="text-sm text-muted-foreground">No applications recorded yet.</p>}
 </section>;
}