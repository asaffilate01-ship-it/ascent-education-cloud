import {describe,it,expect} from 'vitest';
import {buildAdmissionsCalendar,foldCalendarLine,saveDeadlineEntry} from './admissionsCalendar';
import type {DeadlineDraft,DeadlineRecord} from './scholarshipResearch';
const draft:DeadlineDraft={title:'Study, plan; review',kind:'Scholarship',date:'2027-01-31',source:'https://example.org/award'};
const entry:DeadlineRecord={...draft,id:'example-1',completed:false};
describe('admissions calendar',()=>{
 it('edits in place without changing identity or completion status',()=>{
  const completed={...entry,completed:true};
  const edited=saveDeadlineEntry([completed],{...draft,title:'Updated'},completed.id,'unused');
  expect(edited).toEqual([{...completed,title:'Updated'}]);
  expect(completed.title).toBe(draft.title);
 });
 it('prevents duplicate, missing and excessive entries',()=>{
  expect(()=>saveDeadlineEntry([entry],draft,null,'other')).toThrow();
  expect(()=>saveDeadlineEntry([entry],draft,'missing','unused')).toThrow();
  expect(()=>saveDeadlineEntry([entry],{...draft,date:'2027-02-29'},entry.id,'unused')).toThrow();
  const full=Array.from({length:30},(_,i)=>({...entry,id:String(i),title:'Plan '+i}));
  expect(()=>saveDeadlineEntry(full,draft,null,'31')).toThrow();
  expect(saveDeadlineEntry(full,{...draft,title:'Changed'},'0','unused')).toHaveLength(30);
 });
 it('exports unfinished all-day events only, with no private source URL',()=>{
  const output=buildAdmissionsCalendar([entry,{...entry,id:'finished',completed:true}],new Date('2026-11-26T07:00:00Z'));
  expect(output).toContain('DTSTART;VALUE=DATE:20270131\r\n');
  expect(output).toContain('DTSTAMP:20261126T070000Z\r\n');
  expect(output).toContain('UID:example-1@unipathway.pk');
  expect(output).toContain('SUMMARY:Study\\, plan\\; review');
  expect(output).not.toContain('finished@');
  expect(output).not.toContain('example.org');
  expect(output.endsWith('END:VCALENDAR\r\n')).toBe(true);
 });
 it('escapes event text and prevents calendar property injection',()=>{
  const output=buildAdmissionsCalendar([{...entry,title:'Example\r\nATTENDEE:mailto:example@example.org'}]);
  expect(output).toContain('SUMMARY:Example\\nATTENDEE:mailto:');
  expect(output).not.toContain('\r\nATTENDEE:');
  expect(()=>buildAdmissionsCalendar([entry,entry])).toThrow();
 });
 it('folds multibyte text at the correct byte limit',()=>{
  const line='SUMMARY:'+('学習🎓'.repeat(25));
  const folded=foldCalendarLine(line);
  expect(folded.split('\r\n').every(part=>new TextEncoder().encode(part).length<=75)).toBe(true);
  expect(folded.replace(/\r\n /g,'')).toBe(line);
 });
});
