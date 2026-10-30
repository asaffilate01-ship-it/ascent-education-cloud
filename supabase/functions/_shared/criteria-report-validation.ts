/** Reject incomplete or invented criterion reports before creating assessor drafts. */
export function validateCriteriaReport(value: unknown, codes: string[], evidence: string) {
 if (!value || typeof value!=='object' || !codes.length || new Set(codes).size!==codes.length) throw Error('Controlled criterion codes required');
 const report=value as Record<string,unknown>;
 if (!Array.isArray(report.criteria_results) || report.criteria_results.length!==codes.length) throw Error('Every controlled criterion requires one result');
 const seen=new Set<string>();
 const criteria_results=report.criteria_results.map((entry:unknown)=>{
  if (!entry || typeof entry!=='object') throw Error('Invalid criterion result');
  const r=entry as Record<string,unknown>;
  if (typeof r.criterion_code!=='string' || !codes.includes(r.criterion_code) || seen.has(r.criterion_code)) throw Error('Unknown or duplicate criterion');
  seen.add(r.criterion_code);
  if (!['met','not_met','insufficient_evidence'].includes(String(r.recommendation))) throw Error('Invalid criterion recommendation');
  if (typeof r.confidence!=='number' || !Number.isFinite(r.confidence) || r.confidence<0 || r.confidence>1) throw Error('Invalid confidence');
  for (const key of ['rationale','missing_evidence','suggested_feedback','evidence_location']) if (typeof r[key]!=='string' || (r[key] as string).length>4000) throw Error('Invalid criterion details');
  if ((r.rationale as string).trim().length<10 || (r.suggested_feedback as string).trim().length<10) throw Error('Actionable feedback required');
  const quote=typeof r.evidence_quote==='string'?r.evidence_quote.trim():'';
  if (quote.length>1000 || (quote && !evidence.includes(quote))) throw Error('Evidence quotation not found in submission');
  if (r.recommendation==='met' && !quote) throw Error('Met criterion requires a verified quotation');
  if (!evidence.trim() && r.recommendation!=='insufficient_evidence') throw Error('No evidence was supplied');
  return {criterion_code:r.criterion_code,recommendation:r.recommendation,confidence:r.confidence,rationale:r.rationale as string,missing_evidence:r.missing_evidence as string,suggested_feedback:r.suggested_feedback as string,evidence_location:r.evidence_location as string,evidence_quote:quote};
 });
 // A provider's grade or misconduct assertions are never persisted by this agent.
 return {criteria_results,suggested_grade:null,suggested_outcome:'human_review_required',confidence:Math.min(...criteria_results.map(r=>r.confidence)),integrity_flags:[]};
}
