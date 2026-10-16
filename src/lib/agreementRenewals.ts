export type AgreementRecord={commission_basis?:string;commission_amount?:number;commission_currency?:string;id:string;partner_id?:string;status?:string;starts_on?:string;ends_on?:string;document_reference?:string};
export const agreementStates=['expired','expiring','incomplete','scheduled','current','inactive'] as const;
export type AgreementState=typeof agreementStates[number];
export const agreementLabels:Record<AgreementState,string>={expired:'Expired',expiring:'Expires within 30 days',incomplete:'Evidence or dates missing',scheduled:'Starts in future',current:'Current dates and reference',inactive:'Not signed / terminated'};
const day=86400000;
function dateDay(value?:string){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;const n=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:NaN;}
export function agreementState(a:AgreementRecord,now:number):AgreementState{
 if(a.status!=='signed')return 'inactive';
 const start=dateDay(a.starts_on),end=a.ends_on?dateDay(a.ends_on):Infinity,today=Math.floor(now/day)*day;
 if(!a.document_reference?.trim()||!Number.isFinite(start)||Number.isNaN(end)||end<start)return 'incomplete';
 if(end<today)return 'expired';if(start>today)return 'scheduled';if(end<=today+30*day)return 'expiring';return 'current';
}
export function agreementUsable(a:AgreementRecord,now:number){return ['current','expiring'].includes(agreementState(a,now));}
export function compareAgreements(a:AgreementRecord,b:AgreementRecord,now:number){return agreementStates.indexOf(agreementState(a,now))-agreementStates.indexOf(agreementState(b,now))||(a.ends_on||'9999').localeCompare(b.ends_on||'9999')||a.id.localeCompare(b.id);}
