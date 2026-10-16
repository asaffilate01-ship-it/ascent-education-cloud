import {describe,it,expect} from 'vitest';
import {baselineChecks,evidenceCurrent,readinessGaps,type ReadinessCheck} from './readiness';
const now=Date.parse('2026-10-15T12:00:00Z');
const check={status:'pass',checked_by:'reviewer',checked_at:'2026-10-15T11:00:00Z',evidence_reference:'evidence/123',valid_until:'2026-10-16T12:00:00Z',notes:null} as ReadinessCheck;
describe('launch evidence gates',()=>{
 it('accepts a current reviewed pass',()=>expect(evidenceCurrent(check,now)).toBe(true));
 it('rejects an expired or absent deadline',()=>{expect(evidenceCurrent({...check,valid_until:new Date(now).toISOString()},now)).toBe(false);expect(evidenceCurrent({...check,valid_until:null},now)).toBe(false);});
 it('requires evidence and reviewer attribution',()=>{expect(evidenceCurrent({...check,evidence_reference:' '},now)).toBe(false);expect(evidenceCurrent({...check,checked_by:null},now)).toBe(false);});
 it('requires justification for an exemption',()=>{expect(evidenceCurrent({...check,status:'not_applicable'},now)).toBe(false);expect(evidenceCurrent({...check,status:'not_applicable',notes:'Out of scope'},now)).toBe(true);});
 it('fails closed when baseline rows are missing',()=>expect(readinessGaps([],[],now)).toEqual({missing:baselineChecks,checks:9,integrations:2}));
 it('does not treat a required integration exemption as health',()=>{const rows=[{integration_key:'microsoft_education',required_for_launch:true,status:'not_applicable',last_health_at:null}];expect(readinessGaps([],rows as never,now).integrations).toBe(2);});
});
