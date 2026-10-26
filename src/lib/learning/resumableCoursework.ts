import { Upload } from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { COURSEWORK_BUCKET, courseworkFileError, type CourseworkFile } from '@/lib/courseworkEvidence';

export function courseworkUploadEndpoint(base: string) {
 const url = new URL(base);
 if (url.protocol !== 'https:' || url.username || url.password) throw Error('Secure storage configuration required.');
 if (/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)) url.hostname = url.hostname.replace('.supabase.co', '.storage.supabase.co');
 return `${url.origin}/storage/v1/upload/resumable`;
}
export function trustedUploadUrl(value: string, endpoint: string) {
 try { const url = new URL(value), expected = new URL(endpoint);
  return !url.username && !url.password && url.origin === expected.origin && (url.pathname === expected.pathname || url.pathname.startsWith(`${expected.pathname}/`));
 } catch { return false; }
}
export function matchesCourseworkReservation(file: File, row: CourseworkFile) {
 return file.size === row.byte_size && file.type === row.mime_type;
}
export async function uploadCourseworkResumable(file: File, row: CourseworkFile, studentId: string, signal: AbortSignal, progress: (percent: number) => void) {
 const invalid = courseworkFileError(file); if (invalid) throw Error(invalid);
 if (!matchesCourseworkReservation(file, row) || row.attempt_id) throw Error('Select the original file with the reserved type and size.');
 const endpoint = courseworkUploadEndpoint(import.meta.env.VITE_SUPABASE_URL);
 const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
 const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
 if (signal.aborted) throw Error('Upload paused. Select Resume upload when ready.');
 return new Promise<void>((resolve, reject) => {
  let finished = false;
  const finish = (error?: Error) => { if (finished) return; finished = true; signal.removeEventListener('abort', pause); if (error) reject(error); else resolve(); };
  const upload = new Upload(file, {
   endpoint, chunkSize: 6 * 1024 * 1024, retryDelays: [0, 1000, 3000, 5000],
   uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
   fingerprint: async () => `unipathway-coursework:${studentId}:${row.storage_path}:${hash}`,
   metadata: { bucketName: COURSEWORK_BUCKET, objectName: row.storage_path, contentType: row.mime_type, cacheControl: '0' },
   onBeforeRequest: async request => {
    if (signal.aborted || !trustedUploadUrl(request.getURL(), endpoint)) throw Error('Upload destination or session changed.');
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== studentId || !data.session.access_token) throw Error('Sign in again before resuming this upload.');
    request.setHeader('authorization', `Bearer ${data.session.access_token}`);
    request.setHeader('x-upsert', 'false');
    request.setHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
   },
   onProgress: (sent, total) => { if (!finished) progress(Math.min(100, Math.round(sent / total * 100))); },
   onSuccess: () => finish(),
   onError: () => finish(Error('Upload interrupted. Resume with the same file, or refresh to check whether it completed.')),
  });
  function pause() { void upload.abort().then(() => finish(Error('Upload paused. Select Resume upload when ready.')), () => finish(Error('Upload interrupted. Re-select the original file to resume.'))); }
  signal.addEventListener('abort', pause, { once: true });
  void upload.findPreviousUploads().then(previous => {
   if (signal.aborted || finished) return;
   const safe = previous.find(p => p.uploadUrl && trustedUploadUrl(p.uploadUrl, endpoint));
   if (safe) upload.resumeFromPreviousUpload(safe);
   upload.start();
  }).catch(() => finish(Error('Upload recovery storage is unavailable. Check your browser storage settings.')));
 });
}
