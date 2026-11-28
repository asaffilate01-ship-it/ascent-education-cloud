import {describe,it,expect} from 'vitest';
import {examEventChecks,examReadinessIndex,examReadinessSummary,verifiedExamCalendarSnapshot} from '@/lib/exams/examReadiness';

const event=(id:string,start:string|null,end:string|null,location:string|null='Room A',tenant='centre-a',all_day=false)=>({id,title:'Exam '+id,tenant_id:tenant,event_type:'exam',start_date:start,end_date:end,location,all_day});
const at=(h:string)=>'2026-12-01T'+h+':00+05:00';
describe('indexed examination readiness',()=>{
 it('counts unique overlapping pairs, flags both events, excludes adjacent and all-day events and separates venues and centres',()=>{
  const rows=[
   event('a',at('09:00'),at('11:00')),
   event('b',at('10:00'),at('12:00'),' ROOM A '),
   event('c',at('11:00'),at('13:00')),
   event('d',at('10:00'),at('10:30')),
   event('other-room',at('10:00'),at('11:00'),'Room B'),
   event('other-centre',at('10:00'),at('11:00'),'Room A','centre-b'),
   event('all-day','2026-12-01',null,'Room A','centre-a',true),
   event('invalid','2026-12-01T09:00:00',at('10:00'),null),
   event('adjacent',at('13:00'),at('14:00')),
  ];
  const indexed=examReadinessIndex(rows);
  expect(indexed.summary).toEqual({total:9,missingVenue:1,invalidDates:1,overlapPairs:4});
  for(const row of rows)expect(indexed.checks.get(row.id)).toEqual(examEventChecks(row,rows));
  expect(examReadinessSummary(rows)).toEqual(indexed.summary);
  expect(indexed.checks.get('adjacent')).toEqual([]);
  expect(indexed.checks.get('all-day')).toEqual([]);
 });
 it('retains overlap counts with nested and equal-time windows',()=>{
  const rows=[event('outer',at('08:00'),at('18:00')),event('inner-a',at('09:00'),at('10:00')),event('inner-b',at('11:00'),at('12:00')),event('inner-c',at('11:00'),at('12:00'))];
  expect(examReadinessIndex(rows).summary.overlapPairs).toBe(4);
  for(const row of rows)expect(examReadinessIndex(rows).checks.get(row.id)).toEqual(examEventChecks(row,rows));
 });
 it('handles the maximum verified calendar size without enumerating every overlap pair',()=>{
  const rows=Array.from({length:10000},(_,i)=>event(String(i),at('09:00'),at('10:00')));
  const index=examReadinessIndex(verifiedExamCalendarSnapshot(rows,'centre-a'));
  expect(index.summary.overlapPairs).toBe(49995000);
  expect(index.checks.size).toBe(10000);
  expect(index.checks.get('9999')).toEqual(['possible same-venue time overlap']);
 });
 it('rejects duplicate or foreign records in verified snapshots and preserves invalid-date warnings',()=>{
  const row=event('a',at('09:00'),at('10:00'));
  expect(()=>verifiedExamCalendarSnapshot([row,row],'centre-a')).toThrow();
  expect(()=>examReadinessIndex([row,row])).toThrow();
  expect(()=>verifiedExamCalendarSnapshot([row],'centre-b')).toThrow();
  const invalid=event('bad',null,null);
  expect(examReadinessIndex(verifiedExamCalendarSnapshot([invalid],'centre-a')).summary.invalidDates).toBe(1);
 });
 it('reports no fabricated readiness counts for an empty calendar',()=>{
  expect(examReadinessIndex([]).summary).toEqual({total:0,missingVenue:0,invalidDates:0,overlapPairs:0});
 });
});
