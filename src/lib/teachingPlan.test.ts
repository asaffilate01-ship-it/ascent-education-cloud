import {describe,expect,it} from 'vitest';
import {pakistanTeachingDate,savedTeachingPlanForPakistanDate} from './teachingPlan';

const slot=(id:string,overrides:Record<string,unknown>={})=>({
 id,module_id:'module-a',is_active:true,day_of_week:3,
 start_time:'09:00',end_time:'10:00',effective_from:'2026-11-01',effective_until:null as string|null,
 ...overrides,
});
describe('Pakistan-date teaching plan candidates',()=>{
 const day=new Date('2026-11-10T20:15:00Z'); // Wednesday 01:15 in Pakistan, Tuesday in London
 it('uses Pakistan date even when the device is on an earlier UTC day',()=>{
  expect(pakistanTeachingDate(day)).toBe('2026-11-11');
  expect(savedTeachingPlanForPakistanDate([slot('wed'),slot('tue',{day_of_week:2})],day).map(x=>x.id)).toEqual(['wed']);
 });
 it('excludes future, expired, inactive and malformed weekly-plan slots',()=>{
  const rows=[
   slot('valid'),slot('future',{effective_from:'2026-11-12'}),slot('old',{effective_until:'2026-11-10'}),
   slot('inactive',{is_active:false}),slot('invalid-date',{effective_from:'today'}),
   slot('zero-hours',{end_time:'09:00'}),
  ];
  expect(savedTeachingPlanForPakistanDate(rows,day).map(x=>x.id)).toEqual(['valid']);
 });
 it('sorts valid planned slots in time order for the daily workspace',()=>{
  expect(savedTeachingPlanForPakistanDate([slot('later',{start_time:'14:00',end_time:'15:00'}),slot('early',{start_time:'08:00',end_time:'09:00'})],day).map(x=>x.id)).toEqual(['early','later']);
 });
});
