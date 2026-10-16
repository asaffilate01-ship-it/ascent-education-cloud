import type {SupabaseClient} from '@supabase/supabase-js';
import type {SupportTask} from './supportDesk';
export async function learnerSupport(db:SupabaseClient,tenant:string,applicationIds:string[],current:()=>boolean){
 const tasks:SupportTask[]=[];
 try{for(let chunk=0;chunk<applicationIds.length;chunk+=100){
  const ids=applicationIds.slice(chunk,chunk+100);
  for(let offset=0;current();offset+=100){
   const result=await db.from('international_support_tasks').select('*').eq('tenant_id',tenant).in('application_id',ids).order('created_at',{ascending:false}).order('id').range(offset,offset+99);
   if(!current())return {data:[],error:null};if(result.error)throw result.error;tasks.push(...(result.data||[]) as SupportTask[]);if((result.data||[]).length<100)break;
  }
  if(!current())return {data:[],error:null};
 }return {data:tasks,error:null};}catch{return {data:[],error:'Support deadlines could not be loaded completely. Refresh or contact admissions through the LMS.'};}
}
