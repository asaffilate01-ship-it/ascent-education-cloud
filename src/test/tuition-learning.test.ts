import {it,expect} from 'vitest';
import {nextLearningTask,latestAttempt,type LearningTask,type LearningAttempt} from '@/lib/tuitionLearning';
const task=(id:string,position:number)=>({id,position,plan_id:'plan',skill:id,baseline:'needs_support',diagnostic_evidence:'Evidence from teacher',instruction:'Explain your working'}) as LearningTask;
const attempt=(id:string,task_id:string,outcome:string|null,time='2026-10-24T10:00:00Z')=>({id,task_id,outcome,submitted_at:time,response:'Evidence response',help_requested:false,feedback:null,reviewed_at:null}) as LearningAttempt;
it('prioritises reviewed misconceptions over untouched work without mutating the plan',()=>{const tasks=[task('new',1),task('retry',2)];expect(nextLearningTask(tasks,[attempt('a','retry','with_hints')])?.id).toBe('retry');expect(tasks[0].id).toBe('new');});
it('does not recommend another attempt while a tutor review is pending',()=>{expect(nextLearningTask([task('a',1)],[attempt('pending','a',null)])).toBeUndefined();});
it('a later unsupported attempt supersedes previous independent performance',()=>{const attempts=[attempt('a','a','independent'),attempt('b','a','needs_support','2026-10-25T10:00:00Z')];expect(latestAttempt('a',attempts)?.id).toBe('b');expect(nextLearningTask([task('a',1)],attempts)?.id).toBe('a');});
it('starts with the first unattempted activity and does not invent completed work',()=>{expect(nextLearningTask([task('b',2),task('a',1)],[])?.id).toBe('a');expect(nextLearningTask([task('a',1)],[attempt('a','a','independent')])).toBeUndefined();});
