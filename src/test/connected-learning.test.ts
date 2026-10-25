import {describe,it,expect} from 'vitest';
import {nextLesson,lessonUrl,type Lesson} from '@/lib/structuredLessons';
import {searchNavigation} from '@/lib/searchNavigation';
const lesson=(id:string,position:number,revision=1)=>({id,position,revision} as Lesson);
describe('connected learning',()=>{
 it('resumes a pending activity rather than the first module',()=>{
  const lessons=[lesson('b',2),lesson('a',1)];expect(nextLesson(lessons,[{lesson_id:'b',revision:1,position_seconds:45,completed:false,updated_at:'2026-10-25'}])?.id).toBe('b');
 });
 it('requires current-version completion',()=>{
  expect(nextLesson([lesson('a',1,2),lesson('b',2)],[{lesson_id:'a',revision:1,position_seconds:0,completed:true,updated_at:'2026-10-25'}])?.id).toBe('a');
 });
 it('skips completed lessons',()=>{
  expect(nextLesson([lesson('a',1),lesson('b',2)],[{lesson_id:'a',revision:1,position_seconds:0,completed:true,updated_at:'2026-10-25'}])?.id).toBe('b');
 });
 it('rejects script, insecure and credential-bearing URLs',()=>{
  for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@example.com'])expect(()=>lessonUrl(url)).toThrow();
  expect(lessonUrl('')).toBe(null);expect(lessonUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf');
 });
 it('does not suggest staff pages to students or visitors',()=>{
  expect(searchNavigation()).toEqual([]);expect(searchNavigation('student').length).toBeGreaterThan(0);
  expect(searchNavigation('student').some(x=>/^\/(director|admissions|landlord|security|finance)/.test(x.path))).toBe(false);
 });
});
