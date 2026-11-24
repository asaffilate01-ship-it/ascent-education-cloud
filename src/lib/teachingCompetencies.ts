export type TeachingDeclaration={subject:string;framework:string;level:string;experience:string};
export type TeachingSlot={slot:number;declaration:TeachingDeclaration};
const text=(value:unknown)=>typeof value==='string'?value:'';
export function teachingSlots(answers:unknown):TeachingSlot[]{
 const fields=answers&&typeof answers==='object'&&!Array.isArray(answers)?answers as Record<string,unknown>:{};
 return Array.from({length:20},(_,i)=>{const slot=i+1,p='Competency '+slot+' — ';return {slot,declaration:{subject:text(fields[p+'Subject']),framework:text(fields[p+'Curriculum / awarding body']),level:text(fields[p+'Maximum level / grade']),experience:text(fields[p+'Relevant qualification or experience'])}};}).filter(({declaration:d})=>!!(d.subject.trim()&&d.framework.trim()&&d.level.trim()));
}
export function teachingDecision(current:TeachingDeclaration,review:unknown):'not_reviewed'|'changed'|'approved'|'rejected'|'revoked'|'unavailable'{
 if(review===null)return 'not_reviewed';
 if(!review||typeof review!=='object')return 'unavailable';
 const r=review as {declaration?:unknown;decision?:unknown};
 if(!r.declaration||typeof r.declaration!=='object'||Array.isArray(r.declaration))return 'unavailable';
 const d=r.declaration as Record<string,unknown>;
 if(Object.keys(current).some(k=>d[k]!==current[k as keyof TeachingDeclaration]))return 'changed';
 return r.decision==='approved'||r.decision==='rejected'||r.decision==='revoked'?r.decision:'unavailable';
}
