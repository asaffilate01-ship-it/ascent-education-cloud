/** Client-side scope checks supplement, not replace, the server's RLS
 * and the provider's attempt, spending and capacity gates. */
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=128;
export const labReceiptId=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const blockedLabRequestStates=new Set(['awaiting_provider','provisioning','ready','active','paused']);
const requestStates=new Set([...blockedLabRequestStates,'stopped','expired','failed','cancelled']);
type ScopeRow={id?:string;tenant_id:string;student_id?:string};
export function verifyLabRows<T extends ScopeRow>(rows:unknown,tenant:string,student?:string,key='id'):T[]{
 if(!nonempty(tenant)||!Array.isArray(rows)||rows.length>10000)throw Error('Incomplete lab records');
 const seen=new Set<string>();
 for(const row of rows){
  if(!row||typeof row!=='object'||row.tenant_id!==tenant||(student!==undefined&&row.student_id!==student)||!nonempty(row[key])||seen.has(row[key]))throw Error('Lab records failed scope or uniqueness verification');
  seen.add(row[key]);
 }
 return rows as T[];
}
export function verifyLabRequestHistory<T extends ScopeRow & {template_id:string;status:string;mode:string;class_run_id:string|null}>(rows:unknown,tenant:string,student:string):T[]{
 const verified=verifyLabRows<T>(rows,tenant,student);
 if(verified.some(row=>!nonempty(row.template_id)||!requestStates.has(row.status)||!['class','self_study'].includes(row.mode)||(row.mode==='class'?!nonempty(row.class_run_id):row.class_run_id!==null)))throw Error('Unverified lab request history');
 const active=new Set<string>();
 for(const row of verified)if(blockedLabRequestStates.has(row.status)){
  if(active.has(row.template_id))throw Error('Conflicting active lab requests');
  active.add(row.template_id);
 }
 return verified;
}
export function labAttemptSummary(rows:readonly {template_id:string;status:string}[],templateId:string){
 const matching=rows.filter(row=>row.template_id===templateId);
 return {used:matching.filter(row=>!['failed','cancelled'].includes(row.status)).length,active:matching.some(row=>blockedLabRequestStates.has(row.status))};
}
