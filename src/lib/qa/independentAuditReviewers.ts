import type {AuditCandidate,AuditProposal,SampleReason} from '@/lib/qa/fortnightlySampling';

/**
 * SERVER-SIDE PLANNING INPUT ONLY. A trusted identity, qualifications and
 * conflicts service must verify each row before invoking this pure planner.
 * Browser-supplied reviewer flags are never authorisation for a real write.
 */
export type AuditableCandidate=AuditCandidate&Readonly<{
 originalIqaReviewerId:string;
}>;
export type ApprovedAuditReviewer=Readonly<{
 id:string;
 tenantId:string;
 active:boolean;
 verifiedRoles:readonly string[];
 approvedAwardingBodies:readonly string[];
 approvedQualificationCodes:readonly string[];
 approvedLevels:readonly string[];
 approvedSubjects:readonly string[];
 approvedMethods:readonly string[];
 conflictAttemptIds:readonly string[];
}>;
export type ProposedReviewerAssignment=Readonly<{
 attemptId:string;
 reviewerId:string;
 sampleReason:SampleReason;
}>;
export type ReviewerPlan=Readonly<{
 state:'proposal-needs-independent-approval'|'blocked';
 tenantId:string;
 awardingBody:string;
 policyReference:string;
 requested:number;
 assigned:number;
 assignments:ProposedReviewerAssignment[];
 blockedAttemptIds:string[];
 note:string;
}>;

const nonempty=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
function uniqueStrings(list:readonly string[]):boolean{
 return list.every(nonempty)&&new Set(list).size===list.length;
}
function validateReviewer(reviewer:ApprovedAuditReviewer,tenant:string){
 if(!nonempty(reviewer.id)||!nonempty(reviewer.tenantId)||reviewer.tenantId!==tenant||
   typeof reviewer.active!=='boolean'||!Array.isArray(reviewer.verifiedRoles)||
   !Array.isArray(reviewer.approvedAwardingBodies)||!Array.isArray(reviewer.approvedQualificationCodes)||
   !Array.isArray(reviewer.approvedLevels)||!Array.isArray(reviewer.approvedSubjects)||
   !Array.isArray(reviewer.approvedMethods)||!Array.isArray(reviewer.conflictAttemptIds)||
   !uniqueStrings(reviewer.verifiedRoles)||!uniqueStrings(reviewer.approvedAwardingBodies)||
   !uniqueStrings(reviewer.approvedQualificationCodes)||!uniqueStrings(reviewer.approvedLevels)||
   !uniqueStrings(reviewer.approvedSubjects)||!uniqueStrings(reviewer.approvedMethods)||
   !uniqueStrings(reviewer.conflictAttemptIds))
   throw Error('Unverified or cross-centre IQA reviewer pool');
}
function eligible(reviewer:ApprovedAuditReviewer,attempt:AuditableCandidate):boolean{
 return reviewer.active&&reviewer.verifiedRoles.includes('iqa_officer')&&
   reviewer.id!==attempt.assessorId&&reviewer.id!==attempt.originalIqaReviewerId&&
   !reviewer.conflictAttemptIds.includes(attempt.attemptId)&&
   reviewer.approvedAwardingBodies.includes(attempt.awardingBody)&&
   reviewer.approvedQualificationCodes.includes(attempt.qualificationCode)&&
   reviewer.approvedLevels.includes(attempt.level)&&
   reviewer.approvedSubjects.includes(attempt.subject)&&
   reviewer.approvedMethods.includes(attempt.assessmentMethod);
}

/** Return an ALL-OR-NOTHING reviewer *proposal* for an already-sampled cycle.
 * Do not expose student identities, scripts or marks in this response.
 * No reviewer receives work until an independently authorised human approves.
 */
export function proposeIndependentAuditReviewers(
 proposal:AuditProposal,
 population:readonly AuditableCandidate[],
 reviewers:readonly ApprovedAuditReviewer[],
):ReviewerPlan{
 if(proposal?.state!=='proposal-needs-independent-approval'||!nonempty(proposal.tenantId)||
   !nonempty(proposal.awardingBody)||!nonempty(proposal.policyReference)||
   !Number.isInteger(proposal.targetCount)||proposal.targetCount<0||
   !Array.isArray(proposal.selected)||proposal.selected.length!==proposal.targetCount||
   !Array.isArray(population)||!Array.isArray(reviewers))
   throw Error('Approved sampling proposal required');
 if(population.length>10000||reviewers.length>1000)throw Error('Reviewer planning batch exceeds a reviewed size limit');
 const ids=new Set<string>(),candidateById=new Map<string,AuditableCandidate>();
 for(const attempt of population){
  if(!attempt||!nonempty(attempt.attemptId)||ids.has(attempt.attemptId)||
    attempt.tenantId!==proposal.tenantId||attempt.awardingBody!==proposal.awardingBody||
    !nonempty(attempt.originalIqaReviewerId)||!nonempty(attempt.assessorId)||
    !nonempty(attempt.qualificationCode)||!nonempty(attempt.level)||!nonempty(attempt.subject)||
    !nonempty(attempt.assessmentMethod)||attempt.status!=='released'){
    throw Error('Invalid, duplicate or cross-centre IQA assessment evidence');
  }
  ids.add(attempt.attemptId);candidateById.set(attempt.attemptId,attempt);
 }
 const selected=new Set<string>();
 for(const entry of proposal.selected){
  if(!entry||!nonempty(entry.attemptId)||!candidateById.has(entry.attemptId)||
    selected.has(entry.attemptId)||!['mandatory-risk','coverage','random'].includes(entry.reason)){
   throw Error('Selected IQA sample is incomplete or duplicated');
  }
  selected.add(entry.attemptId);
 }
 const reviewerIds=new Set<string>();
 for(const reviewer of reviewers){
  validateReviewer(reviewer,proposal.tenantId);
  if(reviewerIds.has(reviewer.id))throw Error('Duplicate reviewer identity');
  reviewerIds.add(reviewer.id);
 }
 // Stable by attempt and reviewer reference. "Least assigned" reduces accidental
 // concentration and does not imply an algorithm has approved the reviewer.
 const ordered=[...proposal.selected].sort((a,b)=>a.attemptId.localeCompare(b.attemptId));
 const load=new Map<string,number>(),assignments:ProposedReviewerAssignment[]=[];
 const blocked:string[]=[];
 for(const entry of ordered){
  const attempt=candidateById.get(entry.attemptId)!;
  const candidateReviewers=reviewers.filter(reviewer=>eligible(reviewer,attempt))
   .sort((a,b)=>(load.get(a.id)||0)-(load.get(b.id)||0)||a.id.localeCompare(b.id));
  if(!candidateReviewers.length){blocked.push(entry.attemptId);continue;}
  const selectedReviewer=candidateReviewers[0];
  load.set(selectedReviewer.id,(load.get(selectedReviewer.id)||0)+1);
  assignments.push({attemptId:entry.attemptId,reviewerId:selectedReviewer.id,sampleReason:entry.reason});
 }
 if(blocked.length)return {
  state:'blocked',tenantId:proposal.tenantId,awardingBody:proposal.awardingBody,
  policyReference:proposal.policyReference,requested:proposal.selected.length,assigned:0,
  assignments:[],blockedAttemptIds:blocked.sort(),
  note:'No complete, independent, suitably qualified reviewer allocation exists. Nothing can be issued.',
 };
 return {
  state:'proposal-needs-independent-approval',tenantId:proposal.tenantId,
  awardingBody:proposal.awardingBody,policyReference:proposal.policyReference,
  requested:proposal.selected.length,assigned:assignments.length,assignments,
  blockedAttemptIds:[],
  note:'Planning only. A separately authorised human must review conflict and centre evidence before any assignment.',
 };
}
