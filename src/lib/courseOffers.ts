export type CourseOffer={course_key:string;availability:'open'|'upcoming'|'closed';fees:string;entry_requirements:string;intake_date:string;valid_until:string;published:boolean;revision:number;verified_at:string};
export const courseOfferKey=(body:string,name:string)=>`${body}:${name}`;
export function currentCourseOffer(offer:CourseOffer,now=Date.now()){
 return offer.published&&Date.parse(offer.valid_until)>now&&offer.intake_date>=new Date(now).toISOString().slice(0,10);
}
