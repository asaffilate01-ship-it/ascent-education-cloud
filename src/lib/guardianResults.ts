export type Result={attempt_id:string;title:string;final_score:number;feedback:string;released_at:string;amended:boolean};
export type Student={id:string;verified:boolean;sharing:boolean;student_name:string|null;results:Result[]};
export function validResults(value:unknown):value is Student[]{
 return Array.isArray(value)&&value.every(s=>s&&typeof s.id==='string'&&typeof s.verified==='boolean'&&typeof s.sharing==='boolean'&&(!s.sharing||s.verified)&&(typeof s.student_name==='string'||s.student_name===null)&&Array.isArray(s.results)&&s.results.every(r=>r&&typeof r.attempt_id==='string'&&typeof r.title==='string'&&typeof r.final_score==='number'&&Number.isFinite(r.final_score)&&r.final_score>=0&&r.final_score<=100&&typeof r.feedback==='string'&&typeof r.released_at==='string'&&Number.isFinite(Date.parse(r.released_at))&&typeof r.amended==='boolean'));
}
