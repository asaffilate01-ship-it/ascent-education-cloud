/** Structured, limited UniPathway public contact data. Never trust client-side validation. */
export type SecureContact={
 name:string;email:string;phone:string;subject:string;message:string;captchaToken:string;
};
const SUBJECTS=new Set([
 'General Enquiry','Course Enquiry','Admissions Enquiry','Fee Information',
 'Programme Details','University Progression','Agent Partnership',
 'Technical Support','Other'
]);
const read=(v:unknown,max:number):string|null=>typeof v==='string'&&v.length<=max?v.trim():null;
export function validateSecureContact(input:unknown):SecureContact|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const v=input as Record<string,unknown>;
 if(v.tenant_slug!=='unipathway'||v.privacy_acknowledged!==true)return null;
 const name=read(v.name,200),email=read(v.email,254),phone=read(v.phone??'',35);
 const subject=read(v.subject??'General Enquiry',200),message=read(v.message,5000),captchaToken=read(v.captcha_token,2500);
 if(name===null||name.length<2||email===null||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    phone===null||(phone.length>0&&phone.length<7)||subject===null||!SUBJECTS.has(subject)||
    message===null||message.length<10||captchaToken===null||captchaToken.length<20)return null;
 return {name,email:email.toLowerCase(),phone,subject,message,captchaToken};
}
