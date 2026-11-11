import {courseworkQueueState} from './courseworkQueue';

export type AgendaBrief={id:string;module_id:string;title:string;due_at:string;submission_cutoff:string;max_attempts:number};
export type AgendaAttempt={brief_id:string;attempt_no:number;status:string};
export type AgendaReleased={brief_id:string};

/** Same conservative decision as coursework submission; the overview never grants access. */
export function buildStudentCourseworkAgenda<T extends AgendaBrief>(
 briefs:readonly T[],attempts:readonly AgendaAttempt[],released:readonly AgendaReleased[],now=Date.now(),
):{action:T[];review:T[];released:T[];closed:T[]} {
 const byBrief=new Map<string,AgendaAttempt[]>();
 for(const attempt of attempts) {
  const list=byBrief.get(attempt.brief_id)||[];
  list.push(attempt);byBrief.set(attempt.brief_id,list);
 }
 for(const list of byBrief.values())list.sort((a,b)=>b.attempt_no-a.attempt_no);
 const releasedIds=new Set(released.map(item=>item.brief_id));
 const result:{action:T[];review:T[];released:T[];closed:T[]}={action:[],review:[],released:[],closed:[]};
 for(const brief of briefs){
  const state=courseworkQueueState(brief,byBrief.get(brief.id)||[],releasedIds.has(brief.id),now);
  result[state.stage].push(brief);
 }
 const due=(value:string)=>{const date=Date.parse(value);return Number.isFinite(date)?date:Number.POSITIVE_INFINITY;};
 for(const list of Object.values(result))list.sort((a,b)=>due(a.due_at)-due(b.due_at)||a.id.localeCompare(b.id));
 return result;
}
