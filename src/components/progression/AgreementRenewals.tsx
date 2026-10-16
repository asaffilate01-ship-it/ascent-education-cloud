import {useEffect,useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {agreementState,agreementStates,agreementLabels,agreementUsable,compareAgreements,type AgreementRecord} from '@/lib/agreementRenewals';
type Partner={id:string;name?:string};
type Route={id:string;partner_id?:string;route_name?:string;student_visible?:boolean};
export default function AgreementRenewals({agreements,partners,routes,renderAgreement}:{agreements:AgreementRecord[];partners:Partner[];routes:Route[];renderAgreement:(agreement:AgreementRecord,usable:boolean)=>ReactNode}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(0),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const name=(a:AgreementRecord)=>partners.find(p=>p.id===a.partner_id)?.name||a.partner_id||'Unknown organisation';
 const filtered=agreements.filter(a=>(filter==='all'||agreementState(a,now)===filter)&&[name(a),a.id,a.document_reference].some(s=>s?.toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b)=>compareAgreements(a,b,now));
 const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/20)-1));
 const exposed=routes.filter(r=>r.student_visible&&!agreements.some(a=>a.partner_id===r.partner_id&&agreementUsable(a,now)));
 return <section className="space-y-3"><h3 className="font-semibold">Agreement renewals</h3><p className="text-sm text-muted-foreground">Dates use UTC and include the end date. Current dates and a reference do not verify a signature or file availability. The database enforces eligibility.</p>
 <p>{agreements.filter(a=>agreementState(a,now)==='expired').length} expired · {agreements.filter(a=>agreementState(a,now)==='expiring').length} expiring within 30 days</p>
 {exposed.length>0&&<div role="alert" className="border rounded p-3"><p>{exposed.length} published pathway records have no current signed agreement in this snapshot. Review the agreement and publication status.</p><ul>{exposed.map(r=><li key={r.id}>{r.route_name||r.id}</li>)}</ul></div>}
 <div className="flex flex-wrap gap-2"><Input aria-label="Search agreements" placeholder="Organisation or document reference" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><select aria-label="Filter agreement renewal status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}} className="border rounded p-2 bg-background"><option value="all">All agreements ({agreements.length})</option>{agreementStates.map(s=><option key={s} value={s}>{agreementLabels[s]} ({agreements.filter(a=>agreementState(a,now)===s).length})</option>)}</select></div>
 {!filtered.length&&<p role="status">No agreements match these filters.</p>}{filtered.slice(current*20,current*20+20).map(a=><div key={a.id} className="space-y-2"><p className="font-medium">{agreementLabels[agreementState(a,now)]}</p>{renderAgreement(a,agreementUsable(a,now))}</div>)}
 {filtered.length>0&&<div className="flex items-center gap-3"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous agreements</Button><span>Page {current+1} of {Math.ceil(filtered.length/20)}</span><Button variant="outline" disabled={(current+1)*20>=filtered.length} onClick={()=>setPage(current+1)}>Next agreements</Button></div>}</section>;
}
