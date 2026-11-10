import {describe,it,expect} from 'vitest';
import type {AuditProposal} from '@/lib/qa/fortnightlySampling';
import {proposeIndependentAuditReviewers,type ApprovedAuditReviewer,type AuditableCandidate} from '@/lib/qa/independentAuditReviewers';

const coverage={
 levels:{covered:['4'],missing:[]},subjects:{covered:['Business'],missing:[]},
 assessors:{covered:['marker-a'],missing:[]},methods:{covered:['written'],missing:[]},
};
const proposal:AuditProposal={
 state:'proposal-needs-independent-approval',
 tenantId:'centre-a',awardingBody:'OTHM',policyReference:'verified-othm-policy-2026',
 from:'2026-11-01T00:00:00Z',to:'2026-11-15T00:00:00Z',
 eligibleCount:3,targetCount:3,
 selected:[
  {attemptId:'a1',reason:'mandatory-risk'},
  {attemptId:'a2',reason:'coverage'},
  {attemptId:'a3',reason:'random'},
 ],coverage,
};
const attempt=(id:string,overrides:Partial<AuditableCandidate>={}):AuditableCandidate=>({
 attemptId:id,tenantId:'centre-a',awardingBody:'OTHM',
 qualificationCode:'OTHM-L4-BUS',level:'4',subject:'Business',assessorId:'marker-a',
 originalIqaReviewerId:'first-qa',assessmentMethod:'written',
 releasedAt:'2026-11-07T12:00:00Z',status:'released',highRisk:false,...overrides,
});
const reviewer=(id:string,overrides:Partial<ApprovedAuditReviewer>={}):ApprovedAuditReviewer=>({
 id,tenantId:'centre-a',active:true,verifiedRoles:['iqa_officer'],
 approvedAwardingBodies:['OTHM'],approvedQualificationCodes:['OTHM-L4-BUS'],
 approvedLevels:['4'],approvedSubjects:['Business'],approvedMethods:['written'],
 conflictAttemptIds:[],...overrides,
});
const attempts=[attempt('a1'),attempt('a2'),attempt('a3')];

describe('pre-activation independent IQA reviewer proposals',()=>{
 it('balances an authorised, independent reviewer proposal without issuing assignments or grades',()=>{
  const result=proposeIndependentAuditReviewers(proposal,attempts,[reviewer('r1'),reviewer('r2')]);
  expect(result.state).toBe('proposal-needs-independent-approval');
  expect(result.assigned).toBe(3);
  expect(result.assignments.map(a=>[a.attemptId,a.reviewerId])).toEqual([
   ['a1','r1'],['a2','r2'],['a3','r1'],
  ]);
  expect(result.note).toContain('Planning only');
  expect(Object.keys(result.assignments[0]).sort()).toEqual(['attemptId','reviewerId','sampleReason']);
 });
 it('never assigns the original marker, the initial IQA reviewer or a conflict-linked reviewer',()=>{
  const pool=[reviewer('marker-a'),reviewer('first-qa'),
   reviewer('r1',{conflictAttemptIds:['a1']}),reviewer('r2')];
  const result=proposeIndependentAuditReviewers(proposal,attempts,pool);
  expect(result.state).toBe('proposal-needs-independent-approval');
  expect(result.assignments[0]).toEqual({attemptId:'a1',reviewerId:'r2',sampleReason:'mandatory-risk'});
  expect(result.assignments.every(a=>!['marker-a','first-qa'].includes(a.reviewerId))).toBe(true);
 });
 it('blocks the entire cycle when any sampled attempt lacks a qualified independent reviewer',()=>{
  const pool=[reviewer('r1',{approvedSubjects:['Business'],conflictAttemptIds:['a3']})];
  const result=proposeIndependentAuditReviewers(proposal,attempts,pool);
  expect(result.state).toBe('blocked');
  expect(result.assignments).toEqual([]);
  expect(result.assigned).toBe(0);
  expect(result.blockedAttemptIds).toEqual(['a3']);
 });
 it('does not treat inactive, unapproved or under-qualified reviewers as valid',()=>{
  const pool=[reviewer('r1',{active:false}),reviewer('r2',{verifiedRoles:['lecturer']}),
   reviewer('r3',{approvedLevels:['5']}),reviewer('r4',{approvedMethods:['practical']})];
  expect(proposeIndependentAuditReviewers(proposal,attempts,pool).state).toBe('blocked');
 });
 it('fails closed on foreign centres, duplicate identities, unreleased work and unknown previous QA staff',()=>{
  expect(()=>proposeIndependentAuditReviewers(proposal,attempts,[reviewer('foreign',{tenantId:'centre-b'})])).toThrow(/cross-centre/);
  expect(()=>proposeIndependentAuditReviewers(proposal,attempts,[reviewer('r1'),reviewer('r1')])).toThrow(/Duplicate reviewer/);
  expect(()=>proposeIndependentAuditReviewers(proposal,[attempt('a1'),attempt('a2',{status:'not_released'}),attempt('a3')],[reviewer('r1')])).toThrow(/Invalid, duplicate/);
  expect(()=>proposeIndependentAuditReviewers(proposal,[attempt('a1'),attempt('a2',{originalIqaReviewerId:''}),attempt('a3')],[reviewer('r1')])).toThrow(/Invalid, duplicate/);
  expect(()=>proposeIndependentAuditReviewers({...proposal,selected:[proposal.selected[0],proposal.selected[0],proposal.selected[2]]},attempts,[reviewer('r1')])).toThrow(/incomplete or duplicated/);
  expect(()=>proposeIndependentAuditReviewers(proposal,[...attempts,attempt('foreign',{tenantId:'centre-b'})],[reviewer('r1')])).toThrow(/cross-centre/);
 });
});
