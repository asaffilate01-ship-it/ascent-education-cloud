import {expect,it} from 'vitest';
import {pearsonFineArtQualifications,pearsonFineArtSource} from '@/lib/pearsonFineArt';
import {qualificationSelection} from '@/lib/qualificationSelection';
import {courseOfferKey} from '@/lib/courseOffers';
it('uses the current Fine Art awards and correct cumulative credits without counting craft themes twice',()=>{
 expect(pearsonFineArtQualifications.map(q=>[q.level,q.curriculum?.qualificationNumber,q.curriculum?.credits])).toEqual([[4,'610/1794/2',120],[5,'610/1795/4',240]]);
 for(const q of pearsonFineArtQualifications){
  expect(q.source).toBe(pearsonFineArtSource);expect(q.body).toBe('Pearson BTEC');
  expect(q.curriculum!.modules.flatMap(m=>m.units).reduce((sum,u)=>sum+u.credits,0)).toBe(q.curriculum!.credits);
  expect(q.curriculum!.craftFocus.length).toBeGreaterThan(0);
  expect(qualificationSelection).toContain(q);
 }
 const keys=pearsonFineArtQualifications.map(q=>courseOfferKey(q.body,q.name));expect(new Set(keys).size).toBe(2);
});
