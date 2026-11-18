import {describe,expect,it} from 'vitest';
import {examEventChecks,examReadinessSummary,verifiedExamCalendarSnapshot,type ExamCalendarEvent} from '@/lib/exams/examReadiness';
const a:ExamCalendarEvent={id:'a',tenant_id:'jhelum',event_type:'exam',start_date:'2026-11-12T09:00:00Z',end_date:'2026-11-12T11:00:00Z',location:'Room 1'};
describe('exam calendar advisory',()=>{
 it('detects overlapping recorded sessions only in the same centre and room',()=>{
  const b={...a,id:'b',start_date:'2026-11-12T10:00:00Z',end_date:'2026-11-12T12:00:00Z'};
  expect(examReadinessSummary([a,b]).overlapPairs).toBe(1);
  expect(examEventChecks(a,[a,b])).toContain('possible same-venue time overlap');
  expect(examReadinessSummary([a,{...b,tenant_id:'different'}]).overlapPairs).toBe(0);
  expect(examReadinessSummary([a,{...b,location:'Room 2'}]).overlapPairs).toBe(0);
  expect(examReadinessSummary([a,{...b,start_date:'2026-11-12T11:00:00Z'}]).overlapPairs).toBe(0);
 });
 it('flags missing venue and invalid start without fabricating registrations',()=>{
  expect(examReadinessSummary([{...a,location:null,start_date:'invalid',end_date:null}])).toEqual({total:1,missingVenue:1,invalidDates:1,overlapPairs:0});
 });
 it('does not infer overlaps from all-day or open-ended appointments',()=>{
  expect(examReadinessSummary([a,{...a,id:'b',all_day:true}]).overlapPairs).toBe(0);
  expect(examReadinessSummary([a,{...a,id:'b',end_date:null}]).overlapPairs).toBe(0);
 });
});

describe('Phase 22: exam source integrity and timezone-neutral readiness',()=>{
 const row=(change:Record<string,unknown>={})=>({...a,title:'Written examination',...change});
 it('refuses unexpected cross-centre, non-exam and duplicate rows',()=>{
  expect(verifiedExamCalendarSnapshot([row()],'jhelum')).toHaveLength(1);
  for(const bad of [
   row({tenant_id:'another-centre'}),row({event_type:'holiday'}),
   row({title:''}),row({all_day:'yes'}),row({id:' '}),
  ])expect(()=>verifiedExamCalendarSnapshot([bad] as never,'jhelum')).toThrow(/verified/);
  expect(()=>verifiedExamCalendarSnapshot([row(),row()] as never,'jhelum')).toThrow(/verified/);
  expect(()=>verifiedExamCalendarSnapshot(null as never,'jhelum')).toThrow(/verified/);
 });
 it('flags timezone-free and calendar-impossible exam times without claiming a valid schedule',()=>{
  const bad=[
   {...a,start_date:'2026-11-12T09:00:00',end_date:'2026-11-12T10:00:00Z'},
   {...a,start_date:'2026-02-30T09:00:00Z',end_date:'2026-03-01T11:00:00Z'},
   {...a,end_date:null},
   {...a,start_date:'2026-11-12T10:00:00Z',end_date:'2026-11-12T09:00:00Z'},
  ];
  for(const row of bad)expect(examEventChecks(row,[row])).toContain('invalid start or finish date');
 });
 it('accepts Pakistan-local offsets for timed exams and legacy dates for all-day exam events',()=>{
  const timed={...a,start_date:'2026-11-12T14:00:00+05:00',end_date:'2026-11-12T16:00:00+05:00'};
  expect(examEventChecks(timed,[timed])).not.toContain('invalid start or finish date');
  const allDay={...a,all_day:true,start_date:'2026-11-12',end_date:null};
  expect(examEventChecks(allDay,[allDay])).not.toContain('invalid start or finish date');
  expect(examReadinessSummary([allDay]).overlapPairs).toBe(0);
 });
});
