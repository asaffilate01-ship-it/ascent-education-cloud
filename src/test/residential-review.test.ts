import { expect,it } from 'vitest';
import { initialCalendarDraft,datedTeaching,scheduleResidentialCalendar } from '@/lib/residentialCalendar';
import { emptyVisitOperations,visitIdentity,parseResidentialWorkspace,operationsIssues } from '@/lib/residentialWorkspace';
import { teachingKey } from '@/lib/residentialSupport';
import { reviewResidentialWorkspace } from '@/lib/residentialReview';
it('shows untouched visits as incomplete and treats support as optional',()=>{
 const calendar={...initialCalendarDraft,students:1};const visit=scheduleResidentialCalendar(calendar).visits[0];const op=emptyVisitOperations(visit);
 op.support.allocations=datedTeaching(visit).map(s=>({session:teachingKey(s),tutor:'T1'}));
 op.accommodation.rooms=[{id:'R1',site:'Site',section:'male',use:'student',beds:1,accessible:false}];
 op.accommodation.allocations=[{kind:'student',person:'1',room:'R1',section:'male',needsAccessible:false}];
 const review=reviewResidentialWorkspace(calendar,{[visitIdentity(visit)]:op});
 expect(review.visits[0]).toMatchObject({missingTutors:0,unallocatedStudents:0,supportStudents:0,status:'Entered allocations complete'});
 expect(review.visits[1]).toMatchObject({unallocatedStudents:1,status:'Allocations incomplete'});
});
it('reports room conflicts in shared validation and rejects support envelope overrides',()=>{
 const visit=scheduleResidentialCalendar(initialCalendarDraft).visits[0],op=emptyVisitOperations(visit);
 op.accommodation.allocations=[{kind:'student',person:'1',room:'missing',section:'male',needsAccessible:false}];
 expect(operationsIssues({[visitIdentity(visit)]:op}).join()).toContain('does not exist');
 const valid=emptyVisitOperations(visit);
 expect(()=>parseResidentialWorkspace(JSON.stringify({version:1,calendar:initialCalendarDraft,operations:[{...valid,support:{...valid.support,version:1,visit}}]}))).toThrow();
});
