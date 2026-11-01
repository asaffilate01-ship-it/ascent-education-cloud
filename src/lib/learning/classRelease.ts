/** Post-class resource release contract (Pakistan local class scheduling, UTC instants). */
export const NORMAL_CLASS_DELAY_HOURS=24 as const;
export const URGENT_CLASS_DELAY_HOURS=12 as const;
export type ClassReleaseClock={
 status:string;
 ends_at:string|null;
 actual_ended_at:string|null;
 urgent_approved:boolean;
};
export function releaseAt(endedAt:string,hours:12|24){
 const end=Date.parse(endedAt);
 return Number.isFinite(end)?new Date(end+hours*3_600_000).toISOString():null;
}
/**
 * A calendar end alone is not evidence a class took place. Only a server
 * recorded actual end and an approved urgent-release decision can start
 * the 12-hour clock. Cancelled/unknown classes stay locked.
 */
export function classReleaseStatus(entry:ClassReleaseClock,now=Date.now()){
 if(entry.status!=='ended'||!entry.actual_ended_at||!entry.ends_at)
  return {unlocked:false,availableAt:null,hours:24 as 12|24};
 const end=Math.max(Date.parse(entry.actual_ended_at),Date.parse(entry.ends_at));
 if(!Number.isFinite(end))return {unlocked:false,availableAt:null,hours:24 as 12|24};
 const hours=entry.urgent_approved?URGENT_CLASS_DELAY_HOURS:NORMAL_CLASS_DELAY_HOURS;
 const at=end+hours*3_600_000;
 return {unlocked:now>=at,availableAt:new Date(at).toISOString(),hours};
}
export const POST_CLASS_EXPLANATION='Class-specific online resources and recordings unlock 24 hours after the class has actually ended. An authorised academic manager can approve an exceptionally urgent 12-hour release. A scheduled end time alone does not unlock resources.';
export const ACCOMMODATION_EXPLANATION='Students who need accessible formats, advance reading or learning adjustments can request suitable separate preparatory materials without disclosing private wellbeing information to classmates. This does not automatically unlock the embargoed class recording.';
