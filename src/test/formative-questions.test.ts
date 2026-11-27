import {describe,it,expect} from 'vitest';
import {FORMATIVE_QUESTIONS} from '@/lib/learning/formativeQuestions';
import {FORMATIVE_SUBJECTS,filterFormativeQuestions,formativeFeedback} from '@/lib/learning/formativeQuestionSearch';
describe('original formative question review bank',()=>{
 it('contains 186 distinct versioned drafts across 16 subject areas, with exactly one keyed choice and an explanation',()=>{
  expect(FORMATIVE_QUESTIONS).toHaveLength(186);expect(FORMATIVE_SUBJECTS).toHaveLength(16);
  expect(new Set(FORMATIVE_QUESTIONS.map(q=>q.id)).size).toBe(186);
  expect(new Set(FORMATIVE_QUESTIONS.map(q=>q.question.normalize('NFKC').toLowerCase().trim())).size).toBe(186);
  for(const q of FORMATIVE_QUESTIONS){expect(q.status).toBe('draft_review_required');expect(q.revision).toBe(1);expect(q.options).toHaveLength(4);expect(new Set(q.options).size).toBe(4);expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);expect(q.explanation.trim().length).toBeGreaterThan(12);}
 });
 it('supports reordered search and subject filters without counting board mappings as new items',()=>{
  expect(filterFormativeQuestions('School physics','resistor')).toHaveLength(2);
  expect(filterFormativeQuestions('all','geometry coordinate')).toHaveLength(1);
  expect(filterFormativeQuestions('German','').length).toBe(7);
  expect(filterFormativeQuestions('School maths','enzyme')).toHaveLength(0);
 });
 it('checks selected answers without a grade, score or official publication',()=>{
  const q=FORMATIVE_QUESTIONS[0];expect(formativeFeedback(q,q.answer)?.correct).toBe(true);
  expect(formativeFeedback(q,q.options.find(o=>o!==q.answer)!)?.correct).toBe(false);
  expect(formativeFeedback(q,'not an option')).toBeNull();
 });
});
