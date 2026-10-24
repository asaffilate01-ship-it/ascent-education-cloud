export type LearningPlan={id:string;module_id:string;student_id:string;goal:string};
export type LearningTask={id:string;plan_id:string;skill:string;baseline:string;diagnostic_evidence:string;instruction:string;position:number};
export type LearningAttempt={id:string;task_id:string;response:string;help_requested:boolean;submitted_at:string;outcome:string|null;feedback:string|null;reviewed_at:string|null};
export const learningLabels:Record<string,string>={not_assessed:'Not yet assessed',needs_support:'Needs tutor support',with_hints:'Demonstrated with hints',independent:'Demonstrated independently'};
export function latestAttempt(taskId:string,attempts:LearningAttempt[]){return attempts.filter(a=>a.task_id===taskId).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)||b.id.localeCompare(a.id))[0];}
export function nextLearningTask(tasks:LearningTask[],attempts:LearningAttempt[]){
 const sorted=[...tasks].sort((a,b)=>a.position-b.position);
 return sorted.find(t=>{const a=latestAttempt(t.id,attempts);return a?.outcome&&a.outcome!=='independent';})||sorted.find(t=>!latestAttempt(t.id,attempts));
}
