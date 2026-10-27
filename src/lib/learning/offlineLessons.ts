import type { Lesson, LessonProgress } from '@/lib/structuredLessons';

export const PACK_TTL = 24 * 60 * 60 * 1000;
export const PACK_LIMIT = 10;
export const PACK_BYTES = 5 * 1024 * 1024;
export type LearningAccount = { id: string; tenantId: string };
export type PendingProgress = LessonProgress & { mutation: string };
export type LessonPack = {
 key: string; owner: string; module: string; savedAt: number; expiresAt: number;
 lessons: Lesson[]; progress: LessonProgress[]; pending: PendingProgress[]; bytes: number;
};
let activeOwner: string | null = null;
export const OFFLINE_OWNER_KEY='unipathway-learning-owner';
const READER_KEY='unipathway-offline-reader';
export const isLearningAccount=(account:LearningAccount)=>activeOwner===accountKey(account)&&localStorage.getItem(OFFLINE_OWNER_KEY)===activeOwner;
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===OFFLINE_OWNER_KEY||event.key===null){if(localStorage.getItem(OFFLINE_OWNER_KEY)!==activeOwner)activeOwner=null;}});
export function enableOfflineReader(account:LearningAccount){
 if(!isLearningAccount(account))throw Error('Your account changed.');
 localStorage.setItem(READER_KEY,JSON.stringify({account,savedAt:Date.now(),expiresAt:Date.now()+PACK_TTL}));
}
// This restores device-local reading only. It grants no authenticated API or dashboard access.
export async function restoreOfflineReader():Promise<LearningAccount|null>{
 try{const entry=JSON.parse(localStorage.getItem(READER_KEY)||'null');const now=Date.now();
  if(!entry||typeof entry.account?.id!=='string'||typeof entry.account?.tenantId!=='string'||!Number.isFinite(entry.savedAt)||!Number.isFinite(entry.expiresAt)||entry.savedAt>now||entry.expiresAt<=now||entry.expiresAt-entry.savedAt>PACK_TTL||localStorage.getItem(OFFLINE_OWNER_KEY)!==accountKey(entry.account))return null;
  activeOwner=accountKey(entry.account);return entry.account;
 }catch{return null;}
}
export const accountKey = (account: LearningAccount) => `${account.tenantId}:${account.id}`;
const packKey = (account: LearningAccount, module: string) => `${accountKey(account)}:${module}`;
const sameRevision = (a: LessonProgress, b: LessonProgress) => a.lesson_id === b.lesson_id && a.revision === b.revision;
export function mergeLessonProgress(remote: LessonProgress[], local: LessonProgress[]) {
 const result = [...remote];
 for (const item of local) {
  const index = result.findIndex(p => sameRevision(p, item));
  if (index < 0) result.push(item);
  else {
   const previous = result[index];
   result[index] = { ...(previous.updated_at > item.updated_at ? previous : item), completed: previous.completed || item.completed };
  }
 }
 return result;
}
function openStore(): Promise<IDBDatabase> {
 return new Promise((resolve, reject) => {
  const request = indexedDB.open('unipathway-lesson-packs', 2);let abandoned=false;
  request.onupgradeneeded = () => {for(const name of ['packs','materials'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'key'});};
  request.onblocked=()=>{abandoned=true;reject(Error('Close other UniPathway tabs and retry to upgrade offline storage.'));};
  request.onerror = () => reject(Error('Device storage is unavailable. Free some space or use another browser.'));
  request.onsuccess = () => {if(abandoned){request.result.close();return;}request.result.onversionchange=()=>request.result.close();resolve(request.result);};
 });
}
export async function offlineTransaction<T>(owner: string | null, work: (store: IDBObjectStore, result: (value: T) => void) => void, storeName='packs'): Promise<T> {
 const database = await openStore();
 try {
  if (owner !== activeOwner || localStorage.getItem(OFFLINE_OWNER_KEY)!==owner) throw Error('Your account changed. Reopen the lesson.');
  return await new Promise<T>((resolve, reject) => {
   const tx = database.transaction(storeName, 'readwrite'); let value: T;
   tx.oncomplete = () => owner === activeOwner && localStorage.getItem(OFFLINE_OWNER_KEY)===owner ? resolve(value) : reject(Error('Your account changed. Reopen the lesson.'));
   tx.onabort = tx.onerror = () => reject(Error('Device storage could not be updated. Free some space and retry.'));
   work(tx.objectStore(storeName), next => { value = next; });
  });
 } finally { database.close(); }
}
export async function setLearningAccount(account: LearningAccount | null) {
 const nextOwner=account ? accountKey(account) : null;
 if(!nextOwner||localStorage.getItem(OFFLINE_OWNER_KEY)!==nextOwner)localStorage.removeItem('unipathway-recording-progress');
 activeOwner = nextOwner;
 if (typeof indexedDB === 'undefined') return;
 const owner = activeOwner;
 if(owner)localStorage.setItem(OFFLINE_OWNER_KEY,owner);else {localStorage.removeItem(OFFLINE_OWNER_KEY);localStorage.removeItem(READER_KEY);}
 for(const name of ['packs','materials'])await offlineTransaction<void>(owner, (store, done) => {
  const request = store.openCursor();
  request.onsuccess = () => { const cursor = request.result;
   if (!cursor) { done(); return; }
   if (cursor.value.owner !== owner) cursor.delete();
   cursor.continue();
  };
 },name);
}
export async function listLessonPacks(account: LearningAccount): Promise<LessonPack[]> {
 return offlineTransaction(accountKey(account), (store, done) => {
  const request = store.getAll();
  request.onsuccess = () => done(request.result.filter((p: LessonPack) => p.owner === accountKey(account)));
 });
}
export async function getLessonPack(account: LearningAccount, module: string, includeExpired = false): Promise<LessonPack | null> {
 return offlineTransaction(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => {
   const pack = request.result as LessonPack | undefined;
   done(pack && (includeExpired || pack.savedAt<=Date.now() && pack.expiresAt > Date.now()) ? pack : null);
  };
 });
}
export async function saveLessonPack(account: LearningAccount, module: string, lessons: Lesson[], progress: LessonProgress[]) {
 if (!lessons.length || lessons.some(l => l.module_id !== module || l.tenant_id !== account.tenantId || l.status !== 'published')) throw Error('Only your published module lessons can be saved.');
 // Text only: no credential-bearing external links, provider media or signed resource URLs persisted.
 const textLessons = lessons.map(l => ({ ...l, video_url: null, resource_url: null }));
 const bytes = new TextEncoder().encode(JSON.stringify({ lessons: textLessons, progress })).byteLength;
 if (bytes > PACK_BYTES) throw Error('This text pack exceeds the 5 MB device limit.');
 await offlineTransaction<void>(accountKey(account), (store, done) => {
  const request = store.getAll();
  request.onsuccess = () => {
   const packs = request.result as LessonPack[], key = packKey(account, module);
   const existing = packs.find(p => p.key === key);
   if (!existing && packs.filter(p => p.owner === accountKey(account)).length >= PACK_LIMIT) { store.transaction.abort(); return; }
   const pending = (existing?.pending || []).filter(p => lessons.some(l => l.id === p.lesson_id && l.revision === p.revision));
   store.put({ key, owner: accountKey(account), module, savedAt: Date.now(), expiresAt: Date.now() + PACK_TTL,
    lessons: textLessons, progress: mergeLessonProgress(progress, pending), pending, bytes } satisfies LessonPack);
   done();
  };
 });
 enableOfflineReader(account);
}
export async function removeLessonPack(account: LearningAccount, module: string) {
 return offlineTransaction<void>(accountKey(account), (store, done) => { store.delete(packKey(account, module)); done(); });
}
export async function queueLessonProgress(account: LearningAccount, module: string, progress: LessonProgress) {
 return offlineTransaction<PendingProgress>(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => {
   const pack = request.result as LessonPack | undefined;
   if (!pack || pack.savedAt>Date.now() || pack.expiresAt <= Date.now() || !pack.lessons.some(l => l.id === progress.lesson_id && l.revision === progress.revision)) { store.transaction.abort(); return; }
   const previous = pack.progress.find(p => sameRevision(p, progress));
   const item = { ...progress, completed: progress.completed || !!previous?.completed, mutation: crypto.randomUUID() };
   pack.pending = [...pack.pending.filter(p => !sameRevision(p, item)), item];
   pack.progress = mergeLessonProgress(pack.progress, [item]); store.put(pack); done(item);
  };
 });
}
export async function acknowledgeProgress(account: LearningAccount, module: string, mutation: string) {
 return offlineTransaction<void>(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => { const pack = request.result as LessonPack | undefined;
   if (pack) { pack.pending = pack.pending.filter(p => p.mutation !== mutation); store.put(pack); }
   done();
  };
 });
}
// Called only after a successful, caller-scoped server read, never after a timeout.
export async function reconcileLessonPack(account: LearningAccount, module: string, lessons: Lesson[]) {
 return offlineTransaction<number>(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => {
   const pack = request.result as LessonPack | undefined;
   if (!pack) { done(0); return; }
   const allowed = (p: { lesson_id: string; revision: number }) => lessons.some(l => l.id === p.lesson_id && l.revision === p.revision);
   const discarded = pack.pending.filter(p => !allowed(p)).length;
   pack.lessons = pack.lessons.filter(l => allowed({ lesson_id: l.id, revision: l.revision }));
   pack.progress = pack.progress.filter(allowed); pack.pending = pack.pending.filter(allowed);
   if (pack.lessons.length) store.put(pack); else store.delete(pack.key);
   done(discarded);
  };
 });
}

export function clearCourseworkResumeHints() {
 for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key?.startsWith('tus::unipathway-coursework:')) localStorage.removeItem(key);
 }
}
