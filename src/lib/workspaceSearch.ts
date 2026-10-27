import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
export type SearchAccount={id:string;tenantId:string;role:string};
export type SearchResult={id:string;title:string;detail:string;path:string};
export type SearchResults={courses:SearchResult[];lessons:SearchResult[];materials:SearchResult[]};
type Module={id:string;title:string;code:string;programme_id:string};
type Content={id:string;module_id:string;title:string;status?:string;kind?:string;publication_status?:string};
export const SEARCH_LIMIT=12;
export const searchWords=(term:string)=>term.trim().slice(0,100).split(/\s+/).filter(Boolean).slice(0,8);
export const matchesSearch=(text:string,term:string)=>searchWords(term).every(word=>text.toLocaleLowerCase().includes(word.toLocaleLowerCase()));
const literal=(text:string)=>text.replace(/[\\%_]/g,'\\$&');
const compare=(a:{title:string;id:string},b:{title:string;id:string})=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id);
/** Metadata only. RLS remains authoritative; active role adds a narrower assignment scope. */
export async function searchWorkspace(account:SearchAccount,term:string,signal:AbortSignal):Promise<SearchResults>{
 const empty={courses:[],lessons:[],materials:[]};
 if(!account.id||!account.tenantId||!['student','lecturer'].includes(account.role)||term.trim().length<2)return empty;
 const current=()=>!signal.aborted;
 let programmes:string[]=[];
 if(account.role==='student'){
  const enrolments=await pagedRows<{programme_id:string}>(()=>db.from('student_enrolments').select('id,programme_id').eq('tenant_id',account.tenantId).eq('student_id',account.id).eq('status','active').abortSignal(signal),current);
  programmes=[...new Set(enrolments.map(e=>e.programme_id))];
  if(!programmes.length)return empty;
 }
 const modules=await pagedRows<Module>(()=>{
  let q=db.from('modules').select('id,title,code,programme_id').eq('tenant_id',account.tenantId);
  if(account.role==='lecturer')q=q.eq('lecturer_id',account.id);
  return q.abortSignal(signal);
 },current);
 const allowed=modules.filter(m=>account.role==='lecturer'||programmes.includes(m.programme_id));
 const moduleById=new Map(allowed.map(m=>[m.id,m]));
 const courses=allowed.filter(m=>matchesSearch(`${m.title} ${m.code||''}`,term)).sort(compare).slice(0,SEARCH_LIMIT+1).map(m=>({id:m.id,title:m.title,detail:m.code||'Course module',path:`/${account.role}/module?${new URLSearchParams({module:m.id})}`}));
 async function content(table:string,kind:'lessons'|'materials'){
  const rows:Content[]=[];
  for(let i=0;i<allowed.length;i+=50){
   if(!current())throw Error('Search cancelled');
   let q=db.from(table).select(kind==='lessons'?'id,module_id,title,status':'id,module_id,title,kind,publication_status').eq('tenant_id',account.tenantId).in('module_id',allowed.slice(i,i+50).map(m=>m.id));
   for(const word of searchWords(term))q=q.ilike('title',`%${literal(word)}%`);
   if(kind==='lessons')q=account.role==='student'?q.eq('status','published'):q.in('status',['draft','published']);
   else if(account.role==='student')q=q.eq('publication_status','published').or(`available_at.is.null,available_at.lte.${new Date().toISOString()}`);
   const result=await q.order('title').order('id').limit(SEARCH_LIMIT+1).abortSignal(signal);
   if(!current())throw Error('Search cancelled');
   if(result.error||!Array.isArray(result.data))throw Error('Search could not be verified');
   rows.push(...result.data as Content[]);
  }
  return rows.filter(r=>moduleById.has(r.module_id)).sort(compare).slice(0,SEARCH_LIMIT+1).map(r=>({
   id:r.id,title:r.title,detail:`${moduleById.get(r.module_id)!.title}${account.role==='lecturer'?` · ${r.status||r.publication_status}`:''}`,
   path:`/${account.role}/${kind}?${new URLSearchParams({module:r.module_id,[kind==='lessons'?'lesson':'material']:r.id})}`,
  }));
 }
 const [lessons,materials]=await Promise.all([content('unipathway_lessons','lessons'),content('unipathway_module_materials','materials')]);
 if(!current())throw Error('Search cancelled');
 return {courses,lessons,materials};
}
