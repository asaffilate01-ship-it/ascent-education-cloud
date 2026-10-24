import {it,expect} from 'vitest';
import {currentCourseOffer,type CourseOffer} from '@/lib/courseOffers';
const now=Date.parse('2026-10-24T12:00:00Z');
const offer:CourseOffer={course_key:'OTHM:Example',availability:'upcoming',fees:'Confirmed fee',entry_requirements:'Confirmed entry requirements',intake_date:'2026-11-01',valid_until:'2026-10-25T12:00:00Z',published:true,revision:1,verified_at:'2026-10-24T11:00:00Z'};
it('requires published current evidence and a non-past intake',()=>{
 expect(currentCourseOffer(offer,now)).toBe(true);
 expect(currentCourseOffer({...offer,published:false},now)).toBe(false);
 expect(currentCourseOffer({...offer,valid_until:'2026-10-24T12:00:00Z'},now)).toBe(false);
 expect(currentCourseOffer({...offer,intake_date:'2026-10-23'},now)).toBe(false);
});
