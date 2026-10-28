import CentreFeedbackHistory from './CentreFeedbackHistory';
import {useEffect,useId,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
type Phrase={id:string;tenant_id:string;proposed_by:string;title:string;body:string;status:'proposed'|'approved'|'withdrawn';revision:number;created_at:string;review_reference:string;reviewed_by:string|null};
type Props={onInsert?:(text:string)=>boolean;disabled?:boolean};
export default function CentreFeedbackLibrary(props:Props){
 const {user}=useAuth();
 if(!user||!['assessor','iqa_officer'].includes(user.role))return null;
 return <Library key={`${user.id}:${user.tenantId}:${user.role}`} {...props}/>;
}
const columns='id,tenant_id,proposed_by,title,body,status,revision,created_at,review_reference,reviewed_by';
function Library({onInsert,disabled=false}:Props){
 const statusId=useId();
 const {user}=useAuth();const owner=user!.id,tenant=user!.tenantId,reviewer=user!.role==='iqa_officer';
 const [open,setOpen]=useState(false),[items,setItems]=useState<Phrase[]>([]),[query,setQuery]=useState(''),[filter,setFilter]=useState(reviewer?'proposed':'approved'),[page,setPage]=useState(0);
 const [title,setTitle]=useState(''),[body,setBody]=useState(''),[references,setReferences]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[verified,setVerified]=useState(false),[refresh,setRefresh]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const insertion=useRef({onInsert,disabled});insertion.current={onInsert,disabled};
 const active=useRef(true),operation=useRef(false),request=useRef<{id:string;title:string;body:string}>(),search=useRef<HTMLInputElement>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{
  if(!open)return;let current=true;setLoading(true);setVerified(false);setItems([]);setError('');
  void (async()=>{try{
   if(!tenant)throw Error('Missing centre');
   const rows=await pagedRows<Phrase>(()=>db.from('uni_centre_feedback').select(columns).eq('tenant_id',tenant),()=>current);
   if(!current)return;setItems(rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id)));setVerified(true);
  }catch{if(current)setError('Centre feedback could not be verified. Reload to check access and availability before making changes.');}finally{if(current)setLoading(false);}})();
  return()=>{current=false;};
 },[open,tenant,refresh]);
 const locked=busy||disabled||loading||!verified;
 const pending=(value:boolean)=>{operation.current=value;if(active.current)setBusy(value);};
 const invalidate=()=>{setVerified(false);setItems([]);};
 const reload=()=>{setPage(0);setRefresh(n=>n+1);};
 const rows=items.filter(x=>(filter==='all'||x.status===filter)&&`${x.title} ${x.body}`.toLowerCase().includes(query.trim().toLowerCase()));
 const pages=Math.max(1,Math.ceil(rows.length/10)),current=Math.min(page,pages-1);
 const duplicate=items.some(x=>x.proposed_by===owner&&x.title===title.trim()&&x.body===body.trim());
 async function propose(){
  if(operation.current||locked||reviewer||duplicate||!title.trim()||body.trim().length<3)return;
  const payload={title:title.trim(),body:body.trim()};
  pending(true);setError('');setNotice('');
  try{
   if(!request.current||request.current.title!==payload.title||request.current.body!==payload.body)request.current={...payload,id:crypto.randomUUID()};
   const sent=request.current;
   const r=await db.rpc('propose_uni_centre_feedback',{p_request:sent.id,p_title:sent.title,p_body:sent.body});if(!active.current)return;
   const row=Array.isArray(r.data)&&r.data.length===1?r.data[0]:r.data;
   if(r.error||row?.id!==sent.id||row.tenant_id!==tenant||row.proposed_by!==owner||row.title!==sent.title||row.body!==sent.body||row.status!=='proposed'||row.revision!==1)throw Error('Unconfirmed proposal');
   setTitle('');setBody('');request.current=undefined;setNotice('Proposal submitted for independent IQA review. It is not approved for shared use.');invalidate();reload();
  }catch{if(active.current){invalidate();setError('Proposal was not confirmed. Your wording is retained. Reload and check your proposals before retrying.');}}finally{pending(false);}
 }
 async function review(row:Phrase,action:'approve'|'withdraw'){
  const reference=references[row.id]?.trim()||'';
  if(operation.current||locked||!reviewer||reference.length<10||reference.length>1000||(action==='approve'&&row.proposed_by===owner))return;
  if(!window.confirm(`${action==='approve'?'Approve this exact wording for centre assessors':'Withdraw this wording from shared use'}? Existing learner feedback will not be changed.`))return;
  pending(true);setError('');setNotice('');
  try{
   const r=await db.rpc('review_uni_centre_feedback',{p_feedback:row.id,p_revision:row.revision,p_action:action,p_reference:reference});if(!active.current)return;
   const receipt=Array.isArray(r.data)&&r.data.length===1?r.data[0]:r.data,status=action==='approve'?'approved':'withdrawn';
   if(r.error||receipt?.id!==row.id||receipt.tenant_id!==tenant||receipt.revision!==row.revision+1||receipt.status!==status||receipt.reviewed_by!==owner||receipt.review_reference!==reference||receipt.title!==row.title||receipt.body!==row.body)throw Error('Unconfirmed review');
   setReferences(values=>({...values,[row.id]:''}));setNotice(`Centre wording ${status}. Existing marking feedback is unchanged.`);invalidate();reload();
  }catch{if(active.current){invalidate();setError('Review was not confirmed. Reload the catalogue to check its latest revision before retrying. Your review reference is retained.');}}finally{pending(false);}
 }
 async function insert(row:Phrase){
  if(operation.current||locked||!onInsert||row.status!=='approved')return;pending(true);setError('');setNotice('');
  try{
   const r=await db.from('uni_centre_feedback').select(columns).eq('id',row.id).eq('tenant_id',tenant).eq('status','approved').single();if(!active.current)return;
   if(r.error||r.data?.id!==row.id||r.data.status!=='approved'||r.data.tenant_id!==tenant||r.data.body!==row.body||r.data.revision!==row.revision)throw Error('Approval changed');
   const target=insertion.current;
   if(target.disabled||!target.onInsert){setNotice('Wording was not inserted. Your marking feedback is unchanged.');return;}
   setNotice(target.onInsert(row.body)?'Approved wording inserted as an unsaved draft edit. Tailor it to this learner and save separately.':'Wording was not inserted. Your marking feedback is unchanged.');
  }catch{if(active.current){invalidate();setError('Approval could not be rechecked. No wording was inserted. Reload the catalogue; it may have changed or been withdrawn.');}}finally{pending(false);}
 }
 return <details onToggle={e=>setOpen(e.currentTarget.open)} className="my-4 min-w-0 rounded-xl border bg-card p-4 [&_button]:max-w-full [&_button]:whitespace-normal [overflow-wrap:anywhere]">
 <summary className="min-h-11 cursor-pointer py-2 font-semibold">Centre feedback catalogue</summary>
 <p className="my-2 text-sm text-muted-foreground">Generic centre wording, separate from your private phrases. An independent IQA must approve proposals before shared use. Never include learner names, evidence or private links. Withdrawal does not remove wording already used in drafts or marks.</p>
 <div className="grid gap-3 sm:grid-cols-2"><label className="min-w-0 text-sm">Find centre feedback<Input ref={search} type="search" maxLength={120} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><div className="min-w-0 text-sm"><label htmlFor={statusId}>Centre feedback status</label><select id={statusId} className="mt-1 min-h-11 w-full rounded border bg-background p-2" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="approved">Approved</option><option value="proposed">Awaiting IQA review</option><option value="withdrawn">Withdrawn</option><option value="all">All visible to my role</option></select></div></div>
 <Button className="my-2" variant="outline" disabled={busy||loading} onClick={reload}>Reload centre feedback</Button>
 {loading&&<p role="status">Checking centre feedback…</p>}{error&&<p role="alert" className="my-2 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="my-2 text-sm">{notice}</p>}
 {verified&&!loading&&<><p role="status" className="my-2 text-sm text-muted-foreground">{rows.length} matching centre phrases · page {current+1} of {pages}</p>
 {!rows.length&&<div className="my-2 space-y-2"><p className="text-sm">No centre phrases match this view. Try another status or clear the search.</p>{query&&<Button variant="outline" onClick={()=>{setQuery('');setPage(0);search.current?.focus();}}>Clear centre feedback search</Button>}</div>}
 <ul className="space-y-3">{rows.slice(current*10,current*10+10).map(row=><li key={row.id} className="min-w-0 space-y-2 rounded-lg border p-3"><h3 className="font-semibold">{row.title}</h3><p className="text-sm">{row.status} · revision {row.revision}{row.proposed_by===owner?' · your proposal':''}</p><p className="whitespace-pre-wrap text-sm">{row.body}</p>{row.review_reference&&<p className="text-sm text-muted-foreground">Latest review reference: {row.review_reference}</p>}
 {onInsert&&row.status==='approved'&&<Button variant="outline" disabled={locked} onClick={()=>void insert(row)}>Insert approved wording</Button>}
 {reviewer&&row.status!=='withdrawn'&&<fieldset disabled={locked} className="space-y-2"><label className="block text-sm">Internal review reference for {row.title}<Textarea maxLength={1000} value={references[row.id]||''} onChange={e=>setReferences(values=>({...values,[row.id]:e.target.value}))}/></label><p className="text-xs text-muted-foreground">Use an approval/document reference, without passwords or private access links. Content changes require a new proposal.</p><div className="flex flex-wrap gap-2">{row.status==='proposed'&&<Button disabled={row.proposed_by===owner||(references[row.id]?.trim().length||0)<10} onClick={()=>void review(row,'approve')}>Approve centre wording</Button>}<Button variant="outline" disabled={(references[row.id]?.trim().length||0)<10} onClick={()=>void review(row,'withdraw')}>Withdraw centre wording</Button></div>{row.proposed_by===owner&&<p className="text-sm">Another IQA must approve your own proposal.</p>}</fieldset>}
 <CentreFeedbackHistory feedbackId={row.id} title={row.title} revision={row.revision}/>
 </li>)}</ul>
 {rows.length>10&&<nav aria-label="Centre feedback pages" className="my-3 flex flex-wrap gap-2"><Button variant="outline" disabled={busy||current===0} onClick={()=>setPage(current-1)}>Previous centre phrases</Button><Button variant="outline" disabled={busy||current+1>=pages} onClick={()=>setPage(current+1)}>Next centre phrases</Button></nav>}</>}
 {!reviewer&&<fieldset disabled={busy||disabled} className="mt-4 space-y-2 border-t pt-3"><legend className="font-semibold">Propose generic centre wording</legend><label className="block text-sm">Centre phrase title<Input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block text-sm">Proposed centre wording<Textarea maxLength={2000} value={body} onChange={e=>setBody(e.target.value)}/></label>{duplicate&&<p className="text-sm">This exact proposal is already recorded under your account. Check its review status.</p>}<Button variant="outline" disabled={locked||duplicate||!title.trim()||body.trim().length<3} onClick={()=>void propose()}>Submit phrase for IQA review</Button></fieldset>}
 </details>;
}
