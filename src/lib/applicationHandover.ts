import {isOpenTask,type SupportTask} from './supportDesk';
export type HandoverApplication={id:string;student_id:string;programme:string;destination_country:string;intake:string|null;status:string};
export const handoverStates=['no_plan','overdue','undated','open','recorded_complete','cancelled_only'] as const;
export const handoverLabels:Record<typeof handoverStates[number],string>={no_plan:'No support plan',overdue:'Overdue work',undated:'Open work without deadlines',open:'Scheduled work open',recorded_complete:'Recorded work completed',cancelled_only:'Only cancelled work'};
export function applicationHandover(applications:HandoverApplication[],tasks:SupportTask[],now:number){
 const grouped=new Map<string,SupportTask[]>();for(const task of tasks){const list=grouped.get(task.application_id)||[];list.push(task);grouped.set(task.application_id,list);}
 return applications.map(application=>{
  const plan=grouped.get(application.id)||[],open=plan.filter(isOpenTask),completed=plan.filter(t=>t.status==='completed').length,cancelled=plan.filter(t=>t.status==='cancelled').length;
  const overdue=open.filter(t=>t.due_at&&Date.parse(t.due_at)<now).length,undated=open.filter(t=>!t.due_at||!Number.isFinite(Date.parse(t.due_at))).length;
  const deadlines=open.map(t=>t.due_at?Date.parse(t.due_at):NaN).filter(Number.isFinite);
  const state:typeof handoverStates[number]=!plan.length?'no_plan':overdue?'overdue':undated?'undated':open.length?'open':completed?'recorded_complete':'cancelled_only';
  return {application,state,total:plan.length,open:open.length,completed,cancelled,overdue,undated,nextDue:deadlines.length?Math.min(...deadlines):null};
 }).sort((a,b)=>handoverStates.indexOf(a.state)-handoverStates.indexOf(b.state)||(a.nextDue??Infinity)-(b.nextDue??Infinity)||a.application.id.localeCompare(b.application.id));
}
