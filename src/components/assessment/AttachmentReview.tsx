import {lazy, Suspense, useEffect, useState} from 'react';
const PdfEvidencePreview = lazy(()=>import('./PdfEvidencePreview'));
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {supabase} from '@/integrations/supabase/client';
import {COURSEWORK_BUCKET, courseworkFileError, type CourseworkFile} from '@/lib/courseworkEvidence';
import {attachmentCitation} from '@/lib/assessment/marking';

export type AttachmentReviewProps = {
 file: CourseworkFile;
 criteria?: {criterion_code: string}[];
 onCite?: (code: string, citation: string) => boolean;
};

/** Mounted only for one explicitly selected attachment, within the account/attempt boundary. */
export default function AttachmentReview({file, criteria = [], onCite}: AttachmentReviewProps) {
 const [pages,setPages]=useState(0);
 const [url, setUrl] = useState(''), [error, setError] = useState(''), [retry, setRetry] = useState(0);
 const [page, setPage] = useState('1'), [location, setLocation] = useState(''), [note, setNote] = useState('');
 const [code, setCode] = useState(criteria[0]?.criterion_code || ''), [notice, setNotice] = useState('');
 const pdf = file.mime_type === 'application/pdf';
 const image = ['image/jpeg','image/png'].includes(file.mime_type);
 const previewable = pdf || image;
 useEffect(() => {
  if (!previewable) return;
  let active = true, objectUrl = '';
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  setUrl(''); setError('');
  void (async () => {
   try {
    if (courseworkFileError({name:file.file_name,type:file.mime_type,size:file.byte_size})) throw Error('Invalid file');
    const result = await supabase.storage.from(COURSEWORK_BUCKET).download(file.storage_path, {}, {signal:controller.signal,cache:'no-store'});
    if (!active) return;
    if (result.error || !result.data || result.data.size !== file.byte_size || result.data.type !== file.mime_type) throw Error('File changed or unavailable');
    objectUrl = URL.createObjectURL(result.data);
    setUrl(objectUrl);
   } catch {
    if (active) setError('Preview unavailable or access changed. Retry, or use Download to review the original file.');
   } finally { window.clearTimeout(timeout); }
  })();
  return () => { active = false; controller.abort(); window.clearTimeout(timeout); if(objectUrl) URL.revokeObjectURL(objectUrl); };
 }, [file, previewable, retry]);
 const citation = (pdf && pages>0 && Number(page)>pages) ? null : attachmentCitation(file.file_name, pdf ? `page ${page}` : location, note, pdf ? Number(page) : undefined);
 return <section aria-label={`Review ${file.file_name}`} className="min-w-0 space-y-4 border-t pt-4">
  <h4 className="break-words font-semibold">Review: {file.file_name}</h4>
  {previewable && !url && !error && <p role="status">Loading private preview…</p>}
  {error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={()=>setRetry(x=>x+1)}>Retry preview</Button></div>}
  {pdf && <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Document page<Input className="w-28" inputMode="numeric" type="number" min={1} max={pages||100000} value={page} onChange={e=>{setPage(e.target.value);setNotice('');}}/></label><Button variant="outline" disabled={!pages||Number(page)<=1} onClick={()=>setPage(String(Math.max(1,Number(page)-1)))}>Previous page</Button><Button variant="outline" disabled={!pages||Number(page)>=pages} onClick={()=>setPage(String(Math.min(pages,Number(page)+1)))}>Next page</Button>{pages>0&&<span className="py-2 text-sm">of {pages} pages</span>}</div>}
  {url && pdf && <Suspense fallback={<p role="status">Opening PDF reader…</p>}><PdfEvidencePreview url={url} page={Number.isSafeInteger(Number(page))?Number(page):0} onPages={setPages}/></Suspense>}
  {url && image && <img src={url} alt={`Submitted evidence: ${file.file_name}`} className="max-h-[60vh] max-w-full rounded-lg border object-contain"/>}
  {!previewable && <p className="text-sm text-muted-foreground">Download this document to review its original formatting. Use a heading, paragraph or table reference below so reviewers can locate your evidence.</p>}
  {onCite && criteria.length > 0 && <div className="space-y-3">
   <p className="text-sm text-muted-foreground">Attach a reference to the criterion’s evidence field, then save your marking draft. This does not alter the student’s original file.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    {!pdf && <label className="text-sm">Document location<Input maxLength={160} placeholder={image?'e.g. Top-left diagram':'e.g. Method, paragraph 3'} value={location} onChange={e=>{setLocation(e.target.value);setNotice('');}}/></label>}
    <label className="min-w-0 text-sm">Attachment criterion<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={code} onChange={e=>{setCode(e.target.value);setNotice('');}}>{criteria.map(c=><option key={c.criterion_code}>{c.criterion_code}</option>)}</select></label>
   </div>
   <label className="block text-sm">Evidence quotation or observation<Textarea maxLength={700} value={note} onChange={e=>{setNote(e.target.value);setNotice('');}} placeholder="Quote the relevant evidence or describe what this part demonstrates."/></label>
   {citation && <p className="whitespace-pre-wrap break-words rounded-lg bg-secondary/30 p-3 text-sm [overflow-wrap:anywhere]">{citation}</p>}
   <Button variant="outline" disabled={!citation||!criteria.some(c=>c.criterion_code===code)} onClick={()=>{if(citation&&onCite(code,citation))setNotice(`Reference added to ${code}. Save your marking draft to keep it.`);}}>Use attachment reference</Button>
   {!citation && <p className="text-sm text-muted-foreground">Enter a valid location and at least three characters of evidence. The complete reference must fit within 900 characters.</p>}
   <p role="status" className="text-sm">{notice}</p>
  </div>}
 </section>;
}
