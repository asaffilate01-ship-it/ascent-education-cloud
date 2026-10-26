import {uploadCourseworkResumable,matchesCourseworkReservation} from '@/lib/learning/resumableCoursework';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import NativeCapture from '@/components/native/NativeCapture';
import {COURSEWORK_BUCKET,courseworkFileError,type CourseworkFile} from '@/lib/courseworkEvidence';
type Props={briefId?:string;attemptId?:string;disabled?:boolean;onFiles?:(ids:string[])=>void;onBusy?:(busy:boolean)=>void};
export default function CourseworkFiles(props:Props){
 const {user}=useAuth();
 return <AttachmentWorkspace key={`${user?.id}:${user?.tenantId}:${props.briefId}:${props.attemptId}`} {...props}/>;
}
function AttachmentWorkspace({briefId,attemptId,disabled,onFiles,onBusy}:Props){
 const {user}=useAuth();const [files,setFiles]=useState<CourseworkFile[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState<File|null>(null);
 const [resumeTarget,setResumeTarget]=useState<CourseworkFile|null>(null),[uploadPercent,setUploadPercent]=useState<number|null>(null);
 const uploadAbort=useRef<AbortController|null>(null);
 const mounted=useRef(true),verified=useRef(false),operation=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;uploadAbort.current?.abort();};},[]);
 const identity=`${user?.id}:${user?.tenantId}:${briefId}:${attemptId}`;
 const [loadedIdentity,setLoadedIdentity]=useState('');
 const visible=loadedIdentity===identity?files:[];
 useEffect(()=>{let active=true;verified.current=false;setFiles([]);setLoading(true);onFiles?.([]);onBusy?.(true);
 let q=db.from('unipathway_coursework_uploads').select('id,file_name,mime_type,byte_size,storage_path,attempt_id');
 q=attemptId?q.eq('attempt_id',attemptId):q.eq('brief_id',briefId).eq('student_id',user?.id).is('attempt_id',null);
 void Promise.resolve(q.order('created_at')).then(r=>{if(!active)return;if(r.error||!Array.isArray(r.data))throw Error('Unavailable');const rows:CourseworkFile[]=r.data;setFiles(rows);setLoadedIdentity(identity);onFiles?.(rows.map(f=>f.id));verified.current=true;onBusy?.(operation.current);}).catch(()=>{if(active)setError('Attachments could not be loaded. Retry before submitting.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 // Callbacks update parent state; identity and refresh are the request scope.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[identity,refresh]);
 function pending(value:boolean){operation.current=value;if(!mounted.current)return;setBusy(value);onBusy?.(value||!verified.current);}
 function recheck(){if(!mounted.current)return;verified.current=false;setLoading(true);setFiles([]);onFiles?.([]);onBusy?.(true);setRefresh(x=>x+1);}
 async function upload(){if(!selected||!briefId||!user||operation.current||!verified.current||disabled)return;const invalid=courseworkFileError(selected);if(invalid){setError(invalid);return;}if(resumeTarget&&!matchesCourseworkReservation(selected,resumeTarget)){setError('Select the original file with the reserved type and size.');return;}pending(true);verified.current=false;setError('');setUploadPercent(0);
 try{let row=resumeTarget;
 if(!row){const reservation=await db.rpc('reserve_unipathway_coursework_file',{p_brief:briefId,p_name:selected.name,p_mime:selected.type,p_size:selected.size});if(!mounted.current)return;if(reservation.error)throw reservation.error;row=reservation.data as CourseworkFile;setResumeTarget(row);}
 const controller=new AbortController();uploadAbort.current=controller;
 await uploadCourseworkResumable(selected,row,user.id,controller.signal,p=>{if(mounted.current)setUploadPercent(p);});if(!mounted.current)return;
 setSelected(null);setResumeTarget(null);setUploadPercent(null);recheck();
 }catch(e){if(!mounted.current)return;setError(e instanceof Error?e.message:'Upload could not be confirmed. Re-select the original file and resume, or refresh to check its status.');recheck();}finally{uploadAbort.current=null;pending(false);}}
 async function remove(file:CourseworkFile){if(operation.current||disabled||attemptId)return;pending(true);verified.current=false;setError('');try{const r=await supabase.storage.from(COURSEWORK_BUCKET).remove([file.storage_path]);if(!mounted.current)return;if(r.error)throw r.error;const d=await db.rpc('discard_unipathway_coursework_file',{p_upload:file.id});if(!mounted.current)return;if(d.error)throw d.error;if(resumeTarget?.id===file.id){setResumeTarget(null);setUploadPercent(null);}recheck();}catch{if(!mounted.current)return;recheck();setError('Removal was not confirmed. Refresh and retry. Submitted evidence cannot be removed.');}finally{pending(false);}}
 async function download(file:CourseworkFile){if(operation.current||disabled)return;pending(true);setError('');try{const r=await supabase.storage.from(COURSEWORK_BUCKET).download(file.storage_path);if(!mounted.current)return;if(r.error||!r.data)throw r.error;const url=URL.createObjectURL(r.data);const link=document.createElement('a');link.href=url;link.download=file.file_name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{if(!mounted.current)return;setError('File unavailable or permission changed. Refresh and contact your centre if this continues.');}finally{pending(false);}}
 return <section className="my-4 space-y-3 rounded-lg border p-4"><h3 className="font-semibold">{attemptId?'Submitted attachments':'Assignment attachments'}</h3>
 {loading&&<p role="status">Loading attachments…</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 {!loading&&!error&&!visible.length&&<p className="text-sm text-muted-foreground">No attachments.</p>}
 <ul className="space-y-2">{visible.map(f=><li key={f.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 break-words text-sm">{f.file_name} · {(f.byte_size/1024/1024).toFixed(1)} MB</span><Button size="sm" variant="outline" disabled={busy||loading||disabled} onClick={()=>void download(f)}>Download</Button>{!attemptId&&<><Button size="sm" variant="outline" disabled={busy||loading||disabled} onClick={()=>{setResumeTarget(f);setSelected(null);setError('');setUploadPercent(null);}}>Resume with original file</Button><Button size="sm" variant="outline" disabled={busy||loading||disabled} onClick={()=>void remove(f)}>Remove</Button></>}</li>)}</ul>
 {!attemptId&&<><p className="text-xs text-muted-foreground">Up to five files, 20 MB each: PDF, DOCX, JPG or PNG. Uploads become part of your evidence only when you submit the assignment. Add a written explanation of at least 30 characters. Interrupted uploads can resume with the original file within 24 hours. Signing out clears this device’s resume history.</p><input aria-label="Choose assignment attachment" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" disabled={busy||loading||disabled||!verified.current||(visible.length>=5&&!resumeTarget)} onChange={e=>{setSelected(e.target.files?.[0]||null);e.target.value='';}}/><NativeCapture disabled={busy||loading||disabled||!verified.current||(visible.length>=5&&!resumeTarget)} onFile={file=>{if(mounted.current&&!operation.current)setSelected(file);}}/>{resumeTarget&&<p className="text-sm">Resuming: {resumeTarget.file_name}. Choose the same original file. Completed files cannot be overwritten.</p>}{selected&&<p className="text-sm">Selected: {selected.name}</p>}<Button disabled={!selected||busy||disabled||loading||!verified.current||(visible.length>=5&&!resumeTarget)} onClick={()=>void upload()}>{resumeTarget?'Resume upload':'Upload selected file'}</Button>{busy&&uploadPercent!==null&&<div role="status" className="space-y-2"><label className="block">Uploading · {uploadPercent}%<progress aria-label="Assignment upload progress" className="block w-full" max={100} value={uploadPercent}/></label><Button variant="outline" onClick={()=>uploadAbort.current?.abort()}>Pause upload</Button></div>}</>}
 <Button variant="outline" disabled={busy||loading||disabled} onClick={()=>{setError('');recheck();}}>Refresh attachments</Button>
 </section>;
}
