import {describe,it,expect} from 'vitest';
import {readTeachingClaims,readTeachingSlots,readClaimReceipt,teachingClaimTotals,approvedLecturerTotals,filterTeachingClaims} from '@/lib/teachingTimesheets';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const tenant=id(1),uid=id(2),date='2026-11-23',month='2026-11',time='2026-11-23T12:00:00Z';
const slot={schedule_id:id(3),module_id:id(4),module_title:'Maths',start_time:'09:00:00',end_time:'09:45:00',updated_at:time,planned_minutes:45};
const row={id:id(5),tenant_id:tenant,lecturer_id:uid,lecturer_name:'Lecturer',schedule_id:slot.schedule_id,module_id:slot.module_id,module_title:'Maths',teaching_date:date,scheduled_start:'09:00:00',scheduled_end:'09:45:00',planned_minutes:45,actual_minutes:40,status:'approved',revision:2,submitted_at:time,reviewed_at:time,evidence_reference:'Evidence 123',review_note:'Reviewed evidence'};
describe('verified teaching timesheet data',()=>{
 it('checks slot identity, date, time ranges and duplicate records',()=>{const raw={tenant_id:tenant,role:'lecturer',date,slots:[slot]};expect(readTeachingSlots(raw,tenant,date)).toEqual([slot]);for(const invalid of [{...raw,date:'2026-11-24'},{...raw,slots:[slot,slot]},{...raw,slots:[{...slot,planned_minutes:90}]}])expect(()=>readTeachingSlots(invalid,tenant,date)).toThrow();});
 it('rejects foreign, unapproved or private records returned to finance',()=>{const approved={...row,evidence_reference:null,review_note:null};const raw={tenant_id:tenant,role:'finance_officer',month:month+'-01',rows:[approved]};expect(readTeachingClaims(raw,tenant,'finance_officer',month,uid)).toEqual([approved]);for(const invalid of [{...approved,tenant_id:id(9)},{...approved,actual_minutes:46},{...approved,status:'submitted',revision:1,reviewed_at:null},{...approved,evidence_reference:'Private note'},{...approved,review_note:'Private review'}])expect(()=>readTeachingClaims({...raw,rows:[invalid]},tenant,'finance_officer',month,uid)).toThrow();});
 it('limits the lecturer to own records and counts approved and pending time separately',()=>{const submitted={...row,id:id(6),status:'submitted',revision:1,reviewed_at:null,review_note:null};const raw={tenant_id:tenant,role:'lecturer',month:month+'-01',rows:[row,submitted]};const rows=readTeachingClaims(raw,tenant,'lecturer',month,uid);expect(teachingClaimTotals(rows)).toMatchObject({approved:{sessions:1,minutes:40},submitted:{sessions:1,minutes:40},rejected:{sessions:0,minutes:0}});expect(approvedLecturerTotals(rows)).toEqual([{id:uid,name:'Lecturer',minutes:40,sessions:1}]);expect(()=>readTeachingClaims({...raw,rows:[{...row,lecturer_id:id(9)}]},tenant,'lecturer',month,uid)).toThrow();});
 it('does not acknowledge a mismatched write response',()=>{const receipt={id:row.id,tenant_id:tenant,lecturer_id:uid,schedule_id:slot.schedule_id,teaching_date:date,actual_minutes:40,status:'approved',revision:2};expect(readClaimReceipt(receipt,{tenant,lecturer:uid,schedule:slot.schedule_id,date,minutes:40,id:row.id,decision:'approved'})).toEqual(receipt);expect(()=>readClaimReceipt({...receipt,actual_minutes:41},{tenant,lecturer:uid,schedule:slot.schedule_id,date,minutes:40})).toThrow();expect(()=>readClaimReceipt({...receipt,status:'rejected'},{tenant,lecturer:uid,schedule:slot.schedule_id,date,minutes:40,decision:'approved'})).toThrow();});
});

describe('teaching claim review filters',()=>{
 it('matches words across authorised records and keeps status selection independent of monthly totals',()=>{
  const second={...row,id:id(6),lecturer_name:'Another tutor',module_title:'English language',status:'submitted',revision:1,reviewed_at:null,review_note:null};
  const rows=readTeachingClaims({tenant_id:tenant,role:'centre_director',month:month+'-01',rows:[row,second]},tenant,'centre_director',month,uid);
  expect(filterTeachingClaims(rows,'all','maths lecturer')).toEqual([row]);
  expect(filterTeachingClaims(rows,'approved','maths lecturer')).toEqual([row]);
  expect(filterTeachingClaims(rows,'submitted','maths lecturer')).toEqual([]);
  expect(filterTeachingClaims(rows,'all','language another')).toEqual([second]);
  expect(filterTeachingClaims(rows,'all','Evidence 123')).toEqual([]);
  expect(teachingClaimTotals(rows)).toMatchObject({approved:{sessions:1,minutes:40},submitted:{sessions:1,minutes:40}});
 });
});
