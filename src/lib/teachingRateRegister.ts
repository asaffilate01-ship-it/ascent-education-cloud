export type RateRole='centre_director'|'finance_officer';
export type RateBasis='hourly'|'session';
export type RateStatus='pending'|'approved'|'rejected';
export type RateIdentity={id:string;tenant_id:string;lecturer_id:string;effective_from:string;effective_until:string;basis:RateBasis;rate_paisa:number;currency:'PKR';status:RateStatus;agreement_reference:string};
export type TeachingRate=RateIdentity&{lecturer_name:string;proposed_by:string;proposed_at:string;reviewed_by:string|null;reviewed_at:string|null;review_note:string|null};
export type RateRoster={id:string;name:string};
export type RateRegister={roster:RateRoster[];rates:TeachingRate[]};
export type PreviewRow={lecturer_id:string;lecturer_name:string;agreement_id:string|null;basis:RateBasis|null;rate_paisa:number|null;resolution:'calculated'|'missing_rate'|'partial_session';sessions:number;minutes:number;gross_paisa:number|null};
export type RatePreview={rows:PreviewRow[];approved_claims:number;pending_claims:number};
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const text=(x:unknown,max=500):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const integer=(x:unknown,min:number,max=Number.MAX_SAFE_INTEGER):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;
const time=(x:unknown):x is string=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/(?:Z|[+-]\d{2}:\d{2})$/.test(x);
export function rateDate(x:unknown):x is string{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||x<'2000-01-01'||x>'2099-12-31')return false;
 const n=Date.parse(x+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===x;
}
const basis=(x:unknown):x is RateBasis=>x==='hourly'||x==='session';
export function parseRatePaisa(raw:string):number|null{
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw.trim()))return null;
 const [whole,decimal='']=raw.trim().split('.');const n=Number(whole)*100+Number(decimal.padEnd(2,'0'));return integer(n,1,999999999)?n:null;
}
function isRate(x:unknown,tenant:string):x is RateIdentity{
 return object(x)&&id(x.id)&&x.tenant_id===tenant&&id(x.lecturer_id)&&rateDate(x.effective_from)&&rateDate(x.effective_until)&&x.effective_from<=x.effective_until&&basis(x.basis)&&integer(x.rate_paisa,1,999999999)&&x.currency==='PKR'&&['pending','approved','rejected'].includes(String(x.status))&&text(x.agreement_reference)&&x.agreement_reference.trim().length>=5;
}
export function readRateRegister(raw:unknown,tenant:string,role:RateRole,month:string):RateRegister{
 if(!object(raw)||raw.tenant_id!==tenant||raw.role!==role||raw.month!==month+'-01'||!rateDate(raw.month)||!Array.isArray(raw.roster)||raw.roster.length>500||!Array.isArray(raw.rates)||raw.rates.length>500||(role==='finance_officer'&&raw.roster.length))throw Error('Invalid rate register');
 const rosterIds=new Set<string>(),rateIds=new Set<string>();
 for(const r of raw.roster){if(!object(r)||!id(r.id)||!text(r.name,1000)||rosterIds.has(r.id))throw Error('Invalid roster');rosterIds.add(r.id);}
 for(const r of raw.rates){
  if(!isRate(r,tenant)||!object(r)||rateIds.has(r.id)||r.effective_from.slice(0,7)>month||r.effective_until.slice(0,7)<month||!text(r.lecturer_name,1000)||!id(r.proposed_by)||r.proposed_by===r.lecturer_id||!time(r.proposed_at))throw Error('Invalid agreement');
  if(r.status==='pending'?(r.reviewed_by!==null||r.reviewed_at!==null||r.review_note!==null):(!id(r.reviewed_by)||r.reviewed_by===r.proposed_by||r.reviewed_by===r.lecturer_id||!time(r.reviewed_at)||!text(r.review_note)))throw Error('Invalid agreement review');
  rateIds.add(r.id);
 }
 return {roster:raw.roster as RateRoster[],rates:raw.rates as TeachingRate[]};
}
export function readRateReceipt(raw:unknown,expected:Omit<RateIdentity,'status'>,decision?:RateStatus):RateIdentity{
 if(!isRate(raw,expected.tenant_id)||Object.entries(expected).some(([key,value])=>(raw as unknown as Record<string,unknown>)[key]!==value)||(decision&&raw.status!==decision))throw Error('Invalid rate receipt');
 return raw;
}
export function readRatePreview(raw:unknown,tenant:string,month:string):RatePreview{
 if(!object(raw)||raw.tenant_id!==tenant||raw.role!=='finance_officer'||raw.month!==month+'-01'||!rateDate(raw.month)||raw.currency!=='PKR'||!integer(raw.approved_claims,0,500)||!integer(raw.pending_claims,0,2147483647)||!Array.isArray(raw.rows)||raw.rows.length>500)throw Error('Invalid remuneration preview');
 let sessions=0;const seen=new Set<string>();
 for(const r of raw.rows){
  if(!object(r)||!id(r.lecturer_id)||!text(r.lecturer_name,1000)||!integer(r.sessions,1,500)||!integer(r.minutes,r.sessions,r.sessions*1440))throw Error('Invalid preview row');
  const key=r.lecturer_id+':'+String(r.agreement_id)+':'+String(r.resolution);if(seen.has(key))throw Error('Duplicate preview row');seen.add(key);sessions+=r.sessions;
  if(r.resolution==='missing_rate'){if(r.agreement_id!==null||r.basis!==null||r.rate_paisa!==null||r.gross_paisa!==null)throw Error('Missing rate has an amount');continue;}
  if(!id(r.agreement_id)||!basis(r.basis)||!integer(r.rate_paisa,1,999999999))throw Error('Invalid approved rate');
  if(r.resolution==='partial_session'){if(r.basis!=='session'||r.gross_paisa!==null)throw Error('Unreviewed partial session');continue;}
  if(r.resolution!=='calculated'||!integer(r.gross_paisa,0)||r.gross_paisa!==(r.basis==='hourly'?Math.round(r.rate_paisa*r.minutes/60):r.rate_paisa*r.sessions))throw Error('Gross amount not reconciled');
 }
 if(sessions!==raw.approved_claims)throw Error('Incomplete approved claims');
 return {rows:raw.rows as PreviewRow[],approved_claims:raw.approved_claims,pending_claims:raw.pending_claims};
}
export function previewTotals(rows:readonly PreviewRow[]){
 return rows.reduce((a,r)=>{if(r.gross_paisa===null)a.unresolved+=r.sessions;else{a.calculated+=r.sessions;a.gross+=r.gross_paisa;}return a;},{gross:0,calculated:0,unresolved:0});
}
