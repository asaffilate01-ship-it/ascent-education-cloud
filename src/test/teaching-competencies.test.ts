import {describe,it,expect} from 'vitest';
import {teachingSlots,teachingDecision} from '@/lib/teachingCompetencies';
const declaration={subject:'Mathematics',framework:'Cambridge',level:'A Level',experience:'Degree'};
describe('current lecturer teaching evidence',()=>{
 it('extracts separately scoped complete declarations, ignoring malformed fields',()=>{expect(teachingSlots({'Competency 1 — Subject':'Mathematics','Competency 1 — Curriculum / awarding body':'Cambridge','Competency 1 — Maximum level / grade':'A Level','Competency 1 — Relevant qualification or experience':'Degree','Competency 2 — Subject':123})).toEqual([{slot:1,declaration}]);});
 it('does not reuse approval when subject, framework, level or experience changes',()=>{for(const key of Object.keys(declaration)){expect(teachingDecision({...declaration,[key]:'Changed'},{declaration,decision:'approved'})).toBe('changed');}});
 it('distinguishes approved, rejected, revoked, missing and malformed records',()=>{expect(teachingDecision(declaration,null)).toBe('not_reviewed');for(const decision of ['approved','rejected','revoked'])expect(teachingDecision(declaration,{declaration,decision})).toBe(decision);expect(teachingDecision(declaration,{declaration,decision:'unknown'})).toBe('unavailable');});
});
