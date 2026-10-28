import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {pagedRows} from '@/lib/pagedRows';
import type {Lesson} from '@/lib/structuredLessons';
import {acknowledgeProgress,getLessonPack,isLearningAccount,listLessonPacks,reconcileLessonPack,type LearningAccount} from './offlineLessons';
import {MATERIAL_BYTES,OFFLINE_MIME_TYPES,listOfflineMaterials,removeOfflineMaterial,saveOfflineMaterial} from './offlineMaterials';
import {persistLessonProgress} from './lessonProgress';
export type DownloadMaterial={id:string;tenant_id:string;module_id:string;title:string;object_path:string;publication_status:string;available_at:string|null};
const released=(m:DownloadMaterial)=>m.publication_status==='published'&&(!m.available_at||Date.parse(m.available_at)<=Date.now());
export async function downloadPrivateMaterial(account:LearningAccount,id:string){
 if(!isLearningAccount(account)||!navigator.onLine)throw Error('Connect and sign in before downloading.');
 const r=await db.from('unipathway_module_materials').select('*').eq('id',id).eq('tenant_id',account.tenantId).maybeSingle();
 const item=r.data as DownloadMaterial|null;
 if(r.error||!item||!released(item))throw Error('This material is not available for offline study. Refresh your materials.');
 // Storage RLS checks current access again. No signed URL or access token is persisted.
 const signed=await supabase.storage.from('unipathway-module-materials').createSignedUrl(item.object_path,120);
 if(signed.error||!signed.data?.signedUrl||!isLearningAccount(account))throw Error('Download was not completed. Reconnect and retry.');
 const blob=await readBoundedPrivateFile(signed.data.signedUrl,()=>isLearningAccount(account));
 const current=await db.from('unipathway_module_materials').select('*').eq('id',id).eq('tenant_id',account.tenantId).maybeSingle();
 if(current.error||!current.data||!released(current.data)||current.data.object_path!==item.object_path||!isLearningAccount(account))throw Error('The material changed during download. Refresh and retry.');
 await saveOfflineMaterial(account,{id:item.id,module_id:item.module_id,title:item.title,object_path:item.object_path},blob);
}
export type SyncReport={synced:number;discarded:number;removedFiles:number;failures:string[]};
const running=new Map<string,Promise<SyncReport>>();
export function syncSavedLearning(account:LearningAccount):Promise<SyncReport>{
 const key=account.tenantId+':'+account.id;const existing=running.get(key);if(existing)return existing;
 const operation=sync(account).finally(()=>running.delete(key));running.set(key,operation);return operation;
}
async function sync(account:LearningAccount):Promise<SyncReport>{
 const report:SyncReport={synced:0,discarded:0,removedFiles:0,failures:[]};
 const current=()=>isLearningAccount(account)&&navigator.onLine;
 if(!current())throw Error('Sign in and connect before syncing.');
 for(const pack of await listLessonPacks(account)){
  if(!current())throw Error('Sync paused because your account or connection changed.');
  try{
   const lessons=await pagedRows<Lesson>(()=>db.from('unipathway_lessons').select('*').eq('tenant_id',account.tenantId).eq('module_id',pack.module).eq('status','published'),current);
   report.discarded+=await reconcileLessonPack(account,pack.module,lessons);
   const latest=await getLessonPack(account,pack.module,true);
   for(const item of latest?.pending||[]){
    if(!current())throw Error('Sync paused.');
    await persistLessonProgress(account.id,item);
    await acknowledgeProgress(account,pack.module,item.mutation);report.synced++;
   }
  }catch{report.failures.push(`Progress for ${pack.lessons[0]?.title||'a saved module'} could not be verified. Unsynced work is retained unless access was withdrawn or the lesson changed.`);}
 }
 for(const file of await listOfflineMaterials(account)){
  if(!current())throw Error('Sync paused because your account or connection changed.');
  try{
   const r=await db.from('unipathway_module_materials').select('*').eq('id',file.id).eq('tenant_id',account.tenantId).maybeSingle();
   if(r.error)throw r.error;
   if(!r.data||!released(r.data)||r.data.object_path!==file.object_path){await removeOfflineMaterial(account,file.id);report.removedFiles++;}
  }catch{report.failures.push(`Access to ${file.title} could not be checked. Retry when connected.`);}
 }
 return report;
}

export async function readBoundedPrivateFile(address:string,current:()=>boolean){
 const url=new URL(address),base=new URL(import.meta.env.VITE_SUPABASE_URL);
 if(url.origin!==base.origin||!url.pathname.startsWith('/storage/v1/object/sign/unipathway-module-materials/'))throw Error('Unrecognised download location.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
 try{
  const response=await fetch(url,{signal:controller.signal,redirect:'error',cache:'no-store',credentials:'omit'});
  const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!response.ok||!response.body||!OFFLINE_MIME_TYPES.includes(type)||Number(response.headers.get('content-length'))>MATERIAL_BYTES)throw Error('Choose a supported file no larger than 25 MB.');
  const reader=response.body.getReader(),parts:BlobPart[]=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(!current())throw Error('Your account changed.');if(done)break;size+=value.byteLength;if(size>MATERIAL_BYTES)throw Error('This file exceeds the 25 MB offline limit.');parts.push(new Uint8Array(value).buffer);}}
  finally{await reader.cancel().catch(()=>{});}
  if(!size)throw Error('The file is empty.');return new Blob(parts,{type});
 }finally{clearTimeout(timer);controller.abort();}
}
