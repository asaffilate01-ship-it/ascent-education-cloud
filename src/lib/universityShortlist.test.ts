import {describe,it,expect} from 'vitest';
import {MAX_SHORTLIST,universityResearchKey,resolveUniversityShortlist,toggleUniversityShortlist} from './universityShortlist';
import type {ProgressionInstitution} from './universityProgressionDirectory';
const all:ProgressionInstitution[]=[{name:'Example University',country:'UK',records:[]},{name:'Example University',country:'USA',records:[]},{name:'Another University',country:'Australia',records:[]},{name:'Fourth University',country:'UK',records:[]}];
const keys=all.map(universityResearchKey);
describe('university research shortlist',()=>{
 it('keeps identity country-specific',()=>expect(keys[0]).not.toBe(keys[1]));
 it('preserves order while rejecting unknown, duplicate and excess choices',()=>expect(resolveUniversityShortlist(all,[keys[1],keys[1],'invalid',keys[0],keys[2],keys[3]]).map(universityResearchKey)).toEqual([keys[1],keys[0],keys[2]]));
 it('allows removing a choice when full, but does not replace a choice silently',()=>{
  const selected=keys.slice(0,MAX_SHORTLIST);
  expect(toggleUniversityShortlist(all,selected,keys[3])).toEqual(selected);
  expect(toggleUniversityShortlist(all,selected,keys[1])).toEqual([keys[0],keys[2]]);
  expect(toggleUniversityShortlist(all,[],'invalid')).toEqual([]);
 });
});
