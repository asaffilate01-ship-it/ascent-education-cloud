export type DraftCriterion={code:string;points:number;reason:string;evidence:string;missing:string};
export type DraftContent={criteria:Record<string,DraftCriterion>;feedback:string;guidance:string};
type Rubric=ReadonlyArray<{criterion_code:string;max_points:number|string}>;
/** Normalize saved content only. The historical revision must never replace the editor's concurrency token. */
export function prepareDraftRestore(value:unknown,rubric:Rubric):DraftContent|null{
 if(!value||typeof value!=='object'||!rubric.length)return null;
 const row=value as Record<string,unknown>,limits=new Map(rubric.map(c=>[c.criterion_code,Number(c.max_points)]));
 if(limits.size!==rubric.length||[...limits.values()].some(n=>!Number.isFinite(n)||n<0)
 ||typeof row.feedback!=='string'||row.feedback.length>6000||typeof row.guidance!=='string'||row.guidance.length>6000
 ||!row.criteria||typeof row.criteria!=='object'||Array.isArray(row.criteria))return null;
 const entries:Array<[string,DraftCriterion]>=[];
 for(const [code,value] of Object.entries(row.criteria)){
  if(!limits.has(code)||!value||typeof value!=='object'||Array.isArray(value))return null;
  const c=value as Record<string,unknown>;
  if(c.code!==code||typeof c.points!=='number'||!Number.isFinite(c.points)||c.points<0||c.points>limits.get(code)!
  ||typeof c.reason!=='string'||c.reason.length>2000||typeof c.evidence!=='string'||c.evidence.length>900
  ||typeof c.missing!=='string'||c.missing.length>2000)return null;
  entries.push([code,{code,points:c.points,reason:c.reason,evidence:c.evidence,missing:c.missing}]);
 }
 const criteria=Object.fromEntries(entries);
 if(new TextEncoder().encode(JSON.stringify(criteria)).byteLength>250000)return null;
 return {criteria,feedback:row.feedback,guidance:row.guidance};
}
