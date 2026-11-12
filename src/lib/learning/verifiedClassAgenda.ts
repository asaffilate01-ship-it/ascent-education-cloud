/**
 * Student dashboard class listings are a read-only hint, never an invitation.
 * Every query must use the caller's RLS-scoped Supabase client, the verified
 * centre and ACTIVE enrolled modules. The classroom route checks access again.
 */
export type VerifiedClassSession = {
 id:string; tenant_id:string; module_id:string; status:'scheduled'|'live';
 title:string; starts_at:string; ends_at:string;
};

export const CLASS_AGENDA_CHUNK_SIZE = 50;
export const CLASS_AGENDA_QUERY_LIMIT = 10;
export const CLASS_AGENDA_VISIBLE_LIMIT = 5;

/** Avoid oversized PostgREST IN filters and duplicate module reads. */
export function classAgendaModuleChunks(moduleIds:readonly string[]):string[][] {
 if(!Array.isArray(moduleIds))throw Error('Unverified enrolled modules');
 const ids:string[]=[];
 const seen=new Set<string>();
 for(const id of moduleIds){
  if(typeof id!=='string'||!id.trim())throw Error('Unverified enrolled module ID');
  if(!seen.has(id)){seen.add(id);ids.push(id);}
 }
 const chunks:string[][]=[];
 for(let i=0;i<ids.length;i+=CLASS_AGENDA_CHUNK_SIZE)
  chunks.push(ids.slice(i,i+CLASS_AGENDA_CHUNK_SIZE));
 return chunks;
}

function finiteDate(value:string):number|null {
 if(typeof value!=='string'||!value.trim())return null;
 const time=Date.parse(value);
 return Number.isFinite(time)?time:null;
}

function verifyRows(
 raw:unknown,tenant:string,allowedModules:ReadonlySet<string>,now:number,
):VerifiedClassSession[] {
 if(!Array.isArray(raw)||raw.length>CLASS_AGENDA_QUERY_LIMIT)
  throw Error('Classroom invitation listing unavailable or unbounded');
 const sessions:VerifiedClassSession[]=[];
 for(const record of raw){
  if(!record||typeof record!=='object'||Array.isArray(record))
   throw Error('Unverified classroom listing');
  const s=record as Partial<VerifiedClassSession>;
  const start=finiteDate(s.starts_at!),end=finiteDate(s.ends_at!);
  if(typeof s.id!=='string'||!s.id.trim()||typeof s.title!=='string'||!s.title.trim()||
     s.tenant_id!==tenant||typeof s.module_id!=='string'||!allowedModules.has(s.module_id)||
     (s.status!=='scheduled'&&s.status!=='live')||
     start===null||end===null||end<start)
   throw Error('Classroom listing failed centre, module or schedule verification');
  if(end>now)sessions.push(s as VerifiedClassSession);
 }
 return sessions;
}

/**
 * Consume EACH limited, authorised module batch before returning a snapshot.
 * A failed or inconsistent batch hides the entire class snapshot; never show
 * a misleading partial list or suggest an action from incomplete evidence.
 */
export async function loadVerifiedClassAgenda(
 moduleIds:readonly string[],tenant:string,now:number,
 read:(chunk:readonly string[])=>Promise<unknown>,
 current:()=>boolean=()=>true,
):Promise<VerifiedClassSession[]>{
 if(!tenant||!Number.isFinite(now))throw Error('Verified centre and time required');
 const chunks=classAgendaModuleChunks(moduleIds);
 const seen=new Set<string>();
 const sessions:VerifiedClassSession[]=[];
 for(const ids of chunks){
  if(!current())throw Error('Classroom request superseded');
  const batch=verifyRows(await read(ids),tenant,new Set(ids),now);
  if(!current())throw Error('Classroom request superseded');
  for(const item of batch){
   if(seen.has(item.id))throw Error('Duplicate classroom session across module batches');
   seen.add(item.id);sessions.push(item);
  }
 }
 return sessions.sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)||
   a.id.localeCompare(b.id)).slice(0,CLASS_AGENDA_QUERY_LIMIT);
}

/** Time-only refresh: expired cards disappear without fetching private data again. */
export function visibleVerifiedClassAgenda(rows:readonly VerifiedClassSession[],now:number){
 if(!Number.isFinite(now))return [];
 return rows.filter(s=>finiteDate(s.ends_at)!>now).slice(0,CLASS_AGENDA_VISIBLE_LIMIT);
}
