import {describe,it,expect} from 'vitest';
import {assetCommandPayload,inspectionCommandPayload,verifyFacilitiesCommandReceipt,facilitiesWriterScope,type FacilitiesCommand,type InspectionEntry} from './facilitiesCommands';
import type {FacilityRegister} from './facilitiesRegister';
const tenant='centre-a',assetId='12345678-1234-4234-8234-123456789abc',requestId='12345678-1234-4234-8234-123456789abd';
const snapshot:FacilityRegister={assets:[{id:assetId,tenant_id:tenant,category:'extinguisher',asset_code:'F01',location:'Reception',planned_inspection_date:'2026-11-26'}],inspections:[]};
const draft={category:'ups' as const,assetCode:' U01 ',location:' Server room ',dueDate:'2026-12-01'};
const inspection:InspectionEntry={assetId,date:'2026-11-26',outcome:'not_verified',notes:' Actual observation ',nextDue:'2026-12-01'};
describe('facilities record commands',()=>{
 it('requires the verified selected director role and centre',()=>{
  const director={id:'director-a',tenantId:tenant,role:'centre_director',roles:['centre_director']};
  expect(facilitiesWriterScope(director)).toBe(tenant);
  expect(facilitiesWriterScope({...director,role:'security_officer',roles:['security_officer','centre_director']})).toBeNull();
  expect(facilitiesWriterScope({...director,role:'superadmin',roles:['superadmin']})).toBeNull();
  expect(facilitiesWriterScope({...director,roles:['security_officer']})).toBeNull();
  expect(facilitiesWriterScope({...director,tenantId:undefined})).toBeNull();
 });
 it('normalises actual asset details and rejects duplicates and invalid dates',()=>{
  expect(assetCommandPayload(draft,snapshot)).toEqual({category:'ups',asset_code:'U01',location:'Server room',planned_inspection_date:'2026-12-01'});
  expect(()=>assetCommandPayload({...draft,assetCode:'f01'},snapshot)).toThrow('already exists');
  expect(()=>assetCommandPayload({...draft,dueDate:'2026-02-30'},snapshot)).toThrow();
  expect(()=>assetCommandPayload(draft,{...snapshot,assets:Array.from({length:500},()=>snapshot.assets[0])})).toThrow('capacity');
 });
 it('rejects future inspections, foreign assets, missing facts and earlier follow-ups',()=>{
  expect(inspectionCommandPayload(inspection,snapshot,'2026-11-26')).toEqual({asset_id:assetId,inspected_on:'2026-11-26',outcome:'not_verified',notes:'Actual observation',next_due_date:'2026-12-01'});
  expect(inspectionCommandPayload({...inspection,nextDue:''},snapshot,'2026-11-26')).toMatchObject({next_due_date:null});
  for(const invalid of [{...inspection,assetId:requestId},{...inspection,date:'2026-11-27'},{...inspection,nextDue:'2026-11-25'},{...inspection,notes:'  '}])expect(()=>inspectionCommandPayload(invalid,snapshot,'2026-11-26')).toThrow();
 });
 it('accepts only acknowledgements matching centre, action and exact request',()=>{
  const command:FacilitiesCommand={kind:'asset',requestId,payload:assetCommandPayload(draft,snapshot)};
  const receipt={id:assetId,tenant_id:tenant,kind:'asset',request_id:requestId};
  expect(verifyFacilitiesCommandReceipt(receipt,tenant,command)).toBe(assetId);
  for(const invalid of [null,[],{...receipt,tenant_id:'centre-b'},{...receipt,kind:'inspection'},{...receipt,request_id:assetId},{...receipt,id:'missing'}])expect(()=>verifyFacilitiesCommandReceipt(invalid,tenant,command)).toThrow();
 });
});
