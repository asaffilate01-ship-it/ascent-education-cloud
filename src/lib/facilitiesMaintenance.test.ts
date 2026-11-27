import {describe,it,expect} from 'vitest';
import {facilitiesMaintenanceRows,maintenanceCounts,maintenanceTiming} from './facilitiesMaintenance';
import type {FacilityAsset,FacilityInspection} from './facilitiesRegister';
const asset=(id:string,due:string):FacilityAsset=>({id,tenant_id:'centre',category:'extinguisher',asset_code:id,location:'Room',planned_inspection_date:due});
const inspection=(id:string,assetId:string,date:string,outcome:FacilityInspection['outcome'],next:string|null,recorded:string):FacilityInspection=>({id,tenant_id:'centre',asset_id:assetId,inspected_on:date,outcome,notes:'Observed evidence',next_due_date:next,recorded_at:recorded});
const today='2026-11-27';
describe('facilities maintenance queue',()=>{
 it('classifies dates with inclusive seven day boundary',()=>{
  expect(['2026-11-26',today,'2026-12-04','2026-12-05',null,'2026-02-30'].map(date=>maintenanceTiming(date,today))).toEqual(['overdue','due_today','next_seven_days','later','unscheduled','unscheduled']);
 });
 it('does not fall back to a past original schedule after an inspection with no next date',()=>{
  const rows=facilitiesMaintenanceRows({assets:[asset('A','2026-11-01')],inspections:[inspection('I','A','2026-11-25','satisfactory',null,'2026-11-25T10:00:00Z')]},today);
  expect(rows[0]).toMatchObject({dueDate:null,timing:'unscheduled',needsEvidence:false,recordedDefect:false});
 });
 it('uses latest inspection date and recording time, not response ordering',()=>{
  const rows=facilitiesMaintenanceRows({assets:[asset('A','2026-11-01')],inspections:[
   inspection('old','A','2026-11-24','defect',null,'2026-11-27T11:00:00Z'),
   inspection('latest','A','2026-11-25','satisfactory','2026-12-10','2026-11-25T11:00:00Z'),
   inspection('earlier','A','2026-11-25','not_verified',null,'2026-11-25T10:00:00Z')
  ]},today);
  expect(rows[0].latest?.id).toBe('latest');
  expect(rows[0].recordedDefect).toBe(false);
 });
 it('prioritises recorded defects and preserves independent evidence and schedule counts',()=>{
  const rows=facilitiesMaintenanceRows({assets:[asset('A','2026-11-26'),asset('B','2026-12-10'),asset('C',today)],inspections:[inspection('I','B','2026-11-26','defect','2026-12-10','2026-11-26T10:00:00Z')]},today);
  expect(rows.map(r=>r.asset.id)).toEqual(['B','A','C']);
  expect(maintenanceCounts(rows)).toEqual({defects:1,due:2,soon:0,unscheduled:0,unverified:2});
 });
});
