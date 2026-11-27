import {validateSecureContact} from './unipathway-secure-contact.ts';
export const MAIL_FROM='UniPathway <notifications@unipathway.pk>';
export const MESSAGE_TEAMS={admissions:'admissions@unipathway.pk',recruitment:'jobs@unipathway.pk'} as const;
export type MessageChannel=keyof typeof MESSAGE_TEAMS;
const roles=['Tutor','Lecturer','Both / flexible'] as const;
const modes=['Online','Hybrid','In-class (Jhelum)','Flexible'] as const;
export type MessagePayload={name:string;email:string;phone:string;subject:string;message:string;role?:string;mode?:string;subjects?:string;qualifications?:string;availability?:string};
export type PublicMessage={requestId:string;channel:MessageChannel;captchaToken:string;payload:MessagePayload};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const singleMailbox=(email:string)=>/^[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(email)&&!email.split('@')[0].includes('..')&&!email.split('@')[0].endsWith('.');
function field(value:unknown,max:number,min=1):string|null{
 if(typeof value!=='string'||value.length>max)return null;
 const result=value.trim();
 return result.length>=min?result:null;
}
export function parsePublicMessage(input:unknown):PublicMessage|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const v=input as Record<string,unknown>;
 if(v.tenant_slug!=='unipathway'||v.privacy_acknowledged!==true||typeof v.request_id!=='string'||!uuid.test(v.request_id)||(typeof v.channel!=='string'||!['admissions','recruitment'].includes(v.channel)))return null;
 const channel=v.channel as MessageChannel;
 const allowed=new Set(['tenant_slug','privacy_acknowledged','request_id','channel','captcha_token','name','email','phone','subject','message',...(channel==='recruitment'?['role','mode','subjects','qualifications','availability']:[])]);
 if(Object.keys(v).some(key=>!allowed.has(key)))return null;
 if(channel==='admissions'){
  const parsed=validateSecureContact(input);
  if(!parsed||!singleMailbox(parsed.email))return null;
  const {captchaToken,...payload}=parsed;
  return {requestId:v.request_id.toLowerCase(),channel,captchaToken,payload};
 }
 const parsed=validateSecureContact({...v,subject:'General Enquiry'});
 if(!parsed||!singleMailbox(parsed.email)||!roles.includes(v.role as typeof roles[number])||!modes.includes(v.mode as typeof modes[number]))return null;
 const subjects=field(v.subjects,200,2),qualifications=field(v.qualifications,300,2),availability=field(v.availability,240,2);
 if(!subjects||!qualifications||!availability)return null;
 const {name,email,phone,message,captchaToken}=parsed;
 return {requestId:v.request_id.toLowerCase(),channel,captchaToken,payload:{name,email,phone,subject:'Teaching expression of interest',message,role:String(v.role),mode:String(v.mode),subjects,qualifications,availability}};
}
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function shell(title:string,body:string){
 return '<!doctype html><html lang="en"><body style="margin:0;background:#f2f5f3;font-family:Arial,sans-serif;color:#183554"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:560px;background:white;border:1px solid #d8e2dc;border-radius:16px"><tr><td style="padding:24px;background:#0b2d5b;color:white"><strong style="font-size:24px">UniPathway</strong><p style="margin:6px 0 0;font-size:13px">Education · Pakistan</p></td></tr><tr><td style="padding:24px"><h1 style="font-size:22px">'+escapeHtml(title)+'</h1>'+body+'<p style="font-size:12px;color:#526676">UniPathway Education · <a href="https://unipathway.pk">unipathway.pk</a></p></td></tr></table></td></tr></table></body></html>';
}
export function publicMessageEmails(message:PublicMessage){
 const {channel,payload,requestId}=message;
 const team=MESSAGE_TEAMS[channel],recruitment=channel==='recruitment';
 const label=recruitment?'Teaching expression of interest':'Admissions enquiry';
 const lines=[['Reference',requestId],['Name',payload.name],['Email',payload.email],['Phone',payload.phone||'Not supplied'],['Subject',payload.subject],...(recruitment?[['Role',payload.role||''],['Teaching mode',payload.mode||''],['Subjects',payload.subjects||''],['Qualifications',payload.qualifications||''],['Availability',payload.availability||'']]:[]),['Message',payload.message]];
 const body=lines.map(([key,value])=>'<p style="white-space:pre-wrap;overflow-wrap:anywhere"><strong>'+escapeHtml(key)+':</strong> '+escapeHtml(value)+'</p>').join('');
 const receiptText=recruitment?'We have recorded your teaching expression of interest for recruitment review. This is not a job offer or employment confirmation.':'We have recorded your enquiry for admissions review. This is not a confirmed admission or appointment.';
 return {
  team:{from:MAIL_FROM,to:[team],reply_to:payload.email,subject:'New UniPathway '+label.toLowerCase(),text:lines.map(([k,v])=>k+': '+v).join('\n'),html:shell(label,body)},
  receipt:{from:MAIL_FROM,to:[payload.email],reply_to:team,subject:'UniPathway — '+label+' received',text:receiptText+'\nReference: '+requestId+'\nContact: '+team+'\nIf you did not submit this request, ignore this message.',html:shell(label+' received','<p style="line-height:1.6">'+receiptText+'</p><p>Reference: <strong>'+escapeHtml(requestId)+'</strong></p><p>Our team will review your details. For assistance contact <a href="mailto:'+team+'">'+team+'</a>.</p><p style="font-size:13px">If you did not submit this request, ignore this message. Never reply with passwords or identity documents.</p>')},
 };
}
