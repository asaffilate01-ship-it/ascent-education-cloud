import {describe,it,expect} from 'vitest';
import {buildApplicationCalendar,calendarEligibleRecords} from './applicationCalendarExport';
import type {DeadlineRecord} from './scholarshipResearch';

const today='2026-11-26',now=new Date('2026-11-25T20:00:00Z');
const record:DeadlineRecord={id:'demo-1',title:'University application',kind:'University application',date:'2026-12-01',source:'https://example.org/private?token=example',completed:false};
describe('application calendar export',()=>{
 it('includes only valid, unique, unfinished planning dates on or after today',()=>{
  expect(calendarEligibleRecords([record,{...record},{...record,id:'old',date:'2026-11-25'},{...record,id:'done',completed:true},{...record,id:'invalid',date:'2026-11-31'},{...record,id:'bad\nUID:x'}],today).map(r=>r.id)).toEqual(['demo-1']);
 });
 it('exports calendar dates as all-day events and omits user-entered source URLs',()=>{
  const result=buildApplicationCalendar([record],today,false,now);
  expect(result).toContain('DTSTART;VALUE=DATE:20261201\r\n');
  expect(result).toContain('DTSTAMP:20261125T200000Z\r\n');
  expect(result).toContain('UID:demo-1@planning.unipathway.pk');
  expect(result).not.toContain('token=example');
  expect(result).not.toContain('BEGIN:VALARM');
 });
 it('includes a one-day display alarm only when requested',()=>{
  expect(buildApplicationCalendar([record],today,true,now)).toContain('BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\n');
 });
 it('escapes punctuation and injected calendar lines, and folds UTF-8 safely',()=>{
  const title='A, B; C\\D\nBEGIN:VEVENT\n'+ '学'.repeat(70);
  const result=buildApplicationCalendar([{...record,title}],today,false,now);
  expect(result.match(/(?:^|\r\n)BEGIN:VEVENT\r\n/g)).toHaveLength(1);
  const unfolded=result.replace(/\r\n /g,'');
  expect(unfolded).toContain('A\\, B\\; C\\\\D\\nBEGIN:VEVENT\\n');
  expect(unfolded).toContain('学'.repeat(70));
  expect(result.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75)).toBe(true);
 });
});
