import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
// Complete tenant/RLS-filtered snapshots in bounded requests, never partial queues.
export async function allocatedAssessmentRows(table:string,columns:string,tenant:string,column:string,value:string,current:()=>boolean){
 return {data:await pagedRows<any>(()=>db.from(table).select(columns).eq('tenant_id',tenant).eq(column,value),current,'attempt_id'),error:null};
}
export async function assessmentRowsByIds(table:string,columns:string,tenant:string,column:string,ids:string[],current:()=>boolean,key='id'){
 return {data:await rowsByIds<any>(ids,chunk=>()=>db.from(table).select(columns).eq('tenant_id',tenant).in(column,chunk),current,key),error:null};
}
