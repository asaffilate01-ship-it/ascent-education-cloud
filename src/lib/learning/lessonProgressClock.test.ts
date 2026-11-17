import {describe,expect,it} from 'vitest';
import {chooseContinueLesson,type ContinueLesson} from '@/lib/learning/continueLearning';
import {mergeLessonProgress} from '@/lib/learning/offlineLessons';
import {nextLesson,type Lesson,type LessonProgress} from '@/lib/structuredLessons';

const published=(id:string):ContinueLesson=>({
 id,module_id:'module-one',tenant_id:'centre-one',title:'Study '+id,
 position:id==='alpha'?1:2,status:'published',revision:1,
});
const record=(id:string,updated_at:string,completed=false):LessonProgress=>({
 lesson_id:id,revision:1,position_seconds:120,completed,updated_at,
});

describe('Phase 12: learner resume and offline merge clock integrity',()=>{
 it('selects the actual most recently synced unfinished lesson on the Continue card',()=>{
  const lessons=[published('alpha'),published('beta')];
  const progress=[
   record('alpha','2026-11-17T14:30:00+05:00'), // 09:30 UTC
   record('beta','2026-11-17T10:00:00Z'), // later in absolute time
  ];
  const focus=chooseContinueLesson(lessons,progress);
  expect(focus?.lesson.id).toBe('beta');
  expect(focus?.reason).toBe('resume');
  expect(focus?.saved?.updated_at).toBe('2026-11-17T10:00:00Z');
  expect(nextLesson(lessons as Lesson[],progress)?.id).toBe('beta');
 });
 it('uses a stable lesson ID tie-breaker for exactly equal saved instants',()=>{
  const lessons=[published('alpha'),published('beta')];
  const progress=[
   record('beta','2026-11-17T10:00:00Z'),
   record('alpha','2026-11-17T15:00:00+05:00'),
  ];
  expect(chooseContinueLesson(lessons,progress)?.lesson.id).toBe('alpha');
  expect(nextLesson(lessons as Lesson[],progress)?.id).toBe('alpha');
 });
 it('does not offer Resume when any saved card update lacks a qualified instant',()=>{
  const focus=chooseContinueLesson([published('alpha')],[record('alpha','2026-11-17T12:00:00')]);
  expect(focus).toBeNull();
 });
 it('keeps the newer offline progress position when offsets make string sorting wrong',()=>{
  const remote=record('alpha','2026-11-17T14:30:00+05:00');
  const local={...record('alpha','2026-11-17T10:00:00Z'),position_seconds:180};
  expect(mergeLessonProgress([remote],[local])).toEqual([local]);
 });
 it('keeps completed state while choosing the newer verified synced position',()=>{
  const remote=record('alpha','2026-11-17T14:30:00+05:00',true);
  const local={...record('alpha','2026-11-17T10:00:00Z'),position_seconds:180};
  expect(mergeLessonProgress([remote],[local])).toEqual([{...local,completed:true}]);
 });
 it('preserves UTC-midnight legacy offline dates but rejects corrupt progress clocks',()=>{
  expect(mergeLessonProgress([record('alpha','2026-11-15')],[record('alpha','2026-11-16T00:00:00Z')])[0].updated_at)
   .toBe('2026-11-16T00:00:00Z');
  expect(()=>mergeLessonProgress([record('alpha','2026-02-30T01:00:00Z')],[]))
   .toThrow(/timestamp could not be verified/);
  expect(()=>mergeLessonProgress([], [record('alpha','2026-11-17T12:00:00')]))
   .toThrow(/timestamp could not be verified/);
 });
});
