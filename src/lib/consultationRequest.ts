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
export type ConsultationState={consultation:ConsultationChoices;prepared:string[]};
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
export function consultationPrefill(params:URLSearchParams,state:unknown){
 if(params.get('request')!=='consultation')return null;
 const obj=state&&typeof state==='object'&&!Array.isArray(state)?state as Record<string,unknown>:{};
 const choices=normaliseConsultation(obj.consultation);
 const prepared=normalisePreparation(obj.prepared);
 const label=(key:keyof ConsultationChoices)=>(consultationOptions[key] as readonly {id:string;label:string}[]).find(o=>o.id===choices[key])!.label;
 const lines=['I would like to request an initial education consultation.', 'Preferred destination: '+label('destination'), 'Education stage: '+label('education'), 'Study goal: '+label('goal'), 'Meeting preference: '+label('format'), 'Preferred time window: '+label('window')];
 if(prepared.length)lines.push('Preparation self-checks: '+preparationItems.filter(item=>prepared.includes(item.id)).map(item=>item.label).join('; ')+'.');
 lines.push('Please confirm availability, any consultation fee and next steps. I understand this is a request, not a confirmed appointment or an eligibility decision.');
 return {title:'Initial education consultation request',subject:'Admissions Enquiry',message:lines.join('\n')};
}
export const consultationContactUrl='/tenant/unipathway/contact?request=consultation#contact-form';
