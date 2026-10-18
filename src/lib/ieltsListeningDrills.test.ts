import {describe,it,expect} from 'vitest';
import {LISTENING_SCENARIOS,gradeListening,listeningSummary} from './ieltsListeningDrills';
describe('original independent IELTS Listening practice',()=>{
 it('contains two distinct, internally consistent original scripts',()=>{
   expect(LISTENING_SCENARIOS).toHaveLength(2);
   expect(new Set(LISTENING_SCENARIOS.map(s=>s.id)).size).toBe(2);
   for(const scenario of LISTENING_SCENARIOS){
    expect(scenario.spokenScript.length).toBeGreaterThan(500);
    expect(scenario.questions.length).toBe(6);
    for(const q of scenario.questions){
     expect(q.choices.some(c=>c.value===q.correct)).toBe(true);
     expect(q.explanation.length).toBeGreaterThan(15);
    }
   }
 });
 it('grades each scenario without representing the result as an IELTS band',()=>{
   for(const scenario of LISTENING_SCENARIOS){
     const full=Object.fromEntries(scenario.questions.map(q=>[q.id,q.correct]));
     const perfect=gradeListening(scenario,full);
     expect(perfect.correct).toBe(6);
     expect(perfect.percent).toBe(100);
     const wrong=gradeListening(scenario,{...full,[scenario.questions[0].id]:'deliberately-wrong'});
     expect(wrong.correct).toBe(5);
     expect(wrong.details[0].isCorrect).toBe(false);
     expect(listeningSummary(scenario,wrong,1)).toContain('not an IELTS band');
     expect(listeningSummary(scenario,wrong,2)).toContain('Audio play requests: 2');
     const blank=gradeListening(scenario,{});
     expect(blank.correct).toBe(0);
     expect(blank.details.every(q=>q.answer==='')).toBe(true);
   }
 });
});
