/**
 * A small, runtime-neutral allowlist for future UniPathway MCP/agent adapters.
 * No browser key, SQL string, arbitrary resource ID or mutation is accepted.
 * Caller identity comes only from Supabase Auth on the server.
 */
export const STUDENT_READ_TOOLS = [
  'list_my_programmes',
  'list_my_coursework_deadlines',
  'list_my_published_materials',
] as const;
export type StudentReadTool = typeof STUDENT_READ_TOOLS[number];
export const MAX_SCOPED_RECORDS = 100;
export const MAX_OUTPUT_RECORDS = 50;

export function parseStudentReadToolRequest(raw:unknown):StudentReadTool{
 if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Invalid tool request');
 const keys=Object.keys(raw);
 if(keys.length!==1 || keys[0]!=='tool') throw Error('Only a tool name is allowed');
 const tool=(raw as {tool?:unknown}).tool;
 if(typeof tool!=='string' || !STUDENT_READ_TOOLS.some(allowed=>allowed===tool))
  throw Error('Unrecognised read-only tool');
 return tool as StudentReadTool;
}
export function verifiedStudentMembership(rows:unknown,tenantId:string):boolean{
 return !!tenantId&&Array.isArray(rows)&&rows.length===1&&rows[0]?.role==='student'&&rows[0]?.tenant_id===tenantId;
}
type Enrolment={student_id:string;tenant_id:string;programme_id:string;status:string};
type Module={id:string;tenant_id:string;programme_id:string};
export function activeOwnProgrammeIds(rows:readonly Enrolment[],userId:string,tenantId:string):string[]{
 if(!userId||!tenantId)return [];
 return [...new Set(rows.filter(r=>r?.student_id===userId&&r.tenant_id===tenantId&&r.status==='active'&&typeof r.programme_id==='string')
  .map(r=>r.programme_id))].sort();
}
export function ownModuleIds(rows:readonly Module[],tenantId:string,programmeIds:readonly string[]):string[]{
 if(!tenantId||!programmeIds.length)return [];
 const allowed=new Set(programmeIds);
 return [...new Set(rows.filter(r=>r?.tenant_id===tenantId&&allowed.has(r.programme_id)&&typeof r.id==='string').map(r=>r.id))].sort();
}
type Brief={id:string;tenant_id:string;module_id:string;title:string;status:string;due_at:string;submission_cutoff:string};
type Material={id:string;tenant_id:string;module_id:string;title:string;kind:string;publication_status:string;available_at:string|null};
export function visibleDeadlineItems(rows:readonly Brief[],tenantId:string,moduleIds:readonly string[],nowIso:string){
 const modules=new Set(moduleIds),now=Date.parse(nowIso);
 return rows.filter(r=>r.tenant_id===tenantId&&modules.has(r.module_id)&&r.status==='published'&&
  Number.isFinite(Date.parse(r.submission_cutoff))&&Date.parse(r.submission_cutoff)>=now)
  .sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at)||a.id.localeCompare(b.id))
  .slice(0,MAX_OUTPUT_RECORDS)
  .map(r=>({recordId:r.id,moduleId:r.module_id,title:r.title,dueAt:r.due_at,submissionCutoff:r.submission_cutoff}));
}
export function visibleMaterialItems(rows:readonly Material[],tenantId:string,moduleIds:readonly string[],nowIso:string){
 const modules=new Set(moduleIds),now=Date.parse(nowIso);
 return rows.filter(r=>r.tenant_id===tenantId&&modules.has(r.module_id)&&r.publication_status==='published'&&
  (r.available_at===null||(Number.isFinite(Date.parse(r.available_at))&&Date.parse(r.available_at)<=now)))
  .sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id))
  .slice(0,MAX_OUTPUT_RECORDS)
  .map(r=>({recordId:r.id,moduleId:r.module_id,title:r.title,kind:r.kind}));
}
