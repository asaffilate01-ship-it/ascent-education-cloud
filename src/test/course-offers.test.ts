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

it('rejects future, unzoned or invalid verification metadata before displaying confirmed fees',()=>{
 for(const invalid of [
  {...offer,verified_at:'2026-10-24T13:00:00Z'},
  {...offer,verified_at:'2026-10-24T11:00:00'},
  {...offer,valid_until:'2026-10-25T12:00:00'},
  {...offer,valid_until:'not-a-timestamp'},
  {...offer,intake_date:'2026-11-31'},
  {...offer,intake_date:'not a date'},
  {...offer,revision:0},
  {...offer,fees:'  '},
  {...offer,entry_requirements:''},
  {...offer,availability:'unknown' as CourseOffer['availability']},
 ])expect(currentCourseOffer(invalid,now)).toBe(false);
 expect(currentCourseOffer(offer,Number.NaN)).toBe(false);
});
it('uses the Pakistan calendar day, not the browser UTC day, for dated intakes',()=>{
 const localMidnight=Date.parse('2026-10-24T19:30:00Z'); // 25 Oct 00:30 PKT
 const valid={...offer,verified_at:'2026-10-24T18:00:00Z',valid_until:'2026-10-26T12:00:00Z'};
 expect(currentCourseOffer({...valid,intake_date:'2026-10-24'},localMidnight)).toBe(false);
 expect(currentCourseOffer({...valid,intake_date:'2026-10-25'},localMidnight)).toBe(true);
});
it('keeps correctly verified closed courses labelled closed instead of assuming applications are open',()=>{
 expect(currentCourseOffer({...offer,availability:'closed'},now)).toBe(true);
 expect(currentCourseOffer({...offer,availability:'open'},now)).toBe(true);
 expect(currentCourseOffer({...offer,valid_until:offer.verified_at},now)).toBe(false);
});
