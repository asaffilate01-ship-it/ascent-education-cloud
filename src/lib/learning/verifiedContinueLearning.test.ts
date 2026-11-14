import {describe,expect,it} from 'vitest';
import {chooseContinueLesson,currentLessonCompletion} from '@/lib/learning/continueLearning';
import {verifyContinueLearningSnapshot,type OwnedLearningProgress} from './verifiedContinueLearning';
import type {ContinueLesson} from '@/lib/learning/continueLearning';

const scope={studentId:'student-one',tenantId:'centre-a',moduleIds:['module-a']};
const lesson=(change:Partial<ContinueLesson>={}):ContinueLesson=>({
 id:'lesson-a',module_id:'module-a',tenant_id:'centre-a',
 title:'Published lesson',position:1,status:'published',revision:2,...change,
});
const progress=(change:Partial<OwnedLearningProgress>={}):OwnedLearningProgress=>({
 student_id:'student-one',lesson_id:'lesson-a',revision:2,
 position_seconds:105,completed:false,updated_at:'2026-11-13T09:30:00Z',...change,
});

describe('source-verified continue learning',()=>{
 it('resumes only the current learner’s published and in-scope revision',()=>{
  const checked=verifyContinueLearningSnapshot([lesson()],[progress()],scope);
  expect(checked.lessons).toHaveLength(1);
  expect(checked.progress).toEqual([{
   lesson_id:'lesson-a',revision:2,position_seconds:105,
   completed:false,updated_at:'2026-11-13T09:30:00Z',
  }]);
  expect(chooseContinueLesson(checked.lessons,checked.progress)?.reason).toBe('resume');
  expect(currentLessonCompletion(checked.lessons,checked.progress)).toBe(0);
 });
 it('keeps older revision progress only to explain an updated lesson, never to mark current completion',()=>{
  const checked=verifyContinueLearningSnapshot([lesson()],[progress({revision:1,completed:true})],scope);
  expect(chooseContinueLesson(checked.lessons,checked.progress)?.reason).toBe('updated');
  expect(currentLessonCompletion(checked.lessons,checked.progress)).toBe(0);
 });
 it('rejects a different student’s progress despite a known lesson ID',()=>{
  expect(()=>verifyContinueLearningSnapshot([lesson()],[progress({student_id:'peer-student'})],scope))
   .toThrow(/ownership/);
 });
 it('rejects foreign, draft and unassigned lessons instead of silently discarding them',()=>{
  for(const row of [
   lesson({tenant_id:'centre-b'}),lesson({module_id:'module-b'}),
   lesson({status:'draft'}),lesson({title:''}),lesson({revision:0}),
   lesson({position:0}),lesson({id:'   '}),
  ]){
   expect(()=>verifyContinueLearningSnapshot([row],[],scope)).toThrow();
  }
 });
 it('rejects unlinked, duplicated, future or invalid progress without a fallback resume action',()=>{
  const bad=[
   progress({lesson_id:'other-lesson'}),
   progress({revision:3}),
   progress({completed:'yes' as unknown as boolean}),
   progress({position_seconds:-1}),
   progress({position_seconds:86401}),
   progress({updated_at:'not-a-time'}),
  ];
  for(const row of bad){
   expect(()=>verifyContinueLearningSnapshot([lesson()],[row],scope)).toThrow();
  }
  expect(()=>verifyContinueLearningSnapshot([lesson(),lesson()],[],scope)).toThrow(/Published lesson/);
  expect(()=>verifyContinueLearningSnapshot([lesson()],[progress(),progress()],scope)).toThrow(/ownership/);
 });
 it('permits multiple historical revisions but refuses duplicate (lesson,revision) records',()=>{
  const checked=verifyContinueLearningSnapshot([lesson()],[progress({revision:1}),progress()],scope);
  expect(checked.progress).toHaveLength(2);
  expect(()=>verifyContinueLearningSnapshot([lesson()],[progress({revision:1}),progress({revision:1})],scope)).toThrow();
 });
 it('rejects malformed, missing and oversized evidence',()=>{
  expect(()=>verifyContinueLearningSnapshot(null,[],scope)).toThrow();
  expect(()=>verifyContinueLearningSnapshot([{}],[],scope)).toThrow();
  expect(()=>verifyContinueLearningSnapshot([],null,scope)).toThrow();
  expect(()=>verifyContinueLearningSnapshot([],[],{...scope,studentId:''})).toThrow();
  expect(()=>verifyContinueLearningSnapshot([],[],{...scope,moduleIds:['']})).toThrow();
  expect(()=>verifyContinueLearningSnapshot(Array(10001).fill(lesson()),[],scope)).toThrow(/unbounded/);
 });
 it('handles a verified empty course or progress snapshot without inventing a resume',()=>{
  const empty=verifyContinueLearningSnapshot([],[],{...scope,moduleIds:[]});
  expect(chooseContinueLesson(empty.lessons,empty.progress)).toBeNull();
  expect(currentLessonCompletion(empty.lessons,empty.progress)).toBe(0);
 });
});
