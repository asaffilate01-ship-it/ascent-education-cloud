export type CardKind='student'|'lecturer';
export type CardStatus='active'|'revoked'|'expired'|'eligibility_review';
export type CentreCard={id:string;reference:string;tenant_id:string;subject_id:string;kind:CardKind;display_name:string;centre_name:string;issued_on:string;expires_on:string;status:CardStatus};
export type CardPerson={id:string;name:string};
export type CardRegistry={people:CardPerson[];cards:CentreCard[]};
export const cardReference=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const label=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=300;
export function cardDate(x:unknown):x is string{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||x<'2000-01-01'||x>'2099-12-31')return false;
 const d=Date.parse(x+'T00:00:00Z');return Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===x;
}
export function cardExpiryLimit(today:string){
 if(!cardDate(today))throw Error('Invalid centre date');const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+366);return d.toISOString().slice(0,10);
}
export function readCentreCard(x:unknown,tenant:string,kind:CardKind,expected?:{id?:string;subject?:string;expiry?:string;status?:CardStatus}):CentreCard{
 if(!obj(x)||!cardReference(x.id)||!cardReference(x.reference)||x.tenant_id!==tenant||!cardReference(x.subject_id)||x.kind!==kind||!label(x.display_name)||!label(x.centre_name)||!cardDate(x.issued_on)||!cardDate(x.expires_on)||x.expires_on<x.issued_on||x.expires_on>cardExpiryLimit(x.issued_on)||(x.status!=='active'&&x.status!=='revoked'&&x.status!=='expired'&&x.status!=='eligibility_review'))throw Error('Invalid card receipt');
 if(expected?.id&&x.id!==expected.id||expected?.subject&&x.subject_id!==expected.subject||expected?.expiry&&x.expires_on!==expected.expiry||expected?.status&&x.status!==expected.status)throw Error('Card receipt mismatch');
 return {id:x.id,reference:x.reference,tenant_id:tenant,subject_id:x.subject_id,kind,display_name:x.display_name,centre_name:x.centre_name,issued_on:x.issued_on,expires_on:x.expires_on,status:x.status};
}
export function readOwnCard(x:unknown,tenant:string,kind:CardKind,uid:string):CentreCard|null{
 if(!obj(x)||x.tenant_id!==tenant||x.kind!==kind||x.subject_id!==uid)throw Error('Invalid holder response');
 return x.card===null?null:readCentreCard(x.card,tenant,kind,{subject:uid});
}
export function readCardRegistry(x:unknown,tenant:string,kind:CardKind):CardRegistry{
 if(!obj(x)||x.tenant_id!==tenant||x.kind!==kind||!Array.isArray(x.people)||x.people.length>500||!Array.isArray(x.cards)||x.cards.length>500)throw Error('Invalid register');
 const people:CardPerson[]=[],cards:CentreCard[]=[],ids=new Set<string>(),holders=new Set<string>(),refs=new Set<string>();
 for(const p of x.people){if(!obj(p)||!cardReference(p.id)||!label(p.name)||ids.has(p.id))throw Error('Invalid card roster');ids.add(p.id);people.push({id:p.id,name:p.name});}
 for(const raw of x.cards){const c=readCentreCard(raw,tenant,kind);if(holders.has(c.subject_id)||refs.has(c.reference))throw Error('Duplicate card');holders.add(c.subject_id);refs.add(c.reference);cards.push(c);}
 return {people,cards};
}
export const qrCardPayload=(reference:string)=>'UPCARD:'+reference.toLowerCase();
export function parseCardPayload(raw:string):string|null{
 const s=raw.trim().replace(/^UPCARD:/i,'');return cardReference(s)?s.toLowerCase():null;
}
export function readCardLookup(x:unknown,tenant:string,module:string,reference:string,roster:readonly string[]):{student_id:string;name:string}|null{
 if(!obj(x)||x.tenant_id!==tenant||x.module_id!==module||x.reference!==reference)throw Error('Invalid card lookup');
 if(x.match===null)return null;
 if(!obj(x.match)||!cardReference(x.match.student_id)||!label(x.match.name)||!roster.includes(x.match.student_id))throw Error('Card is not in this loaded register');
 return {student_id:x.match.student_id,name:x.match.name};
}
