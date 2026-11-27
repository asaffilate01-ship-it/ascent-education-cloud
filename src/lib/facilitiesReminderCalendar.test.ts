import {describe,it,expect} from 'vitest';
import {facilitiesReminderDates,buildFacilitiesReminderCalendar} from './facilitiesReminderCalendar';
import type {MaintenanceRow} from './facilitiesMaintenance';
const date='2026-11-27',now=new Date('2026-11-27T01:00:00Z'),exportId='10000000-0000-4000-8000-000000000001';
const row=(id:string,dueDate:string|null):MaintenanceRow=>({asset:{id,tenant_id:'private-centre',category:'access_control',asset_code:'PRIVATE-DEVICE',location:'PRIVATE-LOCATION',planned_inspection_date:date},latest:null,dueDate,timing:'later',needsEvidence:true,recordedDefect:false});
describe('facilities reminder calendar',()=>{
 it('groups upcoming dates and excludes overdue, unscheduled and out-of-range dates',()=>{
  const dates=facilitiesReminderDates([row('1',date),row('2',date),row('3','2026-11-26'),row('4',null),row('5','2026-12-04'),row('6','2026-12-05')],date,7);
  expect(dates).toEqual([{date,count:2},{date:'2026-12-04',count:1}]);
 });
 it('creates generic all-day reminders without operational details',()=>{
  const output=buildFacilitiesReminderCalendar([row('private-asset',date)],30,1,exportId,now);
  expect(output).toContain('DTSTART;VALUE=DATE:20261127');
  expect(output).toContain('TRIGGER:-P1D');
  expect(output).not.toMatch(/PRIVATE-DEVICE|PRIVATE-LOCATION|private-centre|private-asset/);
  expect(output.endsWith('END:VCALENDAR\r\n')).toBe(true);
  expect(buildFacilitiesReminderCalendar([row('1',date)],30,0,exportId,now)).not.toContain('VALARM');
 });
 it('uses Pakistan calendar boundaries and refuses invalid or duplicate rows',()=>{
  const localTomorrow=new Date('2026-11-27T20:00:00Z');
  expect(()=>buildFacilitiesReminderCalendar([row('1',date)],7,0,exportId,localTomorrow)).toThrow('no upcoming');
  expect(()=>facilitiesReminderDates([row('1',date),row('1','2026-11-29')],date,7)).toThrow();
  expect(()=>facilitiesReminderDates([row('1','2026-02-30')],date,7)).toThrow();
 });
});
