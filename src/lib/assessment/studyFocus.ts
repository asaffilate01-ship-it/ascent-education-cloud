import type {AgendaBrief} from '@/lib/assessment/studentAgenda';

type Agenda<T extends AgendaBrief>={action:readonly T[];review:readonly T[];released:readonly T[];closed:readonly T[]};
type ClassListing={id:string;module_id:string;title:string;starts_at:string;ends_at:string};
export type StudyFocus=Readonly<{
 kind:'coursework'|'class-check'|'review'|'released';
 title:string;
 detail:string;
 evidence:string;
 actionLabel:string;
 href:string;
}>;

const validTime=(value:string)=>{const time=Date.parse(value);return Number.isFinite(time)?time:null;};
const moduleRoute=(path:string,moduleId:string,extra?:Record<string,string>)=>
  path+'?'+new URLSearchParams({module:moduleId,...extra}).toString();

/**
 * Deterministic, source-grounded guidance, not an LLM-generated grade or
 * entitlement decision. Caller must supply only *complete*, current,
 * centre-scoped student reads. All destinations re-check backend permissions.
 */
export function chooseStudentStudyFocus<T extends AgendaBrief>(
 agenda:Agenda<T>,classes:readonly ClassListing[],allowedModuleIds:readonly string[],now:number,
):StudyFocus|null{
 if(!Number.isFinite(now))return null;
 const allowed=new Set(allowedModuleIds.filter(Boolean));
 if(!allowed.size)return null;
 const next=agenda.action.find(brief=>allowed.has(brief.module_id)&&
  !!brief.id&&validTime(brief.submission_cutoff)!==null&&validTime(brief.submission_cutoff)!>=now);
 const upcoming=classes.filter(session=>allowed.has(session.module_id)&&!!session.id&&
   !!session.title.trim()&&validTime(session.starts_at)!==null&&
   validTime(session.ends_at)!==null&&validTime(session.ends_at)!>=now)
  .sort((a,b)=>validTime(a.starts_at)!-validTime(b.starts_at)!||a.id.localeCompare(b.id))[0];
 const imminent=upcoming&&validTime(upcoming.starts_at)!<=now+90*60_000;
 // An imminent class takes precedence when coursework will remain open until after class.
 if(imminent&&(!next||validTime(next.submission_cutoff)!>validTime(upcoming.starts_at)!)){
  return {
   kind:'class-check',title:'Check access to your next class',
   detail:'This session is listed for one of your enrolled modules. A separate valid invitation is still required to join.',
   evidence:'Enrolled-module class listing',actionLabel:'Verify classroom invitation',
   href:moduleRoute('/student/classroom',upcoming.module_id,{session:upcoming.id}),
  };
 }
 if(next){
  const due=validTime(next.due_at);
  return {
   kind:'coursework',title:`Next coursework: ${next.title}`,
   detail:due!==null&&due<now
    ? 'The due date has passed but the recorded final cutoff may remain open. Check the submission rules and your remaining attempts.'
    : 'This published brief is listed as actionable. The coursework page must verify the current window, attempts and permissions before submission.',
   evidence:'Published coursework brief',actionLabel:'Review coursework and submit eligibility',
   href:moduleRoute('/student/assignments',next.module_id),
  };
 }
 if(upcoming){
  return {
   kind:'class-check',title:'Check access to your next class',
   detail:'Your module has an upcoming session. Access is subject to a separate verified invitation; this is not a confirmed Teams meeting.',
   evidence:'Enrolled-module class listing',actionLabel:'Verify classroom invitation',
   href:moduleRoute('/student/classroom',upcoming.module_id,{session:upcoming.id}),
  };
 }
 const pending=agenda.review.find(brief=>allowed.has(brief.module_id)&&!!brief.id);
 if(pending)return {
  kind:'review',title:'Check the status of submitted coursework',
  detail:'Submitted work can await human assessment and independent IQA approval. No provisional mark is treated as released.',
  evidence:'Your submitted coursework status',actionLabel:'Review assessment status',
  href:moduleRoute('/student/assignments',pending.module_id),
 };
 const released=agenda.released.find(brief=>allowed.has(brief.module_id)&&!!brief.id);
 if(released)return {
  kind:'released',title:'Review independently released feedback',
  detail:'Only approved, released assessment feedback should be shown as a result. Check the latest authorised record for corrections.',
  evidence:'Released assessment status',actionLabel:'Open released results',
  href:moduleRoute('/student/grades',released.module_id),
 };
 return null;
}
