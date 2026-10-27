import {accountKey,enableOfflineReader,offlineTransaction,PACK_TTL,type LearningAccount} from './offlineLessons';
export const MATERIAL_LIMIT=20, MATERIAL_BYTES=25*1024*1024, TOTAL_MATERIAL_BYTES=100*1024*1024;
export const OFFLINE_MIME_TYPES=['application/pdf','image/png','image/jpeg','video/mp4','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
export type OfflineMaterial={key:string;owner:string;id:string;module_id:string;title:string;object_path:string;blob:Blob;savedAt:number;expiresAt:number;bytes:number;position_seconds?:number};
export function materialCurrent(item:OfflineMaterial,now=Date.now()){return item.savedAt<=now&&item.expiresAt>now;}
export async function listOfflineMaterials(account:LearningAccount):Promise<OfflineMaterial[]>{
 return offlineTransaction(accountKey(account),(store,done)=>{const r=store.getAll();r.onsuccess=()=>done(r.result.filter((x:OfflineMaterial)=>x.owner===accountKey(account)));},'materials');
}
export async function saveOfflineMaterial(account:LearningAccount,item:Pick<OfflineMaterial,'id'|'module_id'|'title'|'object_path'>,blob:Blob){
 if(!blob.size||blob.size>MATERIAL_BYTES||!OFFLINE_MIME_TYPES.includes(blob.type))throw Error('Offline files must use a supported format and be no larger than 25 MB.');
 await offlineTransaction<void>(accountKey(account),(store,done)=>{const r=store.getAll();r.onsuccess=()=>{
  const key=accountKey(account)+':'+item.id;const others=(r.result as OfflineMaterial[]).filter(x=>x.owner===accountKey(account)&&x.key!==key);
  if(others.length>=MATERIAL_LIMIT||others.reduce((sum,x)=>sum+x.bytes,0)+blob.size>TOTAL_MATERIAL_BYTES){store.transaction.abort();return;}
  store.put({...item,key,owner:accountKey(account),blob,bytes:blob.size,savedAt:Date.now(),expiresAt:Date.now()+PACK_TTL} satisfies OfflineMaterial);done();
 }},'materials');enableOfflineReader(account);
}
export async function removeOfflineMaterial(account:LearningAccount,id:string){return offlineTransaction<void>(accountKey(account),(store,done)=>{store.delete(accountKey(account)+':'+id);done();},'materials');}

export async function saveMaterialPosition(account:LearningAccount,id:string,seconds:number){
 if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid playback position.');
 return offlineTransaction<void>(accountKey(account),(store,done)=>{const r=store.get(accountKey(account)+':'+id);r.onsuccess=()=>{
  const item=r.result as OfflineMaterial|undefined;if(!item||!materialCurrent(item)){store.transaction.abort();return;}
  store.put({...item,position_seconds:Math.min(86400,Math.floor(seconds))});done();
 }},'materials');
}
