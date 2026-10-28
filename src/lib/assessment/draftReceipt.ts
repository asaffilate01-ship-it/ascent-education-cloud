type Criterion={code:string;points:number;reason:string;evidence:string;missing:string};
type Contents={criteria:Record<string,Criterion>;feedback:string;guidance:string};
/** Require the complete, expected RPC row before clearing unsaved state. JSONB key order may differ. */
export function confirmedDraftReceipt(row:unknown,expected:Contents&{attempt:string;owner?:string;tenant?:string;revision:number}):row is {revision:number;updated_at:string}{
 if(!row||typeof row!=='object')return false;
 const r=row as Record<string,unknown>;
 if(r.attempt_id!==expected.attempt||r.marker_id!==expected.owner||r.tenant_id!==expected.tenant||r.revision!==expected.revision+1
 ||typeof r.updated_at!=='string'||!Number.isFinite(Date.parse(r.updated_at))||r.feedback!==expected.feedback||r.guidance!==expected.guidance
 ||!r.criteria||typeof r.criteria!=='object'||Array.isArray(r.criteria))return false;
 const criteria=r.criteria as Record<string,unknown>;
 return Object.keys(criteria).length===Object.keys(expected.criteria).length&&Object.entries(expected.criteria).every(([code,c])=>{
  const value=criteria[code];if(!value||typeof value!=='object')return false;
  const fields=value as Record<string,unknown>;
  return (['code','points','reason','evidence','missing'] as const).every(k=>fields[k]===c[k]);
 });
}
