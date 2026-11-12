/**
 * Fail-closed, source-only projection of independently released results.
 * It does not read human marking drafts, decide awards, or authorise appeals.
 * The caller must still use authenticated centre/student scoped RLS queries.
 */
export type ReleasedOverviewItem = Readonly<{
 attemptId:string;
 briefId:string;
 score:number;
 releasedAt:string;
 briefTitle:string|null;
 moduleId:string|null;
 amended:boolean;
}>;
export type ReleasedOverview = Readonly<{
 average:number|null;
 results:readonly ReleasedOverviewItem[];
 total:number;
}>;
type Evidence = Record<string,unknown>;

function record(raw:unknown):Evidence{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Unverified released assessment record');
 return raw as Evidence;
}
function id(value:unknown):string{
 if(typeof value!=='string'||!value.trim()||value.length>120)
  throw Error('Missing assessment identity');
 return value;
}
function score(value:unknown):number{
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)
  throw Error('Released score is not a verified number');
 return value;
}
function when(value:unknown):number{
 if(typeof value!=='string'||!value.trim()||!Number.isFinite(Date.parse(value)))
  throw Error('Released assessment timestamp is invalid');
 return Date.parse(value);
}
function inScope(row:Evidence,student:string,centre:string):void{
 if(row.student_id!==student||row.tenant_id!==centre)
  throw Error('Cross-account released assessment evidence');
}

/** Reject incomplete, duplicated or cross-centre snapshots rather than show misleading grades. */
export function verifiedReleasedOverview(
 released:unknown, amendments:unknown, briefs:unknown, student:string, centre:string,
):ReleasedOverview{
 if(!student||!centre||!Array.isArray(released)||!Array.isArray(amendments)||!Array.isArray(briefs)||
    released.length>100||amendments.length>100||briefs.length>100)
  throw Error('Released assessment snapshot is incomplete or unbounded');

 const known=new Map<string,{row:Evidence;releasedAt:number}>();
 for(const raw of released){
  const row=record(raw);
  inScope(row,student,centre);
  const attempt=id(row.attempt_id);
  id(row.brief_id); score(row.final_score);
  const time=when(row.released_at);
  if(known.has(attempt))throw Error('Duplicate released assessment attempt');
  known.set(attempt,{row,releasedAt:time});
 }
 const corrected=new Map<string,number>();
 for(const raw of amendments){
  const row=record(raw);
  inScope(row,student,centre);
  const attempt=id(row.attempt_id);
  const original=known.get(attempt);
  if(!original||original.row.brief_id!==id(row.brief_id)||corrected.has(attempt))
   throw Error('Unmatched or duplicated assessment correction');
  corrected.set(attempt,score(row.corrected_final_score));
 }
 const titles=new Map<string,{title:string;moduleId:string}>();
 for(const raw of briefs){
  const row=record(raw);
  if(row.tenant_id!==centre)throw Error('Cross-centre assessment title');
  const brief=id(row.id),moduleId=id(row.module_id);
  if(typeof row.title!=='string'||!row.title.trim()||titles.has(brief))
   throw Error('Invalid or duplicated released assessment metadata');
  titles.set(brief,{title:row.title.trim(),moduleId});
 }
 const results:ReleasedOverviewItem[]=[...known.entries()]
  .sort(([a,ar],[b,br])=>br.releasedAt-ar.releasedAt||a.localeCompare(b))
  .map(([attempt,{row}])=>{
    const briefId=row.brief_id as string,meta=titles.get(briefId);
    return {
      attemptId:attempt,briefId,
      score:corrected.get(attempt)??(row.final_score as number),
      releasedAt:row.released_at as string,
      briefTitle:meta?.title??null,moduleId:meta?.moduleId??null,
      amended:corrected.has(attempt),
    };
  });
 const total=results.length;
 const average=total?Math.round(results.reduce((sum,item)=>sum+item.score,0)/total):null;
 return {results,average,total};
}
