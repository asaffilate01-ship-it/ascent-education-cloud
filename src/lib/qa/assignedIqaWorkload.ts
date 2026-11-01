export interface AssignedIqaSummary{
 assigned:number;awaitingReview:number;awaitingRelease:number;other:number;
}
/** Reject missing or unrelated allocation evidence; partial figures must never look complete. */
export function summariseAssignedIqaWorkload(
 allocations:readonly {attempt_id:string}[],
 attempts:readonly {id:string;status:string}[],
):AssignedIqaSummary{
 const ids=new Set<string>();
 for(const a of allocations){
  if(typeof a?.attempt_id!=='string'||!a.attempt_id.trim())throw Error('Invalid reviewer allocation');
  ids.add(a.attempt_id);
 }
 const byId=new Map<string,string>();
 for(const attempt of attempts){
  if(!ids.has(attempt?.id)||typeof attempt.status!=='string'||!attempt.status.trim()||byId.has(attempt.id))throw Error('Unverified review evidence');
  byId.set(attempt.id,attempt.status);
 }
 if(byId.size!==ids.size)throw Error('Missing assigned review evidence');
 let awaitingReview=0,awaitingRelease=0;
 for(const status of byId.values()){
  if(status==='human_marked')awaitingReview++;
  if(status==='qa_approved')awaitingRelease++;
 }
 return {assigned:ids.size,awaitingReview,awaitingRelease,other:ids.size-awaitingReview-awaitingRelease};
}
