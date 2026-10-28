import {accountKey,offlineTransaction,type LearningAccount,type LessonPack} from './offlineLessons';
import {materialCurrent,type OfflineMaterial} from './offlineMaterials';
export type SavedFilter='all'|'available'|'expired';
export const packCurrent=(pack:LessonPack,now:number)=>pack.savedAt<=now&&pack.expiresAt>now;
export function savedLearningView(packs:LessonPack[],files:OfflineMaterial[],query:string,filter:SavedFilter,now:number){
 const text=query.trim().toLocaleLowerCase();
 const match=(title:string,current:boolean)=>(!text||title.toLocaleLowerCase().includes(text))&&(filter==='all'||(filter==='available'?current:!current));
 return {
  packs:packs.filter(p=>match(p.lessons.map(l=>l.title+' '+l.body+' '+(l.transcript||'')).join(' '),packCurrent(p,now))),
  files:files.filter(f=>match(f.title,materialCurrent(f,now))),
  available:packs.filter(p=>packCurrent(p,now)).length+files.filter(f=>materialCurrent(f,now)).length,
  expired:packs.filter(p=>!packCurrent(p,now)).length+files.filter(f=>!materialCurrent(f,now)).length,
  removablePacks:packs.filter(p=>!packCurrent(p,now)&&!p.pending.length),
  removableFiles:files.filter(f=>!materialCurrent(f,now)),
  protectedPacks:packs.filter(p=>!packCurrent(p,now)&&p.pending.length),
  bytes:files.reduce((sum,f)=>sum+f.bytes,0)+packs.reduce((sum,p)=>sum+p.bytes,0),
 };
}

// Recheck inside the write transaction: another tab may have refreshed the copy
// or queued work since the list was rendered.
export async function removeExpiredSavedCopy(account:LearningAccount,id:string,kind:'packs'|'materials'){
 const owner=accountKey(account);
 return offlineTransaction<boolean>(owner,(store,done)=>{
  const request=store.get(`${owner}:${id}`);
  request.onsuccess=()=>{const item=request.result as LessonPack|OfflineMaterial|undefined;
   if(!item||item.owner!==owner||item.expiresAt>Date.now()||('pending' in item&&item.pending.length)){done(false);return;}
   store.delete(item.key);done(true);
  };
 },kind);
}
