import {describe,it,expect} from 'vitest';
import {baselineChecks,integrationCurrent,evidenceCurrent,readinessGaps,verifyReadinessHistory,verifyReadinessSnapshot,type ReadinessCheck} from './readiness';
const now=Date.parse('2026-10-15T12:00:00Z');
const check={status:'pass',checked_by:'reviewer',checked_at:'2026-10-15T11:00:00Z',evidence_reference:'evidence/123',valid_until:'2026-10-16T12:00:00Z',notes:null} as ReadinessCheck;
describe('launch evidence gates',()=>{
 it('accepts a current reviewed pass',()=>expect(evidenceCurrent(check,now)).toBe(true));
 it('rejects an expired or absent deadline',()=>{expect(evidenceCurrent({...check,valid_until:new Date(now).toISOString()},now)).toBe(false);expect(evidenceCurrent({...check,valid_until:null},now)).toBe(false);});
 it('requires evidence and reviewer attribution',()=>{expect(evidenceCurrent({...check,evidence_reference:' '},now)).toBe(false);expect(evidenceCurrent({...check,checked_by:null},now)).toBe(false);});
 it('requires justification for an exemption',()=>{expect(evidenceCurrent({...check,status:'not_applicable'},now)).toBe(false);expect(evidenceCurrent({...check,status:'not_applicable',notes:'Out of scope'},now)).toBe(true);});
 it('fails closed when baseline rows are missing',()=>expect(readinessGaps([],[],now)).toEqual({missing:baselineChecks,checks:23,integrations:2}));
 it('does not treat a required integration exemption as health',()=>{const rows=[{integration_key:'microsoft_education',required_for_launch:true,status:'not_applicable',last_health_at:null}];expect(readinessGaps([],rows as never,now).integrations).toBe(2);});
});

describe('health freshness',()=>{
 const integration={status:'healthy',last_health_at:'2026-10-15T11:00:00Z'} as never;
 it('accepts recent provider evidence',()=>expect(integrationCurrent(integration,now)).toBe(true));
 it.each(['2026-10-14T12:00:00Z','2026-10-16T12:00:00Z','bad',''])('rejects stale, future or invalid health: %s',(last_health_at)=>expect(integrationCurrent({...integration as object,last_health_at} as never,now)).toBe(false));
 it.each(['2026-10-16T12:00:00Z','bad'])('rejects invalid review timestamps: %s',(checked_at)=>expect(evidenceCurrent({...check,checked_at},now)).toBe(false));
});

const centre='centre-one';
const integration=(change:Record<string,unknown>={})=>({
 id:'integration-a',tenant_id:centre,integration_key:'microsoft_education',
 category:'providers',required_for_launch:true,status:'healthy',
 last_health_at:'2026-10-15T11:00:00Z',last_error:null,metadata:{},...change,
});
const gate=(change:Record<string,unknown>={})=>({
 id:'check-a',tenant_id:centre,check_key:'tenant_role_isolation',
 category:'security',status:'pass',revision:2,
 evidence_reference:'report-123',checked_at:'2026-10-15T11:00:00Z',
 checked_by:'reviewer-one',notes:null,valid_until:'2026-10-16T11:00:00Z',
 ...change,
});
const history=(change:Record<string,unknown>={})=>({
 id:'history-a',tenant_id:centre,check_id:'check-a',revision:2,
 old_status:'pending',new_status:'pass',evidence_reference:'report-123',
 notes:null,valid_until:'2026-10-16T11:00:00Z',
 reviewed_by:'reviewer-one',created_at:'2026-10-15T11:00:00Z',...change,
});

describe('Phase 19: centre-isolated production evidence',()=>{
 it('accepts a correctly scoped snapshot without manufacturing gate completion',()=>{
  const result=verifyReadinessSnapshot([integration()],[gate()],centre);
  expect(result.integrations[0].tenant_id).toBe(centre);
  expect(result.checks[0].revision).toBe(2);
  expect(readinessGaps(result.checks,result.integrations,now).checks).toBeGreaterThan(0);
 });
 it('rejects cross-centre, malformed and duplicate integration records',()=>{
  for(const bad of [
   integration({tenant_id:'different-centre'}),integration({required_for_launch:'yes'}),
   integration({integration_key:' '}),integration({id:null}),
  ])expect(()=>verifyReadinessSnapshot([bad],[gate()],centre)).toThrow(/Integration evidence/);
  expect(()=>verifyReadinessSnapshot([integration(),integration({id:'another-id'})],[gate()],centre)).toThrow(/Integration evidence/);
  expect(()=>verifyReadinessSnapshot([integration(),integration({integration_key:'institutional_payments'})],[gate()],centre)).toThrow(/Integration evidence/);
 });
 it('rejects cross-centre, unexpected, stale-shape and duplicate launch checks',()=>{
  for(const bad of [
   gate({tenant_id:'another-centre'}),gate({status:'approval'}),
   gate({revision:-1}),gate({revision:'3'}),gate({category:null}),
  ])expect(()=>verifyReadinessSnapshot([integration()],[bad],centre)).toThrow(/Launch check/);
  expect(()=>verifyReadinessSnapshot([integration()],[gate(),gate({id:'check-b'})],centre)).toThrow(/Launch check/);
  expect(()=>verifyReadinessSnapshot([integration()],[gate(),gate({check_key:'backup_restore_drill'})],centre)).toThrow(/Launch check/);
 });
 it('does not turn timezone-free or impossible dates into healthy provider or approved evidence',()=>{
  expect(integrationCurrent(integration({last_health_at:'2026-10-15T11:00:00'}) as never,now)).toBe(false);
  expect(integrationCurrent(integration({last_health_at:'2026-02-30T11:00:00Z'}) as never,now)).toBe(false);
  expect(evidenceCurrent(gate({checked_at:'2026-10-15T11:00:00'}) as never,now)).toBe(false);
  expect(evidenceCurrent(gate({valid_until:'2026-10-16T11:00:00'}) as never,now)).toBe(false);
  expect(evidenceCurrent(gate() as never,Number.NaN)).toBe(false);
 });
 it('rejects malformed, foreign and duplicated audit reviews rather than showing a false history',()=>{
  const check=gate() as ReadinessCheck;
  expect(verifyReadinessHistory([history()],check).map(row=>row.revision)).toEqual([2]);
  for(const bad of [
   history({tenant_id:'another-centre'}),history({check_id:'other-check'}),
   history({revision:0}),history({created_at:'2026-10-15T11:00:00'}),
  ])expect(()=>verifyReadinessHistory([bad],check)).toThrow(/history failed/);
  expect(()=>verifyReadinessHistory([history(),history()],check)).toThrow(/history failed/);
  expect(()=>verifyReadinessHistory([history(),history({id:'other-id'})],check)).toThrow(/history failed/);
  expect(()=>verifyReadinessHistory(null,check)).toThrow(/Unverified/);
 });
 it('accepts an empty evidence list but never an absent snapshot',()=>{
  expect(verifyReadinessSnapshot([],[],centre)).toEqual({integrations:[],checks:[]});
  expect(()=>verifyReadinessSnapshot(null,[],centre)).toThrow(/Unverified/);
  expect(()=>verifyReadinessSnapshot([],null,centre)).toThrow(/Unverified/);
 });
});
