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
  const request = indexedDB.open('unipathway-lesson-packs', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('packs', { keyPath: 'key' });
  request.onerror = () => reject(Error('Device storage is unavailable. Free some space or use another browser.'));
  request.onsuccess = () => resolve(request.result);
 });
}
async function transact<T>(owner: string | null, work: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
 const database = await openStore();
 try {
  if (owner !== activeOwner) throw Error('Your account changed. Reopen the lesson.');
  return await new Promise<T>((resolve, reject) => {
   const tx = database.transaction('packs', 'readwrite'); let value: T;
   tx.oncomplete = () => owner === activeOwner ? resolve(value) : reject(Error('Your account changed. Reopen the lesson.'));
   tx.onabort = tx.onerror = () => reject(Error('Device storage could not be updated. Free some space and retry.'));
   work(tx.objectStore('packs'), next => { value = next; });
  });
 } finally { database.close(); }
}
export async function setLearningAccount(account: LearningAccount | null) {
 activeOwner = account ? accountKey(account) : null;
 if (typeof indexedDB === 'undefined') return;
 const owner = activeOwner;
 await transact<void>(owner, (store, done) => {
  const request = store.openCursor();
  request.onsuccess = () => { const cursor = request.result;
   if (!cursor) { done(); return; }
   if (cursor.value.owner !== owner) cursor.delete();
   cursor.continue();
  };
 });
}
export async function listLessonPacks(account: LearningAccount): Promise<LessonPack[]> {
 return transact(accountKey(account), (store, done) => {
  const request = store.getAll();
  request.onsuccess = () => done(request.result.filter((p: LessonPack) => p.owner === accountKey(account)));
 });
}
export async function getLessonPack(account: LearningAccount, module: string, includeExpired = false): Promise<LessonPack | null> {
 return transact(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => {
   const pack = request.result as LessonPack | undefined;
   done(pack && (includeExpired || pack.expiresAt > Date.now()) ? pack : null);
  };
 });
}
export async function saveLessonPack(account: LearningAccount, module: string, lessons: Lesson[], progress: LessonProgress[]) {
 if (!lessons.length || lessons.some(l => l.module_id !== module || l.tenant_id !== account.tenantId || l.status !== 'published')) throw Error('Only your published module lessons can be saved.');
 // Text only: no credential-bearing external links, provider media or signed resource URLs persisted.
 const textLessons = lessons.map(l => ({ ...l, video_url: null, resource_url: null }));
 const bytes = new TextEncoder().encode(JSON.stringify({ lessons: textLessons, progress })).byteLength;
 if (bytes > PACK_BYTES) throw Error('This text pack exceeds the 5 MB device limit.');
 return transact<void>(accountKey(account), (store, done) => {
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
}
export async function removeLessonPack(account: LearningAccount, module: string) {
 return transact<void>(accountKey(account), (store, done) => { store.delete(packKey(account, module)); done(); });
}
export async function queueLessonProgress(account: LearningAccount, module: string, progress: LessonProgress) {
 return transact<PendingProgress>(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => {
   const pack = request.result as LessonPack | undefined;
   if (!pack || pack.expiresAt <= Date.now() || !pack.lessons.some(l => l.id === progress.lesson_id && l.revision === progress.revision)) { store.transaction.abort(); return; }
   const previous = pack.progress.find(p => sameRevision(p, progress));
   const item = { ...progress, completed: progress.completed || !!previous?.completed, mutation: crypto.randomUUID() };
   pack.pending = [...pack.pending.filter(p => !sameRevision(p, item)), item];
   pack.progress = mergeLessonProgress(pack.progress, [item]); store.put(pack); done(item);
  };
 });
}
export async function acknowledgeProgress(account: LearningAccount, module: string, mutation: string) {
 return transact<void>(accountKey(account), (store, done) => {
  const request = store.get(packKey(account, module));
  request.onsuccess = () => { const pack = request.result as LessonPack | undefined;
   if (pack) { pack.pending = pack.pending.filter(p => p.mutation !== mutation); store.put(pack); }
   done();
  };
 });
}
// Called only after a successful, caller-scoped server read, never after a timeout.
export async function reconcileLessonPack(account: LearningAccount, module: string, lessons: Lesson[]) {
 return transact<number>(accountKey(account), (store, done) => {
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
