export type Criterion={criterion_code:string;max_points:number;learning_outcome:string;criterion_description:string;scoring_guidance:string};
type Result={criterion_code:string;suggested_points:number;evidence_quote:string;missing_evidence:string;rationale:string;feedback:string};
export function checkDraft(value:unknown,criteria:Criterion[],evidence:string){
 if(!value||typeof value!=='object')throw Error('AI response was not a rubric report');
 const parsed=value as Record<string,unknown>;
 if(!Array.isArray(parsed.criteria_results)||parsed.criteria_results.length!==criteria.length)
  throw Error('Every criterion must be independently evaluated');
 const used=new Set<string>();
 const validated:Result[]=[];
 for(const entry of parsed.criteria_results){
  if(!entry||typeof entry!=='object')throw Error('Invalid criterion response');
  const v=entry as Record<string,unknown>;
  const code=String(v.criterion_code||'');
  const rule=criteria.find(r=>r.criterion_code===code);
  const points=v.suggested_points;
  const quote=String(v.evidence_quote||'').trim();
  const rationale=String(v.rationale||'').trim();
  const missing=String(v.missing_evidence||'').trim();
  const feedback=String(v.feedback||'').trim();
  if(!rule||used.has(code)||v.suggested_points===null||v.suggested_points===undefined
   ||typeof points!=='number'||!Number.isFinite(points)||points<0||points>Number(rule.max_points)
   ||rationale.length<20||missing.length<3||feedback.length<10||quote.length>500)
   throw Error('AI criterion was incomplete or exceeded published maximum');
  // Never quote evidence that was not supplied to the model.
  if(quote&& !evidence.includes(quote))throw Error('AI cited text not present in submitted evidence');
  if(!quote&&points>0)throw Error('Suggested marks require verifiable evidence');
  used.add(code);
  validated.push({criterion_code:code,suggested_points:points,
   evidence_quote:quote,missing_evidence:missing,rationale,feedback});
 }
 const strengths=String(parsed.strengths||'').slice(0,4000);
 const gaps=String(parsed.missing_work||'').slice(0,4000);
 const feedback=String(parsed.feedback||'').slice(0,6000);
 if(feedback.length<40)throw Error('AI draft lacks actionable overall feedback');
 return {criteria_results:validated,strengths,missing_work:gaps,feedback,
  suggested_raw_score:validated.reduce((sum,v)=>sum+v.suggested_points,0)};
}
