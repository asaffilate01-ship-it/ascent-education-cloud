import {describe,it,expect} from 'vitest';
import {proposeFortnightlyIqaAudit,type AuditCandidate,type AuditPolicy} from '@/lib/qa/fortnightlySampling';

const policy:AuditPolicy={
 tenantId:'centre-a',awardingBody:'Pearson BTEC',policyReference:'centre-approved-policy-2026',
 from:'2026-11-01T00:00:00Z',to:'2026-11-15T00:00:00Z',
 samplePercent:25,minimumCount:1,
};
const candidate=(attemptId:string,rest:Partial<AuditCandidate>={}):AuditCandidate=>({
 attemptId,tenantId:'centre-a',awardingBody:'Pearson BTEC',
 qualificationCode:'BTEC-L4-BUSINESS',level:'4',subject:'business',
 assessorId:'assessor-a',assessmentMethod:'written',releasedAt:'2026-11-04T12:00:00Z',
 status:'released',highRisk:false,...rest,
});
describe('fortnightly, independently approved IQA audit proposal',()=>{
 it('mandates high-risk reviews and then samples across levels, subjects and assessors',()=>{
  const candidates=[
   candidate('a1',{highRisk:true}),
   candidate('a2',{level:'5',subject:'computing',assessorId:'assessor-b',assessmentMethod:'practical'}),
   candidate('a3',{level:'3',subject:'finance',assessorId:'assessor-c',assessmentMethod:'oral'}),
   candidate('a4'),candidate('a5'),candidate('a6'),candidate('a7'),candidate('a8'),
  ];
  const result=proposeFortnightlyIqaAudit(candidates,policy,()=>0);
  expect(result.state).toBe('proposal-needs-independent-approval');
  expect(result.selected).toHaveLength(2);
  expect(result.selected[0]).toEqual({attemptId:'a1',reason:'mandatory-risk'});
  expect(result.selected[1].reason).toBe('coverage');
  expect(result.selected.map(x=>x.attemptId)).toContain('a2');
  expect(result.coverage.levels.covered).toEqual(['4','5']);
  expect(result.coverage.assessors.missing).toContain('assessor-c');
 });
 it('includes all approved high-risk cases even above the configured percentage',()=>{
  const rows=[candidate('r1',{highRisk:true}),candidate('r2',{highRisk:true}),
   candidate('r3',{highRisk:true}),candidate('r4'),candidate('r5')];
  const result=proposeFortnightlyIqaAudit(rows,policy,()=>0.99);
  expect(result.targetCount).toBe(3);
  expect(result.selected).toHaveLength(3);
  expect(result.selected.every(x=>x.reason==='mandatory-risk')).toBe(true);
 });
 it('excludes unreleased, out-of-cycle and other-awarding-body records, not other tenants',()=>{
  const rows=[candidate('ok'),candidate('pending',{status:'not_released'}),
   candidate('later',{releasedAt:'2026-11-15T00:00:00Z'}),
   candidate('other-board',{awardingBody:'OTHM'})];
  const result=proposeFortnightlyIqaAudit(rows,policy,()=>0.5);
  expect(result.eligibleCount).toBe(1);
  expect(result.selected).toEqual([{attemptId:'ok',reason:'coverage'}]);
 });
 it('rejects cross-centre, duplicate, malformed and ambiguous policy data',()=>{
  expect(()=>proposeFortnightlyIqaAudit([candidate('x'),candidate('x')],policy,()=>0)).toThrow(/Duplicate/);
  expect(()=>proposeFortnightlyIqaAudit([candidate('foreign',{tenantId:'centre-b'})],policy,()=>0)).toThrow(/cross-centre/);
  expect(()=>proposeFortnightlyIqaAudit([candidate('bad',{releasedAt:'tomorrow'})],policy,()=>0)).toThrow(/invalid/);
  expect(()=>proposeFortnightlyIqaAudit([candidate('x')],{...policy,policyReference:''},()=>0)).toThrow(/policy/);
 });
 it('rejects invalid random sources instead of silently assigning a compromised sample',()=>{
  const rows=[candidate('a'),candidate('b'),candidate('c'),candidate('d')];
  expect(()=>proposeFortnightlyIqaAudit(rows,policy,()=>NaN)).toThrow(/trusted random/);
 });
});
