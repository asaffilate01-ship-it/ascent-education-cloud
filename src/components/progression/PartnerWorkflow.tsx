import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
const db: SupabaseClient = supabase;
type Row = { id: string; recipient_name?: string; destination_institution?: string; name?: string; partner_id?: string; route_name?: string; programme?: string; student_id?: string; status?: string; review_status?: string; student_visible?: boolean; route_id?: string; external_application_ref?: string; document_reference?: string; starts_on?: string; ends_on?: string };
export default function PartnerWorkflow({ student = false }: { student?: boolean }) {
 const { user } = useAuth();
 const version=useRef(0);
 const tenant = user?.tenantId;
 const manager = user?.roles.some(r => ['centre_director','superadmin'].includes(r));
 const [partners,setPartners] = useState<Row[]>([]),[routes,setRoutes] = useState<Row[]>([]),[agreements,setAgreements] = useState<Row[]>([]),[applications,setApplications] = useState<Row[]>([]),[referrals,setReferrals] = useState<Row[]>([]);
 const [busy,setBusy] = useState(false),[loading,setLoading] = useState(true),[error,setError] = useState('');
 const [tab,setTab] = useState('referrals');
 const load = useCallback(async () => {
  const request=++version.current;
  setPartners([]);setRoutes([]);setAgreements([]);setApplications([]);setReferrals([]);
  if (!tenant) { setLoading(false); return; }
  setLoading(true);setError('');
  const tables = ['international_pathway_routes','international_partner_referrals',...(!student ? ['international_university_applications','international_education_partners',...(manager ? ['international_partner_agreements'] : [])] : [])];
  const results = await Promise.all(tables.map(t => db.from(t).select('*').eq('tenant_id',tenant).order('created_at',{ascending:false})));
  if(request!==version.current)return;
  const failed = results.find(r => r.error);
  if (failed) setError('The workflow could not be loaded. Check access and database migration status.');
  const data = (name:string) => (results[tables.indexOf(name)]?.data || []) as Row[];
  setRoutes(data(tables[0]));setReferrals(data(tables[1]));setApplications(data('international_university_applications'));setPartners(data('international_education_partners'));setAgreements(data('international_partner_agreements'));
  setLoading(false);
 },[tenant,student,manager]);
 useEffect(() => { void load();return ()=>{version.current++;}; },[load]);
 async function write(table:string,values:Record<string,unknown>,id?:string) {
  if (!tenant || busy) return false;
  setBusy(true);
  try {
   const result = id ? await db.from(table).update(values).eq('id',id).eq('tenant_id',tenant).select('id').single() : await db.from(table).insert({...values,tenant_id:tenant}).select('id').single();
   if(result.error) throw result.error;
   toast.success('Saved');await load();return true;
  } catch(e) { toast.error(e instanceof Error ? e.message : (e as {message?:string}).message || 'Save failed');return false; }
  finally { setBusy(false); }
 }
 async function agreement(e:React.FormEvent<HTMLFormElement>) {
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
  const saved=await write('international_partner_agreements',{partner_id:f.get('partner'),agreement_type:'recruitment',status:'signed',document_reference:f.get('document'),starts_on:f.get('starts'),ends_on:f.get('ends')||null});
  if(saved)form.reset();
 }
 async function referral(e:React.FormEvent<HTMLFormElement>) {
  e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const route=routes.find(r=>r.id===f.get('route'));const app=applications.find(a=>a.id===f.get('application'));
  if(!route||!app)return;
  if(await write('international_partner_referrals',{partner_id:route.partner_id,route_id:route.id,international_application_id:app.id,student_id:app.student_id,status:'draft'}))form.reset();
 }
 if(!tenant)return <p role="alert">A centre assignment is required.</p>;
 return <section className="surface-card p-5 mb-6 space-y-4">
  <h2 className="font-semibold">{student?'Verified pathways and sharing consent':'Partner agreements and application referrals'}</h2>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {loading?<p>Loading workflow…</p>:<>
  {!student&&<div className="flex flex-wrap gap-2">{['referrals','routes',...(manager?['agreements']:[])].map(t=><Button key={t} variant={tab===t?'default':'outline'} onClick={()=>setTab(t)}>{t}</Button>)}</div>}
  {(student||tab==='routes')&&<div className="space-y-3">{routes.length===0&&<p>No verified pathways are available yet.</p>}{routes.map(r=><article key={r.id} className="rounded border p-3 space-y-2"><h3 className="font-medium">{r.route_name}</h3><p className="text-sm">{r.review_status} · {r.student_visible?'Published':'Internal'}</p>{manager&&!student&&<form className="flex flex-wrap gap-2" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await write('international_pathway_routes',{review_status:'verified',student_visible:true,evidence_url:f.get('evidence'),evidence_reviewed_at:new Date().toISOString(),verified_by:user?.id},r.id);}}><Input aria-label={`Evidence for ${r.route_name}`} name="evidence" required type="url" placeholder="Institution acceptance evidence URL"/><Button disabled={busy}>Verify and publish</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>void write('international_pathway_routes',{student_visible:false,review_status:'under_review'},r.id)}>Unpublish</Button></form>}</article>)}</div>}
  {!student&&manager&&tab==='agreements'&&<>
   <p className="text-sm text-muted-foreground">Record the signed document in your controlled institutional document store, then register its reference here. Only current signed agreements allow publication.</p>
   <form onSubmit={agreement} className="grid md:grid-cols-2 gap-3">
    <label>Organisation<select name="partner" required className="w-full border rounded p-2"><option value="">Choose organisation</option>{partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Signed document reference<Input name="document" required placeholder="Controlled document reference"/></label>
    <label>Starts on<Input name="starts" type="date" required/></label><label>Ends on (optional)<Input name="ends" type="date"/></label>
    <Button disabled={busy}>Register signed agreement</Button>
   </form>
   {agreements.map(a=><article className="border rounded p-3 space-y-2" key={a.id}><p>{partners.find(p=>p.id===a.partner_id)?.name} · {a.status} · {a.starts_on} – {a.ends_on||'Open ended'}</p><p className="text-sm">{a.document_reference}</p><div className="flex gap-2"><Button disabled={busy||a.status!=='signed'} onClick={()=>void write('international_education_partners',{relationship_status:'contracted',agreement_signed_on:a.starts_on},a.partner_id)}>Activate relationship</Button><Button variant="outline" disabled={busy||a.status==='terminated'} onClick={()=>void write('international_partner_agreements',{status:'terminated'},a.id)}>Terminate agreement</Button></div></article>)}
  </>}
  {(student||tab==='referrals')&&<>
   {!student&&<form className="grid md:grid-cols-2 gap-3 border rounded p-4" onSubmit={async e=>{
    e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);
    try{const result=await db.rpc('create_pathway_application',{p_route:f.get('route'),p_student:f.get('student'),p_intake:f.get('intake')||null});if(result.error)throw result.error;toast.success('Application and consent request prepared');form.reset();await load();}
    catch(e){toast.error((e as Error).message||'Application could not be created');}finally{setBusy(false);}
   }}><h3 className="font-medium md:col-span-2">Start a university application</h3><label>Student user ID<Input name="student" required pattern="[0-9a-fA-F-]{36}" placeholder="Student UUID from centre records"/></label><label>Verified pathway<select required name="route" className="w-full border rounded p-2"><option value="">Choose pathway</option>{routes.filter(r=>r.review_status==='verified'&&r.student_visible).map(r=><option key={r.id} value={r.id}>{r.route_name}</option>)}</select></label><label>Intake<Input name="intake" maxLength={100} placeholder="e.g. September 2027"/></label><Button disabled={busy}>Create application and request consent</Button></form>}
   {!student&&<form onSubmit={referral} className="grid md:grid-cols-2 gap-3"><label>Existing university application<select required name="application" className="w-full border rounded p-2"><option value="">Choose application</option>{applications.map(a=><option key={a.id} value={a.id}>{a.programme} · {a.id.slice(0,8)}</option>)}</select></label><label>Verified pathway<select required name="route" className="w-full border rounded p-2"><option value="">Choose pathway</option>{routes.filter(r=>r.review_status==='verified'&&r.student_visible).map(r=><option key={r.id} value={r.id}>{r.route_name}</option>)}</select></label><Button disabled={busy}>Request student consent</Button></form>}
   {referrals.length===0&&<p>No application referrals yet.</p>}
   {referrals.map(r=><article key={r.id} className="rounded border p-3 space-y-3"><p className="font-medium">{routes.find(p=>p.id===r.route_id)?.route_name||'Pathway unavailable — contact admissions'}</p><p>Recipient: {r.recipient_name||'Contact admissions to verify the recipient'}</p><p>Status: {r.status}</p>
    {student&&r.status==='draft'&&<form onSubmit={async e=>{e.preventDefault();await write('international_partner_referrals',{status:'consented',student_consent_at:new Date().toISOString()},r.id);}}><label className="flex gap-2 mb-3"><input type="checkbox" required/>I authorise admissions to share my linked application with {r.recipient_name} for this pathway.</label><Button disabled={busy}>Give consent</Button></form>}
    {student&&!['withdrawn','rejected'].includes(r.status||'')&&<Button variant="outline" disabled={busy} onClick={()=>void write('international_partner_referrals',{status:'withdrawn',student_consent_at:null},r.id)}>Withdraw consent and referral</Button>}
    {!student&&r.status==='consented'&&<form className="flex gap-2" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await write('international_partner_referrals',{status:'submitted',external_application_ref:f.get('reference')},r.id);}}><Input name="reference" required aria-label="Provider submission reference" placeholder="Reference from authorised provider portal"/><Button disabled={busy}>Record manual submission</Button></form>}
    {!student&&['submitted','acknowledged','offer'].includes(r.status||'')&&<div className="flex gap-2">{(r.status==='offer'?['enrolled','rejected']:r.status==='submitted'?['acknowledged','offer','rejected']:['offer','rejected']).map(s=><Button key={s} variant="outline" disabled={busy} onClick={()=>void write('international_partner_referrals',{status:s},r.id)}>{s}</Button>)}</div>}
   </article>)}
  </>}
  </>}
 </section>;
}
