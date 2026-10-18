import {useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {ShieldCheck,RefreshCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {supabase} from '@/integrations/supabase/client';
const db:SupabaseClient=supabase;
type Claim={id:string;referral_id:string;agreement_id:string;commission_currency:string;commission_due:number;status:string;university_enrolment_evidence:string|null;invoice_reference:string|null;receipt_reference:string|null;reversal_reference:string|null;received_amount:number;created_at:string};
type Referral={id:string;partner_id:string;status:string;external_application_ref:string|null};
type Agreement={id:string;partner_id:string;status:string;starts_on:string;ends_on:string|null;commission_basis:string|null;commission_amount:number|null;commission_currency:string|null};
export default function UniversityCommissionLedger({tenant}:{tenant:string}){
 const [claims,setClaims]=useState<Claim[]>([]),[referrals,setReferrals]=useState<Referral[]>([]),[agreements,setAgreements]=useState<Agreement[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [form,setForm]=useState({referral_id:'',agreement_id:'',enrolment_confirmed_on:'',tuition_amount:''});
 const [reference,setReference]=useState<Record<string,string>>({});
 async function reload(){
  setError('');
  const [c,r,a]=await Promise.all([
   db.from('university_commission_claims').select('id,referral_id,agreement_id,commission_currency,commission_due,status,university_enrolment_evidence,invoice_reference,receipt_reference,reversal_reference,received_amount,created_at').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(150),
   db.from('international_partner_referrals').select('id,partner_id,status,external_application_ref').eq('tenant_id',tenant).eq('status','enrolled').limit(150),
   db.from('international_partner_agreements').select('id,partner_id,status,starts_on,ends_on,commission_basis,commission_amount,commission_currency').eq('tenant_id',tenant).eq('status','signed').limit(150)
  ]);
  if(c.error||r.error||a.error)setError('The signed agreement and commission-claims records cannot be loaded. Verify migrations and centre finance access.');
  else{setClaims((c.data||[]) as Claim[]);setReferrals((r.data||[]) as Referral[]);setAgreements((a.data||[]) as Agreement[]);}
 }
 useEffect(()=>{void reload();},[tenant]);
 const claimed=useMemo(()=>new Set(claims.map(c=>c.referral_id)),[claims]);
 const eligible=referrals.filter(x=>!claimed.has(x.id));
 const chosen=referrals.find(x=>x.id===form.referral_id);
 const matches=agreements.filter(a=>a.partner_id===chosen?.partner_id&&['flat_per_enrolment','percentage_of_tuition'].includes(a.commission_basis||''));
 const grouped=useMemo(()=>{
  const groups=new Map<string,{approved:number;received:number;unreviewed:number}>();
  for(const c of claims){const values=groups.get(c.commission_currency)||{approved:0,received:0,unreviewed:0};
   if(c.status==='draft')values.unreviewed+=Number(c.commission_due);
   if(['verified','invoiced'].includes(c.status))values.approved+=Number(c.commission_due);
   if(c.status==='received')values.received+=Number(c.received_amount);
   groups.set(c.commission_currency,values);
  }
  return [...groups.entries()];
 },[claims]);
 async function create(e:React.FormEvent){
  e.preventDefault();if(busy||!chosen||!form.agreement_id)return;
  const agreement=matches.find(x=>x.id===form.agreement_id);if(!agreement)return setError('Select a signed agreement for the same institution.');
  const tuition=Number(form.tuition_amount);
  if(agreement.commission_basis==='percentage_of_tuition'&&(!Number.isFinite(tuition)||tuition<=0))return setError('Enter evidenced tuition for percentage agreements.');
  setBusy(true);setError('');
  const r=await db.from('university_commission_claims').insert({
   tenant_id:tenant,referral_id:chosen.id,agreement_id:agreement.id,
   enrolment_confirmed_on:form.enrolment_confirmed_on,
   tuition_amount:agreement.commission_basis==='percentage_of_tuition'?tuition:null,
   commission_currency:agreement.commission_currency||'GBP',commission_due:1,
   created_by:(await db.auth.getUser()).data.user?.id
  });
  if(r.error)setError(r.error.message);else{setForm({referral_id:'',agreement_id:'',enrolment_confirmed_on:'',tuition_amount:''});await reload();}
  setBusy(false);
 }
 async function update(item:Claim,status:string){
  if(busy)return;
  const ref=reference[item.id]?.trim()||'';
  if(!['cancelled'].includes(status)&&ref.length<4)return setError('Documented evidence or a reference is required for the next stage.');
  setBusy(true);setError('');
  const update:Record<string,unknown>={status};
  if(status==='verified')update.university_enrolment_evidence=ref;
  if(status==='invoiced')update.invoice_reference=ref;
  if(status==='received')update.receipt_reference=ref;
  if(status==='reversed')update.reversal_reference=ref;
  const r=await db.from('university_commission_claims').update(update).eq('tenant_id',tenant).eq('id',item.id);
  if(r.error)setError(r.error.message);else{setReference(x=>({...x,[item.id]:''}));await reload();}
  setBusy(false);
 }
 const next:Record<string,{stage:string;label:string}>={draft:{stage:'verified',label:'Verify enrolment'},verified:{stage:'invoiced',label:'Record invoice'},invoiced:{stage:'received',label:'Confirm actual receipt'},received:{stage:'reversed',label:'Record clawback'}};
 return <section className="surface-card p-5 space-y-4">
  <h2 className="font-semibold flex gap-2 items-center"><ShieldCheck className="h-5 w-5 text-primary"/>Signed university commission claim register</h2>
  <p className="text-sm text-muted-foreground">A real, signed university recruiting agreement and a recorded enrolled referral are mandatory. Draft claims are not earned revenue; only manually evidenced receipts appear as received. Currency totals are never mixed.</p>
  <div className="grid gap-3 sm:grid-cols-3">
   {grouped.map(([currency,v])=><div className="border rounded-lg p-3" key={currency}><p className="font-semibold">{currency}</p>
     <p className="text-sm">Draft: {v.unreviewed.toFixed(2)}</p><p className="text-sm">Verified/invoiced: {v.approved.toFixed(2)}</p><p className="text-sm">Received: {v.received.toFixed(2)}</p></div>)}
  </div>
  <form onSubmit={e=>void create(e)} className="border rounded-xl p-4 grid md:grid-cols-2 gap-3">
   <h3 className="font-semibold md:col-span-2">Draft an eligible commission claim</h3>
   <label className="text-sm">Enrolled referral<select className="block w-full bg-background border rounded p-2" required value={form.referral_id}
    onChange={e=>setForm(x=>({...x,referral_id:e.target.value,agreement_id:''}))}>
    <option value="">Select confirmed referral</option>
    {eligible.map(r=><option value={r.id} key={r.id}>{r.external_application_ref||r.id.slice(0,8)}</option>)}
   </select></label>
   <label className="text-sm">Signed university contract<select className="block w-full bg-background border rounded p-2" required value={form.agreement_id}
    onChange={e=>setForm(x=>({...x,agreement_id:e.target.value}))}>
    <option value="">Select matching contract</option>
    {matches.map(a=><option key={a.id} value={a.id}>{a.commission_basis} · {a.commission_amount} {a.commission_basis==='percentage_of_tuition'?'%':a.commission_currency}</option>)}
   </select></label>
   <label className="text-sm">University enrolment confirmed on<Input required type="date" value={form.enrolment_confirmed_on}
    onChange={e=>setForm(x=>({...x,enrolment_confirmed_on:e.target.value}))}/></label>
   <label className="text-sm">Evidenced net tuition (percentage terms only)<Input type="number" min="0" step="0.01" value={form.tuition_amount}
    onChange={e=>setForm(x=>({...x,tuition_amount:e.target.value}))}/></label>
   <div className="md:col-span-2"><Button disabled={busy||!form.agreement_id||!form.referral_id}>Create contract-derived draft</Button></div>
  </form>
  {error&&<p className="text-sm text-destructive" role="alert">{error}</p>}
  <div className="space-y-3">{claims.map(c=><article key={c.id} className="border rounded-lg p-4 space-y-2">
   <div className="flex justify-between flex-wrap gap-2"><p className="font-semibold">{c.commission_currency} {Number(c.commission_due).toFixed(2)}</p><span className="text-xs bg-secondary rounded-full p-2">{c.status}</span></div>
   <p className="text-xs text-muted-foreground">Referral: {c.referral_id.slice(0,8)} · Contract: {c.agreement_id.slice(0,8)}</p>
   {next[c.status]&&<div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
    <label className="text-sm">Evidence/reference for {next[c.status].label}<Input value={reference[c.id]||''}
     onChange={e=>setReference(x=>({...x,[c.id]:e.target.value}))}/></label>
    <Button size="sm" variant="outline" disabled={busy} onClick={()=>void update(c,next[c.status].stage)}>{next[c.status].label}</Button>
   </div>}
   {['draft','verified','invoiced'].includes(c.status)&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>void update(c,'cancelled')}>Cancel claim</Button>}
   {c.receipt_reference&&<p className="text-xs">Receipt evidence reference: {c.receipt_reference}</p>}
  </article>)}</div>
  {!claims.length&&<p className="text-sm text-muted-foreground">No contract-backed commission claims have been recorded.</p>}
  <Button size="sm" variant="outline" disabled={busy} onClick={()=>void reload()}><RefreshCcw className="h-4 w-4 mr-1"/>Refresh claims</Button>
 </section>;
}
