import {internationalStudyGuides} from './internationalStudy';
export const consultationOptions={
 destination:[{id:'undecided',label:'Please help me choose'},...internationalStudyGuides.map(g=>({id:g.slug,label:g.country})),{id:'other',label:'Another destination'}],
 education:[{id:'unsure',label:'Please advise me'},{id:'secondary',label:'Matric / O Level'},{id:'higher-secondary',label:'Intermediate / A Level'},{id:'diploma',label:'Diploma or professional qualification'},{id:'degree',label:'Bachelor’s degree or higher'}],
 goal:[{id:'undecided',label:'Help me choose a study route'},{id:'foundation',label:'Foundation or preparatory study'},{id:'undergraduate',label:'Undergraduate degree'},{id:'top-up',label:'Degree top-up or credit transfer'},{id:'postgraduate',label:'Postgraduate study'},{id:'language',label:'Language or exam preparation'}],
 format:[{id:'either',label:'Either format'},{id:'online',label:'Online consultation'},{id:'jhelum',label:'In person in Jhelum'}],
 window:[{id:'flexible',label:'Flexible'},{id:'morning',label:'Morning (Pakistan time)'},{id:'afternoon',label:'Afternoon (Pakistan time)'},{id:'evening',label:'Evening (Pakistan time)'}],
} as const;
export type ConsultationChoices={ [K in keyof typeof consultationOptions]:string };
export const defaultConsultation:ConsultationChoices={destination:'undecided',education:'unsure',goal:'undecided',format:'either',window:'flexible'};
export const preparationItems=[
 {id:'qualifications',label:'I know my highest completed qualification',help:'Have your qualification title and approximate grades ready. Do not upload records to a general enquiry.'},
 {id:'course',label:'I have researched a course or subject',help:'Identify the subject, study level and institution if you have one in mind.'},
 {id:'language',label:'I have checked the language requirements',help:'Check the institution’s current requirements and separate immigration evidence rules.'},
 {id:'budget',label:'I have considered study and living costs',help:'Prepare an approximate budget privately; no bank statements are needed for this request.'},
 {id:'timing',label:'I have considered my preferred intake',help:'Check application deadlines and allow time for documents and any required immigration process.'},
] as const;
export type ConsultationState={consultation:ConsultationChoices;prepared:string[];preferredDate?:string};
export function consultationDateBounds(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 const min=[part('year'),part('month'),part('day')].join('-');
 const max=new Date(min+'T00:00:00Z');max.setUTCDate(max.getUTCDate()+90);
 return {min,max:max.toISOString().slice(0,10)};
}
export function normaliseConsultationDate(raw:unknown,now=new Date()):string{
 if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw))return '';
 const date=new Date(raw+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==raw)return '';
 const {min,max}=consultationDateBounds(now);
 return raw>=min&&raw<=max?raw:'';
}
export function consultationAcademicGuidance(raw:unknown){
 const choices=normaliseConsultation(raw);
 const questions:Record<string,string> = {
  undecided:'Discuss the subjects you enjoy, your existing qualifications and the study routes that fit your goals.',
  foundation:'Ask whether a preparatory course is required, how progression is assessed and which qualifications the institution accepts.',
  undergraduate:'Check the institution’s required grades, subjects, qualification equivalency and teaching language.',
  'top-up':'Ask the university to assess the exact qualification, transcript, credits and modules for possible advanced entry. Transfer or final-year admission is not automatic.',
  postgraduate:'Ask the university about its recognised degree requirements, subject prerequisites and any alternative entry route.',
  language:'Confirm which language, test and score your intended institution or official authority requires before choosing preparation.',
 };
 const additional=choices.goal==='postgraduate'&&choices.education!=='degree'?'Your selected education stage needs individual review before a postgraduate route can be recommended.':choices.goal==='top-up'?'Have your course specification and module transcript available for an adviser to review securely later.':'';
 const guide=internationalStudyGuides.find(g=>g.slug===choices.destination);
 return {question:questions[choices.goal],additional,guide:guide?{name:guide.country,url:'/international-study/'+guide.slug}:null};
}
export function normaliseConsultation(raw:unknown):ConsultationChoices{
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 const choices={...defaultConsultation};
 for(const key of Object.keys(choices) as (keyof ConsultationChoices)[]){
  const options:readonly {id:string;label:string}[]=consultationOptions[key];
  if(typeof source[key]==='string'&&options.some(o=>o.id===source[key]))choices[key]=source[key] as string;
 }
 return choices;
}
export function normalisePreparation(raw:unknown):string[]{
 return Array.isArray(raw)?preparationItems.filter(item=>raw.includes(item.id)).map(item=>item.id):[];
}
export function consultationPrefill(params:URLSearchParams,state:unknown,now=new Date()){
 if(params.get('request')!=='consultation')return null;
 const obj=state&&typeof state==='object'&&!Array.isArray(state)?state as Record<string,unknown>:{};
 const choices=normaliseConsultation(obj.consultation);
 const prepared=normalisePreparation(obj.prepared);
 const preferredDate=normaliseConsultationDate(obj.preferredDate,now);
 const label=(key:keyof ConsultationChoices)=>(consultationOptions[key] as readonly {id:string;label:string}[]).find(o=>o.id===choices[key])!.label;
 const lines=['I would like to request an initial education consultation.', 'Preferred destination: '+label('destination'), 'Education stage: '+label('education'), 'Study goal: '+label('goal'), 'Meeting preference: '+label('format'), 'Preferred time window: '+label('window')];
 if(preferredDate)lines.push('Preferred meeting date (Pakistan time): '+preferredDate+'.');
 if(prepared.length)lines.push('Preparation self-checks: '+preparationItems.filter(item=>prepared.includes(item.id)).map(item=>item.label).join('; ')+'.');
 lines.push('Please confirm availability, any consultation fee and next steps. I understand this is a request, not a confirmed appointment or an eligibility decision.');
 return {title:'Initial education consultation request',subject:'Admissions Enquiry',message:lines.join('\n')};
}
export const consultationContactUrl='/tenant/unipathway/contact?request=consultation#contact-form';
