import {describe,it,expect} from 'vitest';
import {buildIeltsEvidenceCoverage} from './ieltsReadiness';

describe('IELTS evidence coverage is never a band or admission predictor',()=>{
 it('starts incomplete, with eight separate evidence milestones',()=>{
   const r=buildIeltsEvidenceCoverage([],[]);
   expect(r.coveragePercent).toBe(0);
   expect(r.items).toHaveLength(8);
   expect(r.nextAction?.week).toBe(1);
 });
 it('treats written Writing without tutor assessment as awaiting review',()=>{
   const r=buildIeltsEvidenceCoverage([
     {unit_week:1,skill:'diagnostic'},
     {unit_week:4,skill:'writing'},
     {unit_week:5,skill:'writing'},
   ],[]);
   expect(r.items[0].status).toBe('submitted');
   expect(r.items[3].status).toBe('awaiting_tutor');
   expect(r.items[4].status).toBe('awaiting_tutor');
   expect(r.coveragePercent).toBe(13);
 });
 it('does not call unreviewed audio Speaking evidence complete',()=>{
   const none=buildIeltsEvidenceCoverage([],[{reviewed_at:null,teacher_feedback:null}]);
   expect(none.items[5].status).toBe('awaiting_tutor');
   const reviewed=buildIeltsEvidenceCoverage([],[{reviewed_at:'2026-10-17',teacher_feedback:'Improve consonant stress'}]);
   expect(reviewed.items[5].status).toBe('reviewed');
   expect(reviewed.coveragePercent).toBe(13);
 });
 it('counts submitted practice but never infers official readiness',()=>{
   const all=[1,2,3,4,5,7,8].map(week=>({
     unit_week:week,skill:'practice',teacher_feedback:week===4||week===5?'Tutor reviewed':'',
     reviewed_at:week===4||week===5?'2026-10-17':null
   }));
   const result=buildIeltsEvidenceCoverage(all,[{teacher_feedback:'Human tutor feedback',reviewed_at:'2026-10-17'}]);
   expect(result.reviewedCount).toBe(8);
   expect(result.coveragePercent).toBe(100);
   expect(result.nextAction).toBe(null);
   expect(Object.keys(result)).not.toContain('predictedBand');
   expect(Object.keys(result)).not.toContain('officialReadiness');
 });
});
