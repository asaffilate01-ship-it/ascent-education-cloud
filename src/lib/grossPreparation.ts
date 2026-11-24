import {rateDate,readRatePreview,previewTotals,type RateRole,type RatePreview} from '@/lib/teachingRateRegister';
type Summary=RatePreview&{source_count:number;rejected_claims:number;unresolved_claims:number;gross_paisa:number};
type Status='prepared'|'reviewed'|'rejected';
export type GrossBatch={id:string;tenant_id:string;month:string;status:Status;fingerprint:string;prepared_by:string;prepared_at:string;reviewed_by:string|null;reviewed_at:string|null;review_note:string|null;summary:Summary};
export type GrossMonth={summary:Summary;fingerprint:string;ready:boolean;contains_own:boolean;batch:GrossBatch|null;batch_current:boolean|null;rejected_history:{id:string;status:'rejected';prepared_at:string;reviewed_at:string;review_note:string;fingerprint:string}[]};
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const digest=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const time=(x:unknown):x is string=>typeof x==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x));
const count=(x:unknown):x is number=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=500;
const note=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>=5&&x.length<=500;
export function lastCompletedMonth(today:string):string{
 if(!rateDate(today))throw Error('Invalid date');
 const d=new Date(today.slice(0,7)+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,7);
}
function readSummary(raw:unknown,tenant:string,month:string):Summary{
 if(!obj(raw)||raw.tenant_id!==tenant||raw.month!==month+'-01'||!rateDate(raw.month)||raw.currency!=='PKR'||!count(raw.source_count)||!count(raw.rejected_claims)||!count(raw.unresolved_claims)||typeof raw.gross_paisa!=='number'||!Number.isSafeInteger(raw.gross_paisa)||raw.gross_paisa<0)throw Error('Invalid gross summary');
 const p=readRatePreview({...raw,role:'finance_officer'},tenant,month),total=previewTotals(p.rows);
 if(p.approved_claims+p.pending_claims+raw.rejected_claims!==raw.source_count||total.unresolved!==raw.unresolved_claims||total.gross!==raw.gross_paisa)throw Error('Gross summary does not reconcile');
 return {...p,source_count:raw.source_count,rejected_claims:raw.rejected_claims,unresolved_claims:raw.unresolved_claims,gross_paisa:raw.gross_paisa};
}
const ready=(s:Summary)=>s.approved_claims>0&&s.pending_claims===0&&s.unresolved_claims===0;
export function readGrossBatch(raw:unknown,tenant:string,month:string,expected?:{id?:string;fingerprint?:string;status?:Status}):GrossBatch{
 if(!obj(raw)||!uuid(raw.id)||raw.tenant_id!==tenant||raw.month!==month+'-01'||!digest(raw.fingerprint)||!uuid(raw.prepared_by)||!time(raw.prepared_at)||(raw.status!=='prepared'&&raw.status!=='reviewed'&&raw.status!=='rejected'))throw Error('Invalid preparation receipt');
 if(expected?.id&&raw.id!==expected.id||expected?.fingerprint&&raw.fingerprint!==expected.fingerprint||expected?.status&&raw.status!==expected.status)throw Error('Preparation receipt mismatch');
 if(raw.status==='prepared'?(raw.reviewed_by!==null||raw.reviewed_at!==null||raw.review_note!==null):(!uuid(raw.reviewed_by)||raw.reviewed_by===raw.prepared_by||!time(raw.reviewed_at)||!note(raw.review_note)))throw Error('Invalid independent review');
 const summary=readSummary(raw.summary,tenant,month);
 if(!ready(summary)||summary.rows.some(r=>r.lecturer_id===raw.prepared_by||r.lecturer_id===raw.reviewed_by))throw Error('Invalid preparation source');
 return {id:raw.id,tenant_id:tenant,month:month+'-01',status:raw.status,fingerprint:raw.fingerprint,prepared_by:raw.prepared_by,prepared_at:raw.prepared_at,reviewed_by:raw.reviewed_by as string|null,reviewed_at:raw.reviewed_at as string|null,review_note:raw.review_note as string|null,summary};
}
export function readGrossMonth(raw:unknown,tenant:string,role:RateRole,month:string,uid:string):GrossMonth{
 if(!obj(raw)||raw.tenant_id!==tenant||raw.role!==role||raw.month!==month+'-01'||!digest(raw.fingerprint)||typeof raw.ready!=='boolean'||typeof raw.contains_own!=='boolean'||!Array.isArray(raw.rejected_history)||raw.rejected_history.length>10)throw Error('Invalid month receipt');
 const summary=readSummary(raw.summary,tenant,month);
 if(raw.ready!==ready(summary)||raw.contains_own!==summary.rows.some(r=>r.lecturer_id===uid))throw Error('Invalid preparation gate');
 const batch=raw.batch===null?null:readGrossBatch(raw.batch,tenant,month);
 if(batch?(batch.status==='rejected'||typeof raw.batch_current!=='boolean'||raw.batch_current!==(batch.fingerprint===raw.fingerprint)):raw.batch_current!==null)throw Error('Invalid snapshot state');
 const seen=new Set<string>();
 for(const h of raw.rejected_history){if(!obj(h)||!uuid(h.id)||h.status!=='rejected'||!time(h.prepared_at)||!time(h.reviewed_at)||!note(h.review_note)||!digest(h.fingerprint)||seen.has(h.id)||h.id===batch?.id)throw Error('Invalid rejected history');seen.add(h.id);}
 return {summary,fingerprint:raw.fingerprint,ready:raw.ready,contains_own:raw.contains_own,batch,batch_current:raw.batch_current as boolean|null,rejected_history:raw.rejected_history as GrossMonth['rejected_history']};
}
