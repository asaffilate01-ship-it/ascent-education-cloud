import type {EducationTables} from '@/integrations/supabase/education-types';
export type SupportTask=EducationTables['international_support_tasks']['Row'];
export const isOpenTask=(task:SupportTask)=>['pending','in_progress'].includes(task.status);
export function taskDueGroup(task:SupportTask,now:number){
 if(!isOpenTask(task))return 'closed';
 if(!task.due_at)return 'undated';
 const due=Date.parse(task.due_at);
 return due<now?'overdue':due<=now+7*24*60*60*1000?'week':'later';
}
export function compareSupportTasks(a:SupportTask,b:SupportTask){
 const state=Number(!isOpenTask(a))-Number(!isOpenTask(b));if(state)return state;
 const due=(a.due_at?Date.parse(a.due_at):Infinity)-(b.due_at?Date.parse(b.due_at):Infinity);
 return (Number.isNaN(due)?0:due)||a.id.localeCompare(b.id);
}
export function localDateTime(value:string|null){
 if(!value)return '';const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
export function supportDueValue(input:string,previous:string|null){
 if(input===localDateTime(previous))return previous;
 if(!input)return null;
 const date=new Date(input);if(!Number.isFinite(date.getTime())||localDateTime(date.toISOString())!==input)throw new Error('Enter a valid local date and time.');
 return date.toISOString();
}
