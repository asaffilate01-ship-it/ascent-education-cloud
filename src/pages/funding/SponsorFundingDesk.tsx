import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {feeLiability} from '@/lib/feeLiability';
type Invoice={id:string;student_name:string;student_id:string;tenant_id:string;amount:number;paid:number;status:string;sponsor_amount:number;sponsor_paid:number;sponsor_name:string;sponsor_reference:string;sponsor_due_on:string|null;updated_at:string};
const money=(n:number)=>`Rs. ${n.toLocaleString('en-PK')}`;
export default function SponsorFundingDesk(){const {user}=useAuth();return <Desk key={`${user?.id}:${user?.tenantId}`}/>;}
function Desk(){
 const {user}=useAuth(),cache=useQueryClient();const [selected,setSelected]=useState<Invoice|null>(null),[search,setSearch]=useState('');
 const key=['sponsor-invoices',user?.id,user?.tenantId];
 const data=useQuery({queryKey:key,enabled:!!user?.tenantId,queryFn:async()=>{const r=await db.from('invoices').select('*').eq('tenant_id',user!.tenantId).neq('status','refunded').not('student_id','is',null).order('created_at',{ascending:false}).limit(250);if(r.error)throw r.error;return r.data as Invoice[];}});
 const items=data.data?.filter(i=>`${i.student_name} ${i.sponsor_name} ${i.sponsor_reference}`.toLowerCase().includes(search.toLowerCase()))||[];
 return <DashboardLayout title="Sponsor funding" subtitle="Approved fee cover, sponsor receipts and follow-up">
 <p className="mb-5 max-w-3xl text-sm text-muted-foreground">Record the approved funding agreement against the learner’s invoice. Sponsor receipts are separate from student payments. Late sponsor payment never changes the learner’s approved share or enrolment.</p>
 {selected?<Editor key={selected.id} invoice={selected} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);void cache.invalidateQueries({queryKey:key});}} />:<>
 <div className="mb-5 flex flex-wrap items-end gap-3"><label className="flex-1">Find learner, sponsor or agreement<Input value={search} onChange={e=>setSearch(e.target.value)}/></label><Button variant="outline" onClick={()=>data.refetch()}>Refresh</Button></div>
 {data.isLoading?<p role="status">Loading funding records…</p>:data.isError?<p role="alert">Funding records could not be loaded. Refresh to retry.</p>:!items.length?<p>No matching learner invoices. Finance must raise the agreed fee invoice first.</p>:<ul className="divide-y">{items.map(i=>{const liability=feeLiability(i);return <li key={i.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h2 className="font-semibold">{i.student_name}</h2><p className="text-sm">Fee {money(i.amount)} · Student share due {money(liability.studentDue)}</p>{i.sponsor_amount>0?<><p className="text-sm">{i.sponsor_name} · {i.sponsor_reference}</p><p className="text-sm text-muted-foreground">Sponsor owed {money(liability.sponsorDue)}{i.sponsor_due_on?` · Due ${i.sponsor_due_on}`:''}</p></>:<p className="text-sm text-muted-foreground">No approved sponsor allocation</p>}</div><Button variant="outline" onClick={()=>setSelected(i)}>Review funding<span className="sr-only"> for {i.student_name}</span></Button></li>})}</ul>}
 <p className="mt-5 text-sm text-muted-foreground">Up to 250 recent learner invoices. This records approved agreements and receipts; it does not submit government claims or verify bank transactions.</p></>}
 </DashboardLayout>;
}
function Editor({invoice,onClose,onSaved}:{invoice:Invoice;onClose:()=>void;onSaved:()=>void}){
 const [form,setForm]=useState({sponsor_name:invoice.sponsor_name,sponsor_reference:invoice.sponsor_reference,sponsor_amount:String(invoice.sponsor_amount),sponsor_paid:String(invoice.sponsor_paid),sponsor_due_on:invoice.sponsor_due_on||'',funding_note:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const history=useQuery({queryKey:['funding-history',invoice.id],queryFn:async()=>{const r=await db.from('unipathway_funding_events').select('id,note,created_at,current').eq('invoice_id',invoice.id).order('created_at',{ascending:false}).limit(30);if(r.error)throw r.error;return r.data as {id:string;note:string;created_at:string;current:{cover:number;received:number}}[];}});
 async function save(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  const sponsor_amount=Number(form.sponsor_amount),sponsor_paid=Number(form.sponsor_paid);feeLiability({...invoice,sponsor_amount,sponsor_paid});
  if(sponsor_amount<invoice.sponsor_amount||sponsor_paid<invoice.sponsor_paid||sponsor_amount+Number(invoice.paid)>Number(invoice.amount))throw Error('Approved cover and receipts cannot be reduced here, and total allocation cannot exceed the fee less student payments.');
  const r=await db.from('invoices').update({...form,sponsor_amount,sponsor_paid,sponsor_due_on:form.sponsor_due_on||null}).eq('id',invoice.id).eq('updated_at',invoice.updated_at).select('id').single();if(r.error)throw Error('Save was not confirmed. Refresh the record and check the agreement before retrying.');onSaved();
 }catch(e){setError(e instanceof Error?e.message:'Funding could not be saved.');}finally{setBusy(false);}}
 return <form onSubmit={save} className="max-w-3xl space-y-4"><h2 className="text-xl font-semibold">{invoice.student_name}</h2><p>Invoice {money(invoice.amount)} · Student receipts {money(invoice.paid)}</p><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">Funding agreement</legend>
 <label>Sponsor organisation<Input required minLength={2} maxLength={200} value={form.sponsor_name} onChange={e=>setForm({...form,sponsor_name:e.target.value})}/></label>
 <label>Approved agreement reference<Input required minLength={3} maxLength={200} value={form.sponsor_reference} onChange={e=>setForm({...form,sponsor_reference:e.target.value})}/></label>
 <label>Total approved sponsor cover (PKR)<Input required type="number" min={invoice.sponsor_amount} step="0.01" value={form.sponsor_amount} onChange={e=>setForm({...form,sponsor_amount:e.target.value})}/></label>
 <label>Total sponsor receipts verified (PKR)<Input required type="number" min={invoice.sponsor_paid} step="0.01" value={form.sponsor_paid} onChange={e=>setForm({...form,sponsor_paid:e.target.value})}/></label>
 <label>Sponsor payment due<Input type="date" value={form.sponsor_due_on} onChange={e=>setForm({...form,sponsor_due_on:e.target.value})}/></label>
 <label className="sm:col-span-2">Agreement or receipt evidence reference<Textarea required minLength={10} maxLength={2000} value={form.funding_note} onChange={e=>setForm({...form,funding_note:e.target.value})}/></label>
 </fieldset><p className="text-sm text-muted-foreground">Enter cumulative sponsor receipts after verification. Do not also record them as student payments. Corrections reducing approved funding need a separately reviewed adjustment; this form cannot transfer sponsor debt to the student.</p>
 {error&&<p role="alert">{error}</p>}<div className="flex gap-3"><Button disabled={busy}>{busy?'Saving…':'Save approved funding'}</Button><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Close</Button></div>
 <details><summary className="cursor-pointer py-3 font-semibold">Agreement and receipt history</summary>{history.isError?<p role="alert">History could not be loaded.</p>:<ul className="divide-y">{history.data?.map(h=><li key={h.id} className="py-3 text-sm"><p>{new Date(h.created_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} PKT · Cover {money(h.current.cover)} · Received {money(h.current.received)}</p><p>{h.note}</p></li>)}</ul>}</details>
 </form>;
}
