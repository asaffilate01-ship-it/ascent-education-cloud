/**
 * Read-only, clock-aware guidance for the learner's verified published briefs.
 * Dates are stored as instants and displayed elsewhere in Asia/Karachi.
 * This function never grants submission or makes a marking decision.
 */
export type DeadlineBrief=Readonly<{id:string;due_at:string;submission_cutoff:string}>;
export type DeadlinePriority='verify'|'final-cutoff'|'overdue'|'due-soon'|'planned';

export type DeadlineGuidance=Readonly<{
 priority:DeadlinePriority;
 label:string;
 detail:string;
}>;

const HOUR=60*60*1000;
const DAY=24*HOUR;
const millis=(value:unknown):number|null=>{
 if(typeof value!=='string'||!value.trim())return null;
 const time=Date.parse(value);
 return Number.isFinite(time)?time:null;
};

/** Guidance only. The authorised coursework route rechecks the server window. */
export function courseworkDeadlineGuidance(brief:DeadlineBrief,now:number):DeadlineGuidance{
 const due=millis(brief.due_at),cutoff=millis(brief.submission_cutoff);
 if(!Number.isFinite(now)||due===null||cutoff===null||cutoff<due)
  return {
   priority:'verify',label:'Check assessment dates',
   detail:'The recorded due date and final submission cutoff need verification. Review the full brief before taking action.',
  };
 if(cutoff<now)return {
  priority:'final-cutoff',label:'Recorded final cutoff has passed',
  detail:'A new submission cannot be assumed. Check the coursework page and speak with your centre about any exception.',
 };
 if(cutoff-now<=2*HOUR)return {
  priority:'final-cutoff',label:'Final cutoff within 2 hours',
  detail:'The recorded submission cutoff is approaching. Open the coursework page to verify attempts and eligibility.',
 };
 if(due<now)return {
  priority:'overdue',label:'Due date passed',
  detail:'The final cutoff is later than the due date. Submission may still be restricted; check the brief and current permissions.',
 };
 if(due-now<=DAY)return {
  priority:'due-soon',label:'Due within 24 hours',
  detail:'Review the instructions and submission requirements before the recorded due time.',
 };
 return {
  priority:'planned',label:'Upcoming coursework',
  detail:'Use the published brief to plan your work and confirm the recorded due date.',
 };
}

const rank:Record<DeadlinePriority,number>={
 verify:0,'final-cutoff':1,overdue:2,'due-soon':3,planned:4,
};

/**
 * Put urgent or inconsistent dates first without dropping any verified brief.
 * Ties are stable by relevant deadline, then ID; never mutate the source array.
 */
export function prioritiseActionableCoursework<T extends DeadlineBrief>(
 briefs:readonly T[],now:number,
):T[]{
 const priority=(brief:T)=>{
  const info=courseworkDeadlineGuidance(brief,now);
  const date=info.priority==='due-soon'||info.priority==='planned'
   ?millis(brief.due_at):millis(brief.submission_cutoff);
  return {rank:rank[info.priority],time:date??Number.POSITIVE_INFINITY};
 };
 return [...briefs].sort((a,b)=>{
  const aa=priority(a),bb=priority(b);
  return aa.rank-bb.rank||aa.time-bb.time||a.id.localeCompare(b.id);
 });
}
