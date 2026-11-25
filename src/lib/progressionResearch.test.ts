import {describe,it,expect} from 'vitest';
import {defaultResearchFilters,filterProgressionResearch,routeMentionsLevel} from './progressionResearch';
import {getProgressionInstitutions} from './universityProgressionDirectory';
const all=getProgressionInstitutions([{institution:'Example University',country:'UK',body:'OTHM',status:'university_confirmed_othm_route',route:'Level 3/4 IT and Level 5 Business top-up.',sourceKey:'test'}]);
describe('progression research',()=>{
 it('recognises grouped qualification levels',()=>{expect(routeMentionsLevel('Level 3/4 IT','4')).toBe(true);expect(routeMentionsLevel('Year 3 entry','3')).toBe(false);});
 it('matches subject and level in the same route segment',()=>{const filter=(subject:string,level:string)=>filterProgressionResearch(all,{...defaultResearchFilters,subject,level});expect(filter('technology','4')).toHaveLength(1);expect(filter('technology','5')).toHaveLength(0);expect(filter('business','5')).toHaveLength(1);});
 it('respects country, body and unknown filters',()=>{expect(filterProgressionResearch(all,{...defaultResearchFilters,country:'USA'})).toHaveLength(0);expect(filterProgressionResearch(all,{...defaultResearchFilters,body:'Qualifi'})).toHaveLength(0);expect(filterProgressionResearch(all,{...defaultResearchFilters,subject:'invalid'})).toHaveLength(0);});
});
