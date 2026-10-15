import type {SupabaseClient} from '@supabase/supabase-js';
// Page explicitly so a centre with more than the API's default row limit is not
// silently shown an incomplete admissions queue. Never return a partial snapshot.
export async function workflowRows(db:SupabaseClient,table:string,tenant:string,isCurrent:()=>boolean,columns="*",orderColumn="created_at"){
 const rows:Record<string,unknown>[]=[];
 try {
 for(let offset=0;isCurrent();offset+=250){
  const result=await db.from(table).select(columns).eq('tenant_id',tenant).order(orderColumn,{ascending:false}).order('id',{ascending:false}).range(offset,offset+249);
  if(!isCurrent())return {data:[],error:null};
  if(result.error)return {data:[],error:result.error};
  rows.push(...((result.data||[]) as unknown as Record<string,unknown>[]));
  if((result.data||[]).length<250)return {data:rows,error:null};
 }
 return {data:[],error:null};
 } catch {return {data:[],error:{message:'Workflow request failed'}};}
}
