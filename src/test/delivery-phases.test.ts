import {describe,it,expect} from 'vitest';
import {deliveryPhases,deliveryPhaseEvidence,unmappedBaselineChecks} from '@/lib/deliveryPhases';
import {baselineChecks,type ReadinessCheck,type ReadinessIntegration} from '@/lib/readiness';

const now=Date.parse('2026-11-28T12:00:00Z');
const check=(key:string,changes:Partial<ReadinessCheck>={}):ReadinessCheck=>({
 id:key,tenant_id:'centre-a',check_key:key,category:'test',status:'pass',checked_at:'2026-11-28T10:00:00Z',checked_by:'reviewer',
 evidence_reference:'Evidence 1',notes:'Reviewed',valid_until:'2026-12-01T12:00:00Z',revision:1,...changes
} as ReadinessCheck);
const provider=(key:string,changes:Partial<ReadinessIntegration>={}):ReadinessIntegration=>({
 id:key,tenant_id:'centre-a',integration_key:key,category:'test',status:'healthy',last_health_at:'2026-11-28T10:00:00Z',
 last_error:null,required_for_launch:true,...changes
} as ReadinessIntegration);
describe('P0–P9 evidence view',()=>{
 it('maps each existing baseline exactly once and never claims phase completion from missing records',()=>{
  const keys=deliveryPhases.flatMap(p=>[...p.checks]);
  expect(keys).toHaveLength(baselineChecks.length);
  expect(new Set(keys).size).toBe(keys.length);
  expect(unmappedBaselineChecks()).toEqual([]);
  const rows=deliveryPhaseEvidence([],[],now);
  expect(rows).toHaveLength(10);
  expect(rows.every(p=>p.current===0)).toBe(true);
  expect(rows.find(p=>p.id==='P7')?.gates).toEqual([]);
  expect(rows.find(p=>p.id==='P7')?.separate).toContain('No dedicated facilities baseline');
  expect(rows.find(p=>p.id==='P3')?.gates.every(g=>g.state==='missing')).toBe(true);
 });
 it('requires current critical evidence and independently verified provider health',()=>{
  const rows=deliveryPhaseEvidence([check('teams_classroom_smoke_test',{status:'not_applicable'}),check('tenant_role_isolation'),check('backup_restore_drill',{valid_until:'2026-11-27T12:00:00Z'})],[provider('microsoft_education',{last_health_at:'2026-11-27T11:00:00Z'})],now);
  expect(rows.find(p=>p.id==='P3')?.gates.map(g=>g.state)).toEqual(['outstanding','outstanding']);
  expect(rows.find(p=>p.id==='P0')?.current).toBe(1);
  const current=deliveryPhaseEvidence([check('teams_classroom_smoke_test')],[provider('microsoft_education')],now);
  expect(current.find(p=>p.id==='P3')?.current).toBe(2);
  expect(current.find(p=>p.id==='P3')?.separate).toContain('licences');
 });
});
