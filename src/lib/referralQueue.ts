export const referralStages = ['draft','consented','submitted','acknowledged','offer','enrolled','withdrawn','rejected'] as const;
export function referralNextAction(status?:string):string {
 switch(status){
  case 'draft':return 'Await learner consent. Do not share the application yet.';
  case 'consented':return 'Submit through the authorised provider portal, then record its reference.';
  case 'submitted':return 'Check the provider portal for acknowledgement or a decision.';
  case 'acknowledged':return 'Follow up with the provider and record the decision.';
  case 'offer':return 'Confirm acceptance and enrolment with the provider before recording enrolment.';
  case 'enrolled':return 'Enrolment recorded. Complete the institutional handover.';
  case 'withdrawn':return 'Sharing consent withdrawn. Follow the institutional withdrawal process.';
  case 'rejected':return 'Application closed. Discuss alternative verified pathways with the learner.';
  default:return 'Review this case with admissions.';
 }
}
export function referralMatches(row:{id:string;student_id?:string;recipient_name?:string;external_application_ref?:string;status?:string},route:string,query:string,status:string){
 return (status==='all'||row.status===status)&&[row.id,row.student_id,row.recipient_name,row.external_application_ref,route].some(value=>value?.toLowerCase().includes(query.trim().toLowerCase()));
}
export type ReferralTiming={id:string;status?:string;submitted_at?:string|null;created_at?:string|null};
export function referralSubmissionDays(row:ReferralTiming,now:number){
 if(!row.submitted_at)return null;const stamp=Date.parse(row.submitted_at);
 return Number.isFinite(stamp)&&stamp<=now?Math.floor((now-stamp)/86400000):null;
}
export function referralFollowUp(row:ReferralTiming,filter:string,now:number){
 if(filter==='all')return true;
 if(!['submitted','acknowledged'].includes(row.status||''))return false;
 const days=referralSubmissionDays(row,now);
 return filter==='unknown'?days===null:days!==null&&days>=Number(filter);
}
export function compareReferralTiming(a:ReferralTiming,b:ReferralTiming,sort:string){
 const stamp=(r:ReferralTiming)=>{const n=Date.parse((sort==='oldest_submission'?r.submitted_at:r.created_at)||'');return Number.isFinite(n)?n:null;};
 const x=stamp(a),y=stamp(b);if(x===null||y===null)return x===y?a.id.localeCompare(b.id):x===null?1:-1;
 return (sort==='oldest_submission'?x-y:y-x)||a.id.localeCompare(b.id);
}
