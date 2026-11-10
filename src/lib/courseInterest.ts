/** Public course-interest routing. This is an enquiry, not confirmed admission. */
export const STUDY_AREAS = [
  {id:'tuition',label:'School tuition (Years 8–12)',detail:'Matric, Intermediate and Cambridge preparation'},
  {id:'qualifications',label:'UK qualification pathways (Levels 2–5)',detail:'Check the specific qualification, approval and entry requirements'},
  {id:'vocational',label:'Vocational, SIA and CPD enquiries',detail:'Practical and short-course options, subject to location and approval'},
  {id:'technology',label:'Technology and digital skills',detail:'Programming, AI, cybersecurity and cloud'},
  {id:'accounting',label:'Accounting and finance',detail:'Bookkeeping, finance and professional exam preparation'},
  {id:'languages',label:'IELTS, German and other languages',detail:'Language learning and exam preparation'},
  {id:'creative',label:'Beauty, art, crafts and sewing',detail:'Creative and vocational skills'},
] as const;

export const STUDY_MODES = [
  {id:'undecided',label:'Please advise me'},
  {id:'online',label:'Online across Pakistan'},
  {id:'centre',label:'In person in Jhelum, if available'},
  {id:'blended',label:'Blended online and centre-based study'},
] as const;

export const STUDY_LEVELS = [
  {id:'unsure',label:'Please advise me'},
  {id:'level-2',label:'Level 2'},
  {id:'level-3',label:'Level 3'},
  {id:'level-4',label:'Level 4'},
  {id:'level-5',label:'Level 5'},
  {id:'short',label:'Short or vocational course'},
  {id:'school',label:'School year or board preparation'},
] as const;

export type CourseInterest = {area:string;mode?:string;level?:string};
const find = <T extends {id:string}>(items:readonly T[],id:string|undefined|null):T|undefined =>
  items.find(item=>item.id===id);

/** Only permit predefined course choices in URLs. Never put names or documents in query parameters. */
export function courseInterestEnquiryUrl(interest:CourseInterest):string {
  const area=find(STUDY_AREAS,interest.area);
  if(!area)return '/contact?subject=Course+Enquiry';
  const params=new URLSearchParams({subject:'Course Enquiry',area:area.id});
  const mode=find(STUDY_MODES,interest.mode);
  const level=find(STUDY_LEVELS,interest.level);
  if(mode&&mode.id!=='undecided')params.set('mode',mode.id);
  if(level&&level.id!=='unsure')params.set('level',level.id);
  return `/contact?${params.toString()}#contact-form`;
}

/** Existing catalogue course links may supply a title; preserve them without claiming enrolment. */
export function courseEnquiryPrefill(params:URLSearchParams):{message:string;summary:string;subject:string} {
  const course=(params.get('course')||'').replace(/\s+/g,' ').trim().slice(0,240);
  const area=find(STUDY_AREAS,params.get('area'));
  const mode=find(STUDY_MODES,params.get('mode'));
  const level=find(STUDY_LEVELS,params.get('level'));
  const subject=params.get('subject')==='Course Enquiry'||course||area?'Course Enquiry':'';
  if(!course&&!area)return {message:'',summary:'',subject};
  const summary=course||area!.label;
  const lines=[`I would like to enquire about ${summary}.`];
  if(level&&level.id!=='unsure')lines.push(`My requested study level is ${level.label}.`);
  if(mode&&mode.id!=='undecided')lines.push(`My preferred study format is ${mode.label}.`);
  lines.push('Please confirm entry requirements, programme and centre approval where applicable, delivery, duration, fees and the next available intake.');
  return {message:lines.join('\n'),summary,subject};
}
