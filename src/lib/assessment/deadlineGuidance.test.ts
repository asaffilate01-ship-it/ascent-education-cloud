import {describe,expect,it} from 'vitest';
import {courseworkDeadlineGuidance,prioritiseActionableCoursework,type DeadlineBrief} from './deadlineGuidance';

const NOW=Date.parse('2026-11-14T10:00:00Z');
const time=(ms:number)=>new Date(NOW+ms).toISOString();
const HOUR=60*60*1000,DAY=24*HOUR;
const brief=(id:string,due=DAY,cutoff=2*DAY):DeadlineBrief=>({
 id,due_at:time(due),submission_cutoff:time(cutoff),
});

describe('evidence-based student coursework timing',()=>{
 it('distinguishes a due date from the final cutoff and never promises eligibility',()=>{
  const due=courseworkDeadlineGuidance(brief('a',-HOUR,2*DAY),NOW);
  expect(due.priority).toBe('overdue');
  expect(due.label).toBe('Due date passed');
  expect(due.detail).toMatch(/may still be restricted/);
 });
 it('raises urgency for final cutoffs within two hours, including exact boundary',()=>{
  const rightAt=courseworkDeadlineGuidance(brief('a',-HOUR,2*HOUR),NOW);
  expect(rightAt.priority).toBe('final-cutoff');
  expect(rightAt.label).toMatch(/within 2 hours/);
  const outside=courseworkDeadlineGuidance(brief('a',-HOUR,2*HOUR+1),NOW);
  expect(outside.priority).toBe('overdue');
  expect(courseworkDeadlineGuidance(brief('b',-3*HOUR,-1),NOW).label).toMatch(/passed/);
 });
 it('distinguishes approaching due dates from future planned briefs',()=>{
  expect(courseworkDeadlineGuidance(brief('soon',DAY,3*DAY),NOW).priority).toBe('due-soon');
  expect(courseworkDeadlineGuidance(brief('later',DAY+1,3*DAY),NOW).priority).toBe('planned');
 });
 it('fails visibly closed when due and cutoff are inconsistent or unknown',()=>{
  for(const bad of [
   {...brief('a'),due_at:'not a date'},
   {...brief('a'),submission_cutoff:''},
   brief('a',2*DAY,DAY),
  ]){
   const message=courseworkDeadlineGuidance(bad,NOW);
   expect(message.priority).toBe('verify');
   expect(message.detail).toMatch(/need verification/);
  }
  expect(courseworkDeadlineGuidance(brief('a'),Number.NaN).priority).toBe('verify');
 });
 it('orders source-confirmed concerns before routine coursework without mutating input',()=>{
  const planned=brief('planned',7*DAY,8*DAY);
  const sooner=brief('due-soon',HOUR,5*DAY);
  const late=brief('late',-DAY,DAY);
  const urgent=brief('urgent',-HOUR,HOUR);
  const inconsistent=brief('verify',8*DAY,7*DAY);
  const input=[planned,sooner,late,urgent,inconsistent];
  const ordered=prioritiseActionableCoursework(input,NOW);
  expect(ordered.map(item=>item.id)).toEqual(['verify','urgent','late','due-soon','planned']);
  expect(input.map(item=>item.id)).toEqual(['planned','due-soon','late','urgent','verify']);
 });
 it('sorts ties by the relevant deadline then record ID',()=>{
  const t1=brief('a',HOUR,DAY*2);
  const t2=brief('b',HOUR/2,DAY*2);
  const t3=brief('c',HOUR,DAY*2);
  expect(prioritiseActionableCoursework([t3,t1,t2],NOW).map(x=>x.id))
   .toEqual(['b','a','c']);
 });
 it('uses no device timezone and does not alter stored date values',()=>{
  const value=brief('a',HOUR,DAY);
  const copy={...value};
  const info=courseworkDeadlineGuidance(value,NOW);
  expect(info.priority).toBe('due-soon');
  expect(value).toEqual(copy);
  expect(prioritiseActionableCoursework([],NOW)).toEqual([]);
 });
});
