import type {AgendaAttempt,AgendaBrief,AgendaReleased} from './studentAgenda';

/**
 * Defence-in-depth provenance checks for the read-only student coursework
 * dashboard. The authenticated, RLS-scoped Postgres queries remain the
 * authorisation boundary; this verifies their complete returned snapshot.
 */
export type StudentAgendaScope=Readonly<{
 tenantId:string;studentId:string;moduleIds:readonly string[];
}>;
export type VerifiedStudentBrief=AgendaBrief&Readonly<{tenant_id:string;status:'published'}>;
export type VerifiedStudentAttempt=AgendaAttempt&Readonly<{
 id:string;tenant_id:string;student_id:string;
}>;
export type VerifiedStudentRelease=AgendaReleased&Readonly<{
 attempt_id:string;tenant_id:string;student_id:string;
}>;

const MAX_ROWS=50000;
function record(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw Error('Unverified academic record');
 return value as Record<string,unknown>;
}
function ident(value:unknown):value is string{
 return typeof value==='string'&&value.trim().length>0&&value.length<=128;
}
function rows(value:unknown):Record<string,unknown>[]{
 if(!Array.isArray(value)||value.length>MAX_ROWS)
  throw Error('Incomplete or unbounded student coursework snapshot');
 return value.map(record);
}
function scopeModules(scope:StudentAgendaScope):ReadonlySet<string>{
 if(!ident(scope.tenantId)||!ident(scope.studentId)||!Array.isArray(scope.moduleIds)||
    scope.moduleIds.length>MAX_ROWS||scope.moduleIds.some(id=>!ident(id)))
  throw Error('Unverified student, centre or enrolled modules');
 return new Set(scope.moduleIds);
}

/** Verify brief provenance *before* using any returned IDs to query attempts. */
export function verifyStudentAgendaBriefs(raw:unknown,scope:StudentAgendaScope):VerifiedStudentBrief[]{
 const allowed=scopeModules(scope),seen=new Set<string>();
 return rows(raw).map(row=>{
  if(!ident(row.id)||seen.has(row.id)||row.tenant_id!==scope.tenantId||
     !ident(row.module_id)||!allowed.has(row.module_id)||row.status!=='published'||
     typeof row.title!=='string'||!row.title.trim()||row.title.length>300||
     typeof row.due_at!=='string'||!row.due_at.trim()||
     typeof row.submission_cutoff!=='string'||!row.submission_cutoff.trim()||
     typeof row.max_attempts!=='number'||!Number.isSafeInteger(row.max_attempts)||
     row.max_attempts<1||row.max_attempts>5)
   throw Error('Published coursework failed centre or module verification');
  seen.add(row.id);
  return row as VerifiedStudentBrief;
 });
}

/** Every attempt and released receipt must belong to this learner and brief. */
export function verifyStudentAgendaEvidence(
 briefs:readonly VerifiedStudentBrief[],rawAttempts:unknown,rawReleased:unknown,
 scope:StudentAgendaScope,
):{briefs:VerifiedStudentBrief[];attempts:VerifiedStudentAttempt[];released:VerifiedStudentRelease[]}{
 const verifiedBriefs=verifyStudentAgendaBriefs(briefs,scope);
 const briefIds=new Set(verifiedBriefs.map(brief=>brief.id));
 const attemptLimits=new Map(verifiedBriefs.map(brief=>[brief.id,brief.max_attempts]));
 const attemptsById=new Map<string,VerifiedStudentAttempt>();
 const numbers=new Set<string>();
 const attempts=rows(rawAttempts).map(row=>{
  if(!ident(row.id)||attemptsById.has(row.id)||!ident(row.brief_id)||
     !briefIds.has(row.brief_id)||row.tenant_id!==scope.tenantId||
     row.student_id!==scope.studentId||
     typeof row.attempt_no!=='number'||!Number.isSafeInteger(row.attempt_no)||
     row.attempt_no<1||row.attempt_no>(attemptLimits.get(row.brief_id as string)??0)||
     typeof row.status!=='string'||!row.status.trim()||
     row.status.length>80||row.status==='draft')
   throw Error('Assessment attempt failed student ownership or brief verification');
  const tuple=`${row.brief_id}:${row.attempt_no}`;
  if(numbers.has(tuple))throw Error('Duplicate coursework attempt number');
  numbers.add(tuple);
  const attempt=row as VerifiedStudentAttempt;
  attemptsById.set(attempt.id,attempt);
  return attempt;
 });
 // An incomplete attempt history must not imply an unused attempt or allow
 // the overview to recommend submission under a corrupt sequence.
 const history=new Map<string,number[]>();
 for(const item of attempts){
  const numbers=history.get(item.brief_id)||[];
  numbers.push(item.attempt_no);
  history.set(item.brief_id,numbers);
 }
 for(const numbers of history.values()){
  numbers.sort((a,b)=>a-b);
  if(numbers.some((number,index)=>number!==index+1))
   throw Error('Incomplete coursework attempt history');
 }
 const releaseIds=new Set<string>();
 const released=rows(rawReleased).map(row=>{
  const attempt=ident(row.attempt_id)?attemptsById.get(row.attempt_id):undefined;
  if(!attempt||!ident(row.brief_id)||row.brief_id!==attempt.brief_id||
     row.tenant_id!==scope.tenantId||row.student_id!==scope.studentId||
     releaseIds.has(attempt.id))
   throw Error('Released feedback failed student or assessment-receipt verification');
  releaseIds.add(attempt.id);
  return row as VerifiedStudentRelease;
 });
 return {briefs:verifiedBriefs,attempts,released};
}
