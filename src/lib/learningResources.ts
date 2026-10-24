import {db} from '@/lib/db';
import {pagedRows, rowsByIds} from './pagedRows';
export type LearningResource = {id:string;title:string;module:string;kind:string;bucket:string;path:string};
type Module = {id:string;title:string;programme_id:string};
type Material = {id:string;module_id:string;title:string;kind:string;object_path:string;available_at:string|null};
type Session = {id:string;title:string;module_id:string};
type Artifact = {id:string;session_id:string;artifact_type:string;storage_reference:string;available_at:string};
export async function learningResources(student:string, tenant:string, moduleId?:string, current=()=>true):Promise<LearningResource[]> {
  const enrolments = await pagedRows<{programme_id:string}>(()=>db.from('student_enrolments').select('id,programme_id').eq('student_id',student).eq('tenant_id',tenant).eq('status','active'),current);
  if (!enrolments.length) return [];
  const modules = await rowsByIds<Module>(enrolments.map(e=>e.programme_id),ids=>()=>{
    let q=db.from('modules').select('id,title,programme_id').eq('tenant_id',tenant).in('programme_id',ids);
    if(moduleId)q=q.eq('id',moduleId);return q;
  },current);
  const enrolled=new Set(enrolments.map(e=>e.programme_id));
  const eligible=new Map(modules.filter(m=>enrolled.has(m.programme_id)&&(!moduleId||m.id===moduleId)).map(m=>[m.id,m.title]));
  const ids=[...eligible.keys()], now=new Date().toISOString();
  const [materials,sessions]=await Promise.all([
    rowsByIds<Material>(ids,batch=>()=>db.from('unipathway_module_materials').select('id,module_id,title,kind,object_path,available_at').eq('tenant_id',tenant).eq('publication_status','published').in('module_id',batch),current),
    rowsByIds<Session>(ids,batch=>()=>db.from('live_class_sessions').select('id,title,module_id').eq('tenant_id',tenant).in('module_id',batch),current),
  ]);
  const classes=new Map(sessions.filter(s=>eligible.has(s.module_id)).map(s=>[s.id,s]));
  const artifacts=await rowsByIds<Artifact>([...classes.keys()],batch=>()=>db.from('live_class_artifacts').select('id,session_id,artifact_type,storage_reference,available_at').eq('tenant_id',tenant).eq('publication_status','published').in('session_id',batch).in('artifact_type',['recording','transcript','slides','whiteboard']).lte('available_at',now),current);
  const list:LearningResource[]=materials.filter(m=>eligible.has(m.module_id)&&m.object_path&&(!m.available_at||Date.parse(m.available_at)<=Date.parse(now))).map(m=>({id:`material:${m.id}`,title:m.title,module:eligible.get(m.module_id)!,kind:m.kind,bucket:'unipathway-module-materials',path:m.object_path}));
  for(const a of artifacts){const s=classes.get(a.session_id);if(s&&a.storage_reference&&a.available_at&&Date.parse(a.available_at)<=Date.parse(now))list.push({id:`artifact:${a.id}`,title:s.title,module:eligible.get(s.module_id)!,kind:a.artifact_type,bucket:'unipathway-class-media',path:a.storage_reference});}
  return list.sort((a,b)=>a.module.localeCompare(b.module)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
}
