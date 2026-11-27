import {describe,it,expect} from 'vitest';
import {verifyFollowups,openFollowupPayload,resolveFollowupPayload,verifyFollowupReceipt,type FollowupCommand} from './facilitiesFollowups';
import type {FacilityRegister} from './facilitiesRegister';
const asset='10000000-0000-4000-8000-000000000001';
const inspection='10000000-0000-4000-8000-000000000002';
const action='10000000-0000-4000-8000-000000000003';
const tenant='centre-a',today='2026-11-27';
const register:FacilityRegister={assets:[{id:asset,tenant_id:tenant,category:'extinguisher',asset_code:'F01',location:'Reception',planned_inspection_date:today}],inspections:[{id:inspection,tenant_id:tenant,asset_id:asset,inspected_on:today,outcome:'defect',notes:'Observed defect',next_due_date:null,recorded_at:'2026-11-27T06:00:00Z'}]};
const row={id:action,tenant_id:tenant,asset_id:asset,inspection_id:inspection,task:'Arrange inspection',team:'facilities',target_date:today,created_at:'2026-11-27T07:00:00Z',resolved_at:null,resolution_evidence:null};
const draft={inspectionId:inspection,task:'  Arrange inspection  ',team:'facilities' as const,targetDate:today};
describe('facilities follow-up validation',()=>{
 it('validates exact centre and inspection links and refuses duplicate or malformed records',()=>{
  expect(verifyFollowups([row],tenant,register)).toHaveLength(1);
  for(const bad of [{...row,tenant_id:'centre-b'},{...row,inspection_id:action},{...row,asset_id:action},{...row,team:'unknown'},{...row,resolution_evidence:'Unconfirmed'},{...row,resolved_at:'2026-11-26T08:00:00Z',resolution_evidence:'Report'}])expect(()=>verifyFollowups([bad],tenant,register)).toThrow();
  expect(()=>verifyFollowups([row,row],tenant,register)).toThrow();
 });
 it('requires a defect or unverified inspection and a valid target date',()=>{
  const payload=openFollowupPayload(draft,register,[],today);
  expect(payload).toEqual({asset_id:asset,inspection_id:inspection,task:'Arrange inspection',team:'facilities',target_date:today});
  expect(()=>openFollowupPayload({...draft,targetDate:'2026-11-26'},register,[],today)).toThrow();
  expect(()=>openFollowupPayload(draft,register,verifyFollowups([row],tenant,register),today)).toThrow();
  expect(()=>openFollowupPayload(draft,{...register,inspections:[{...register.inspections[0],outcome:'satisfactory'}]},[],today)).toThrow();
 });
 it('requires resolution evidence and verifies the exact request without altering the original inspection',()=>{
  const rows=verifyFollowups([row],tenant,register);
  expect(()=>resolveFollowupPayload(action,' ',rows)).toThrow();
  const payload=resolveFollowupPayload(action,' Report received ',rows);
  const command:FollowupCommand={requestId:inspection,kind:'resolve',payload};
  expect(verifyFollowupReceipt({tenant_id:tenant,request_id:inspection,action_id:action,kind:'resolve'},tenant,command)).toBe(action);
  expect(()=>verifyFollowupReceipt({tenant_id:'centre-b',request_id:inspection,action_id:action,kind:'resolve'},tenant,command)).toThrow();
  expect(register.inspections[0].outcome).toBe('defect');
 });
});
