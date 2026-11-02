import {describe,expect,it} from 'vitest';
import {examEventChecks,examReadinessSummary,type ExamCalendarEvent} from '@/lib/exams/examReadiness';
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
