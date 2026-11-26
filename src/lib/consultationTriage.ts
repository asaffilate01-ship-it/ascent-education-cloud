import {consultationOptions} from './consultationRequest';

type ConsultationLead={id:string;tenant_id:string|null;source:string|null;notes:string|null;stage:string;student_name:string;counsellor:string|null};
export type ConsultationPreferences={destination:string|null;format:string|null;window:string|null;preferredDate:string|null};
const marker='I would like to request an initial education consultation.';
const header=/^Subject: [^\n]{1,200}\n\n(?:Applicant message: )?/;
function validDate(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
/** The message is applicant-editable. Recognised fields are preferences, not verified appointments. */
export function parseConsultationLead(lead:Pick<ConsultationLead,'source'|'notes'>):ConsultationPreferences|null{
 if(lead.source?.toLowerCase()!=='contact_form'||!lead.notes||lead.notes.length>6000)return null;
 const notes=lead.notes.replace(/\r\n/g,'\n');
 if(!header.test(notes))return null;
 const lines=notes.replace(header,'').split('\n');
 if(lines[0]!==marker)return null;
 function field(prefix:string):string|null{
  const values=lines.filter(line=>line.startsWith(prefix));
  return values.length===1?values[0].slice(prefix.length).trim():null;
 }
 function label(prefix:string,options:readonly {label:string}[]):string|null{
  const value=field(prefix);
  return value&&options.some(option=>option.label===value)?value:null;
 }
 const date=field('Preferred meeting date (Pakistan time): ')?.replace(/\.$/,'')||'';
 return {
  destination:label('Preferred destination: ',consultationOptions.destination),
  format:label('Meeting preference: ',consultationOptions.format),
  window:label('Preferred time window: ',consultationOptions.window),
  preferredDate:validDate(date)?date:null,
 };
}
export function consultationTriage<T extends ConsultationLead>(applications:readonly T[],tenant:string){
 if(!tenant)return [];
 return applications.flatMap(application=>{
  if(application.tenant_id!==tenant||!['lead','contacted','qualified'].includes(application.stage))return [];
  const preferences=parseConsultationLead(application);
  return preferences?[{application,preferences}]:[];
 }).sort((a,b)=>(a.preferences.preferredDate||'9999-12-31').localeCompare(b.preferences.preferredDate||'9999-12-31')||a.application.id.localeCompare(b.application.id));
}
