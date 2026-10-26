export type CriterionMark = {code:string;points:number;reason:string;evidence:string;missing:string};
export function criterionComplete(mark:CriterionMark|undefined,max:number){
 return !!mark && Number.isFinite(mark.points) && mark.points>=0 && mark.points<=max && mark.reason.trim().length>=20 && mark.evidence.trim().length>=3 && mark.missing.trim().length>=3;
}
export function evidenceCitation(text:string,start:number,end:number){
 const lines=text.split('\n');
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>lines.length) return null;
 const quote=lines.slice(start-1,end).join('\n').trim();
 if(quote.length<3)return null;
 const citation=`Submitted text, lines ${start}–${end}: “${quote}”`;
 return citation.length<=900?citation:null;
}
export const feedbackPrompts=[
 {id:'strength',label:'Explain a strength',text:'Strength: In [criterion], your [specific example] demonstrates [skill or understanding].'},
 {id:'evidence',label:'Request stronger evidence',text:'Evidence to develop: For [criterion], add [specific evidence] and explain how it supports [learning outcome].'},
 {id:'reasoning',label:'Develop reasoning',text:'Next step: Explain why you chose [approach], compare it with [alternative], and support your conclusion with [evidence].'},
 {id:'practice',label:'Suggest follow-up practice',text:'Before your next assessment, practise [specific task]. Check your work against [criterion] by [observable check].'},
] as const;
export function appendFeedback(current:string,prompt:string){
 const next=[current.trimEnd(),prompt].filter(Boolean).join('\n\n');
 return next.length<=6000?next:null;
}
