import {describe,it,expect} from 'vitest';
import {scholarshipSources,validateDeadline,calendarDateInPakistan,deadlineStatus,sortDeadlines,type DeadlineDraft,type DeadlineRecord} from './scholarshipResearch';
const draft:DeadlineDraft={title:' Example award ',kind:'Scholarship',date:'2027-01-31',source:'https://example.org/award'};
describe('scholarship research and planning',()=>{
 it('uses unique official HTTPS source entries',()=>{
  expect(new Set(scholarshipSources.map(s=>s.id)).size).toBe(scholarshipSources.length);
  expect(scholarshipSources.every(s=>new URL(s.url).protocol==='https:')).toBe(true);
 });
 it('validates actual calendar dates and optional secure source URLs',()=>{
  expect(validateDeadline(draft)?.title).toBe('Example award');
  expect(validateDeadline({...draft,source:''})).not.toBeNull();
  expect(validateDeadline({...draft,date:'2027-02-29'})).toBeNull();
  expect(validateDeadline({...draft,date:'2028-02-29'})).not.toBeNull();
  for(const source of ['javascript:alert(1)','http://example.org','https://user:secret@example.org','not-a-url'])expect(validateDeadline({...draft,source})).toBeNull();
  expect(validateDeadline({...draft,title:'   '})).toBeNull();
 });
 it('compares planning dates using Pakistan calendar boundaries',()=>{
  const today=calendarDateInPakistan(new Date('2026-11-25T20:00:00Z'));
  expect(today).toBe('2026-11-26');
  expect(deadlineStatus('2026-11-25',today,false)).toBe('past');
  expect(deadlineStatus(today,today,false)).toBe('today');
  expect(deadlineStatus('2026-12-03',today,false)).toBe('next-seven-days');
  expect(deadlineStatus('2026-12-04',today,false)).toBe('upcoming');
  expect(deadlineStatus('2026-11-25',today,true)).toBe('completed');
 });
 it('sorts unfinished planning entries before completed entries without mutation',()=>{
  const entries:DeadlineRecord[]=[{...draft,id:'c',date:'2026-11-25',completed:true},{...draft,id:'b',date:'2027-01-31',completed:false},{...draft,id:'a',date:'2026-12-01',completed:false}];
  expect(sortDeadlines(entries).map(r=>r.id)).toEqual(['a','b','c']);
  expect(entries.map(r=>r.id)).toEqual(['c','b','a']);
 });
});
