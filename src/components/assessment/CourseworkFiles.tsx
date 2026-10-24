import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import NativeCapture from '@/components/native/NativeCapture';
import {COURSEWORK_BUCKET,courseworkFileError,type CourseworkFile} from '@/lib/courseworkEvidence';
type Props={briefId?:string;attemptId?:string;disabled?:boolean;onFiles?:(ids:string[])=>void;onBusy?:(busy:boolean)=>void};
export default function CourseworkFiles({briefId,attemptId,disabled,onFiles,onBusy}:Props){
 const {user}=useAuth();const [files,setFiles]=useState<CourseworkFile[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState<File|null>(null);
 const identity=`${user?.id}:${user?.tenantId}:${briefId}:${attemptId}`;
 const [loadedIdentity,setLoadedIdentity]=useState('');
 const visible=loadedIdentity===identity?files:[];
 useEffect(()=>{let active=true;setFiles([]);setLoading(true);onFiles?.([]);onBusy?.(true);
 let q=db.from('unipathway_coursework_uploads').select('id,file_name,mime_type,byte_size,storage_path,attempt_id');
 q=attemptId?q.eq('attempt_id',attemptId):q.eq('brief_id',briefId).eq('student_id',user?.id).is('attempt_id',null);
 void Promise.resolve(q.order('created_at')).then(r=>{if(!active)return;if(r.error)throw r.error;const rows:CourseworkFile[]=r.data||[];setFiles(rows);setLoadedIdentity(identity);onFiles?.(rows.map(f=>f.id));onBusy?.(false);}).catch(()=>{if(active)setError('Attachments could not be loaded. Retry before submitting.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 // Callbacks update parent state; identity and refresh are the request scope.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[identity,refresh]);
 function pending(value:boolean){setBusy(value);onBusy?.(value);}
 async function upload(){if(!selected||!briefId)return;const invalid=courseworkFileError(selected);if(invalid){setError(invalid);return;}pending(true);setError('');
 try{const reservation=await db.rpc('reserve_unipathway_coursework_file',{p_brief:briefId,p_name:selected.name,p_mime:selected.type,p_size:selected.size});if(reservation.error)throw reservation.error;
 const row=reservation.data as CourseworkFile;const result=await supabase.storage.from(COURSEWORK_BUCKET).upload(row.storage_path,selected,{contentType:selected.type,upsert:false});if(result.error)throw result.error;
 setSelected(null);setRefresh(x=>x+1);
 }catch{setError('Upload could not be confirmed. Refresh the attachment list; remove any incomplete file before retrying.');setRefresh(x=>x+1);}finally{pending(false);}}
 async function remove(file:CourseworkFile){pending(true);setError('');try{const r=await supabase.storage.from(COURSEWORK_BUCKET).remove([file.storage_path]);if(r.error)throw r.error;const d=await db.rpc('discard_unipathway_coursework_file',{p_upload:file.id});if(d.error)throw d.error;setRefresh(x=>x+1);}catch{setError('Removal was not confirmed. Refresh and retry. Submitted evidence cannot be removed.');}finally{pending(false);}}
 async function download(file:CourseworkFile){pending(true);setError('');try{const r=await supabase.storage.from(COURSEWORK_BUCKET).download(file.storage_path);if(r.error||!r.data)throw r.error;const url=URL.createObjectURL(r.data);const link=document.createElement('a');link.href=url;link.download=file.file_name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('File unavailable or permission changed. Refresh and contact your centre if this continues.');}finally{pending(false);}}
 return <section className="my-4 space-y-3 rounded-lg border p-4"><h3 className="font-semibold">{attemptId?'Submitted attachments':'Assignment attachments'}</h3>
 {loading&&<p role="status">Loading attachments…</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 {!loading&&!error&&!visible.length&&<p className="text-sm text-muted-foreground">No attachments.</p>}
 <ul className="space-y-2">{visible.map(f=><li key={f.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 break-words text-sm">{f.file_name} · {(f.byte_size/1024/1024).toFixed(1)} MB</span><Button size="sm" variant="outline" disabled={busy||disabled} onClick={()=>void download(f)}>Download</Button>{!attemptId&&<Button size="sm" variant="outline" disabled={busy||disabled} onClick={()=>void remove(f)}>Remove</Button>}</li>)}</ul>
 {!attemptId&&<><p className="text-xs text-muted-foreground">Up to five files, 20 MB each: PDF, DOCX, JPG or PNG. Uploads become part of your evidence only when you submit the assignment. Add a written explanation of at least 30 characters.</p><input aria-label="Choose assignment attachment" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" disabled={busy||disabled||visible.length>=5} onChange={e=>{setSelected(e.target.files?.[0]||null);e.target.value='';}}/><NativeCapture disabled={busy||disabled||visible.length>=5} onFile={setSelected}/>{selected&&<p className="text-sm">Selected: {selected.name}</p>}<Button disabled={!selected||busy||disabled||loading||visible.length>=5} onClick={()=>void upload()}>Upload selected file</Button></>}
 <Button variant="outline" disabled={busy||disabled} onClick={()=>{setError('');setRefresh(x=>x+1);}}>Refresh attachments</Button>
 </section>;
}
