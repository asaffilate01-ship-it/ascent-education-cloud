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
