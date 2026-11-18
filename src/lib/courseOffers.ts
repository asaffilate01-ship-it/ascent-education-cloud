import {parseAcademicInstant,parseZonedAcademicTimestamp} from './academicTime';

/** Published detail is informative, not evidence of centre accreditation or an offer of admission. */
export type CourseOffer={
 course_key:string;
 availability:'open'|'upcoming'|'closed';
 fees:string;entry_requirements:string;intake_date:string;
 valid_until:string;published:boolean;revision:number;verified_at:string;
};
export const courseOfferKey=(body:string,name:string)=>`${body}:${name}`;

const pakistanDateFormatter=new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',
});
function pakistanCalendarDay(now:number):string{
 const values=pakistanDateFormatter.formatToParts(new Date(now));
 const part=(type:string)=>values.find(value=>value.type===type)?.value||'';
 return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * Fail closed on malformed or inconsistent returned approval metadata, not
 * only the database's published filter. Even current details are advisory:
 * admissions must independently verify the exact centre, version and intake.
 *
 * 'closed' remains a valid, accurately labelled published record; this
 * function never means that applications are open or enrolment is authorised.
 */
export function currentCourseOffer(offer:CourseOffer,now=Date.now()):boolean{
 if(!offer||!Number.isFinite(now)||offer.published!==true||
    !['open','upcoming','closed'].includes(offer.availability)||
    typeof offer.course_key!=='string'||!offer.course_key.trim()||
    !Number.isSafeInteger(offer.revision)||offer.revision<1||
    typeof offer.fees!=='string'||!offer.fees.trim()||
    typeof offer.entry_requirements!=='string'||!offer.entry_requirements.trim()||
    typeof offer.intake_date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(offer.intake_date)||
    parseAcademicInstant(offer.intake_date)===null)return false;
 const verified=parseZonedAcademicTimestamp(offer.verified_at);
 const expiry=parseZonedAcademicTimestamp(offer.valid_until);
 return verified!==null&&expiry!==null&&verified<=now&&expiry>now&&expiry>verified&&
   offer.intake_date>=pakistanCalendarDay(now);
}
