import { expect,it } from 'vitest';
import { initialCalendarDraft,scheduleResidentialCalendar } from '@/lib/residentialCalendar';
import { emptyVisitOperations,visitIdentity,parseResidentialWorkspace,serializeResidentialWorkspace } from '@/lib/residentialWorkspace';
const calendar={...initialCalendarDraft,closuresReviewed:true};
const visit=scheduleResidentialCalendar(calendar).visits[0];
it('round-trips linked support and room plans and requires fresh closure review',()=>{
 const op=emptyVisitOperations(visit);op.accommodation.rooms.push({id:'R1',site:'Site',section:'male',use:'student',beds:4,accessible:false});op.support.appointments.push({id:'a',student:51,tutor:'T1',date:visit.start,start:720,minutes:30});
 const saved=serializeResidentialWorkspace(calendar,{[visitIdentity(visit)]:op});const restored=parseResidentialWorkspace(saved);
 expect(restored.operations[visitIdentity(visit)]).toEqual(op);expect(restored.calendar.closuresReviewed).toBe(false);
});
it('rejects stale visits, duplicate visit records and conflicting appointments atomically',()=>{
 const op=emptyVisitOperations(visit);
 expect(()=>serializeResidentialWorkspace({...calendar,students:1},{[visitIdentity(visit)]:op})).toThrow('no longer matches');
 expect(()=>parseResidentialWorkspace(JSON.stringify({version:1,calendar,operations:[op,op]}))).toThrow('Duplicate');
 op.support.appointments.push({id:'a',student:1,tutor:'T1',date:visit.start,start:720,minutes:30});
 expect(()=>serializeResidentialWorkspace(calendar,{[visitIdentity(visit)]:op})).toThrow('trip');
});
