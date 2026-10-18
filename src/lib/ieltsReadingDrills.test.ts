import { describe,expect,it } from 'vitest';
import {IELTS_READING_DRILLS,gradeReadingDrill,readingAttemptSummary} from './ieltsReadingDrills';

describe('UniPathway original IELTS Reading micro-drills',()=>{
  for(const track of ['academic','general'] as const){
    const drill=IELTS_READING_DRILLS[track];
    it(track+' is original, complete and answerable',()=>{
      expect(drill.track).toBe(track);
      expect(drill.questions.length).toBeGreaterThanOrEqual(6);
      expect(drill.passage.join(' ').length).toBeGreaterThan(400);
      const ids=new Set<string>();
      for(const q of drill.questions){
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
        expect(q.choices.some(c=>c.value===q.answer)).toBe(true);
        expect(q.explanation.length).toBeGreaterThan(20);
      }
    });
    it(track+' scores correctly without creating a band prediction',()=>{
      const correct=Object.fromEntries(drill.questions.map(q=>[q.id,q.answer]));
      const perfect=gradeReadingDrill(drill,correct);
      expect(perfect.correct).toBe(drill.questions.length);
      expect(perfect.percent).toBe(100);
      const oneWrong={...correct,[drill.questions[0].id]:'incorrect'};
      const result=gradeReadingDrill(drill,oneWrong);
      expect(result.correct).toBe(drill.questions.length-1);
      expect(result.details.find(d=>!d.isCorrect)?.id).toBe(drill.questions[0].id);
      const summary=readingAttemptSummary(drill,result,85);
      expect(summary).toContain('not a band score');
      expect(summary).toContain('85 seconds');
      expect(summary).toContain(drill.questions[0].id);
    });
    it(track+' handles skipped questions transparently',()=>{
      const result=gradeReadingDrill(drill,{});
      expect(result.correct).toBe(0);
      expect(result.percent).toBe(0);
      expect(result.details.every(q=>q.answer==='')).toBe(true);
    });
  }
});
