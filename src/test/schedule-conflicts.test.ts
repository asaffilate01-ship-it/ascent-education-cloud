import {expect,it} from 'vitest';
import {scheduleConflicts,type ScheduleSlot} from '@/lib/scheduleConflicts';
const a:ScheduleSlot={id:'a',tenant_id:'centre',lecturer_id:'teacher',module_id:'module',day_of_week:1,start_time:'09:00:00',end_time:'10:30:00',academic_year:'2026',semester:1,effective_from:'2026-09-01',effective_until:null,room:null,is_active:true};
it('detects partial overlaps rather than just equal start times',()=>expect(scheduleConflicts([a,{...a,id:'b',start_time:'10:00:00',end_time:'11:00:00'}])).toHaveLength(1));
it('allows adjacent classes and distinct teaching periods',()=>{for(const changes of [{start_time:'10:30:00',end_time:'12:00:00'},{academic_year:'2027'},{semester:2},{day_of_week:2},{tenant_id:'other'},{is_active:false}])expect(scheduleConflicts([a,{...a,id:'b',...changes}])).toEqual([]);});
it('ignores disjoint effective dates and empty rooms',()=>{expect(scheduleConflicts([{...a,effective_until:'2026-09-30'},{...a,id:'b',effective_from:'2026-10-01'}])).toEqual([]);expect(scheduleConflicts([a,{...a,id:'b',lecturer_id:'other',module_id:'other'}])).toEqual([]);});
it('compares room names consistently',()=>expect(scheduleConflicts([{...a,room:'Lab A'},{...a,id:'b',lecturer_id:'other',module_id:'other',room:' lab a '}])[0].reasons).toEqual(['Same room']));
