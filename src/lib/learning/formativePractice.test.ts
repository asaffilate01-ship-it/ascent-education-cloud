import {describe,it,expect} from 'vitest';
import {FORMATIVE_QUESTIONS} from './formativeQuestions';
import {CALCULATION_PRACTICE} from './formativeCalculations';
import {practiceResults,practiceSelection} from './formativePractice';
import {reviewFormativeDrafts,formativeDraftPrompt} from './formativeDraftReview';

const draft={subject:'School maths',scope:'Class 8 independent practice',topic:'Number',question:'What is the sum of 17 and 29?',options:['46','44','47','52'],answer:'46',explanation:'Add the units and tens: 17 + 29 = 46.'};
describe('focused formative practice',()=>{
 it('selects distinct questions across topics and caps a session at available records',()=>{
  const source=FORMATIVE_QUESTIONS.filter(q=>q.subject==='School maths');
  const selected=practiceSelection([...source,...source],10);
  expect(selected).toHaveLength(10);
  expect(new Set(selected.map(q=>q.id)).size).toBe(10);
  expect(new Set(selected.map(q=>q.topic)).size).toBeGreaterThan(4);
  expect(practiceSelection(source.slice(0,2),20)).toHaveLength(2);
  expect(practiceSelection([],5)).toEqual([]);
 });
 it('counts valid first responses only and returns missed questions',()=>{
  const questions=FORMATIVE_QUESTIONS.slice(0,2);
  const first=questions[0],second=questions[1];
  const wrong=second.options.find(o=>o!==second.answer)!;
  const result=practiceResults(questions,[{questionId:first.id,choice:first.answer},{questionId:first.id,choice:'invalid'},{questionId:second.id,choice:wrong},{questionId:second.id,choice:second.answer},{questionId:'unknown',choice:'x'}]);
  expect(result).toEqual({answered:2,total:2,correct:1,missed:[second],complete:true});
  expect(practiceResults(questions,[{questionId:first.id,choice:'invalid'}]).answered).toBe(0);
 });
 it('checks all parameterised calculation answer keys against independent arithmetic',()=>{
  expect(CALCULATION_PRACTICE).toHaveLength(48);
  for(let i=0;i<4;i++){
   const expected:Record<string,number>={EQ:5+i*3,PCT:(400+200*i)*(90-5*i)/100,AREA:(9+2*i)*(4+i),MEAN:5+3*i,SPEED:(120+30*i)/10,FORCE:(6+i)*3,DENSITY:4+i,POWER:(240+60*i)/12,GP:(10000+2000*i)-(6000+1000*i),DEP:((12000+6000*i)-(2000+1000*i))/5,AR:(1500+500*i)+(2800+400*i)-(900+200*i),BE:(i+4)*10};
   for(const [code,answer] of Object.entries(expected)){
    const q=CALCULATION_PRACTICE.find(q=>q.id==='UP-FQ4-CALC-'+code+'-0'+(i+1));
    expect(q).toBeDefined();expect(parseFloat(q!.answer)).toBe(answer);
   }
  }
 });
});
describe('provider neutral draft review',()=>{
 it('accepts only the seven proposal fields and keeps the proposal separate from the bank',()=>{
  const result=reviewFormativeDrafts(JSON.stringify([draft]),FORMATIVE_QUESTIONS);
  expect(result.issues).toEqual([]);expect(result.items).toEqual([draft]);
  expect(FORMATIVE_QUESTIONS.some(q=>q.question===draft.question)).toBe(false);
  expect(formativeDraftPrompt('German')).toContain('German');
 });
 it('rejects duplicate prompts, invalid choices, fabricated approval and unknown subjects',()=>{
  const result=reviewFormativeDrafts(JSON.stringify([draft,{...draft,question:draft.question.toUpperCase()},{...draft,question:'Other',options:['A','a','B','C'],answer:'A'},{...draft,question:'New',status:'approved'},{...draft,question:'Unknown topic',subject:'Unverified subject'},{...draft,question:FORMATIVE_QUESTIONS[0].question}]),FORMATIVE_QUESTIONS);
  expect(result.items).toHaveLength(1);expect(result.issues).toHaveLength(5);
 });
 it('rejects malformed, empty and oversized batches',()=>{
  for(const raw of ['not JSON','[]',JSON.stringify(Array.from({length:21},()=>draft)),'x'.repeat(50001)])expect(reviewFormativeDrafts(raw,FORMATIVE_QUESTIONS).issues).toHaveLength(1);
 });
});
