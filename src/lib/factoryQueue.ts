import type {EducationTables} from '@/integrations/supabase/education-types';
export type FactoryQueueEvent=Pick<EducationTables['omniqora_event_outbox']['Row'],'id'|'event_type'|'status'|'attempts'|'processed_at'|'created_at'|'exported_at'|'lease_until'|'next_attempt_at'|'factory_run_id'|'last_error'>;
export const queueLabels={local:'Awaiting local processing',ready:'Ready for delivery',leased:'Delivery in progress',backoff:'Waiting for retry',accepted:'Accepted by Factory',attention:'Operator attention required'};
export function factoryQueueState(row:FactoryQueueEvent,now:number):keyof typeof queueLabels{
 if(row.status==='exported')return 'accepted';
 if(!row.processed_at)return 'local';
 if(row.status==='processing'&&row.lease_until&&Date.parse(row.lease_until)>now)return 'leased';
 if(row.attempts>=10)return 'attention';
 if(row.status==='processing')return row.lease_until&&Date.parse(row.lease_until)<now?'ready':'attention';
 if(['pending','failed'].includes(row.status))return Date.parse(row.next_attempt_at)<=now?'ready':'backoff';
 return 'attention';
}
function count(value:unknown,max:number){return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=max;}
export function localProcessingCount(value:unknown){if(!count(value,100))throw new Error('Local processing result could not be confirmed. Refresh the queue.');return value as number;}
export function factoryBatchResult(value:unknown){
 const v=value as {accepted?:unknown;failed?:unknown;localProcessed?:unknown}|null;
 if(!v||!count(v.accepted,5)||!count(v.failed,5)||!count(v.localProcessed,100)||(v.accepted as number)+(v.failed as number)>5)throw new Error('Factory delivery result could not be confirmed. Refresh the queue before retrying.');
 return v as {accepted:number;failed:number;localProcessed:number};
}
export async function factoryDispatchError(error:unknown){
 const context=(error as {context?:{status?:number;json?:()=>Promise<unknown>}})?.context;
 if(context?.status===409){
  let processed:unknown;try{processed=(await context.json?.() as {localProcessed?:unknown})?.localProcessed;}catch{/* Keep configuration feedback even if response is not JSON. */}
  return `Factory connection or credentials are not configured.${count(processed,100)?` ${processed} events were processed locally.`:''} No delivery was attempted by this request.`;
 }
 if(context?.status===403)return 'Access denied or local processing unavailable. Check your centre role and database deployment.';
 if(context?.status===429)return 'Too many dispatch requests. Wait a minute, refresh the queue and retry.';
 return 'Factory delivery could not be confirmed. Refresh the queue: some events may already have been accepted. Check connection and worker logs before retrying.';
}
