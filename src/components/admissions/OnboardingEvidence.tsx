import {useMemo,useRef,useState} from 'react';
import {FileText,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {supabase} from '@/integrations/supabase/client';
import {evidenceExtension,latestOwnEvidence,requiredEvidenceProgress,maySubmitEvidence,type EvidenceRequirement} from '@/lib/onboardingEvidence';

const labels:Record<string,string>={verified:'Verified',pending:'Awaiting review',uploaded:'Awaiting review',rejected:'Changes required',expired:'Expired'};
export default function OnboardingEvidence({kind,requirements}:{kind:'student'|'lecturer';requirements:readonly EvidenceRequirement[]}){
 const {user}=useAuth();
 return <ScopedEvidence key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(','),kind].join(':')} kind={kind} requirements={requirements}/>;
}
function ScopedEvidence({kind,requirements}:{kind:'student'|'lecturer';requirements:readonly EvidenceRequirement[]}){
 const {user,loading:authLoading}=useAuth();
 const uid=user?.id||'',tenant=user?.tenantId||'';
 const enabled=!authLoading&&!!uid&&!!tenant&&user?.role===kind&&user.roles?.includes(kind)===true;
 const docs=useSupabaseQuery('kyc_documents',{enabled,select:'id,user_id,tenant_id,document_type,status,created_at,file_name,rejection_reason',filters:[{column:'tenant_id',operator:'eq',value:tenant},{column:'user_id',operator:'eq',value:uid}],orderBy:{column:'created_at',ascending:false}});
 const [uploading,setUploading]=useState<string|null>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[needsReview,setNeedsReview]=useState(false);
 const lock=useRef(false);
 const verified=useMemo(()=>{try{return {latest:latestOwnEvidence(docs.data,uid,tenant),invalid:false};}catch{return {latest:new Map(),invalid:true};}},[docs.data,uid,tenant]);
 const unavailable=!!docs.error||verified.invalid;
 const progress=requiredEvidenceProgress(requirements,verified.latest);
 async function upload(type:string,file:File){
  if(!enabled||docs.loading||unavailable||needsReview||lock.current||!requirements.some(r=>r.type===type)||!maySubmitEvidence(verified.latest.get(type)?.status))return;
  setError('');setMessage('');
  const ext=evidenceExtension(file);
  if(!ext){setError('Choose a non-empty PDF, Word document, JPG or PNG up to 20 MB with a matching file type.');return;}
  lock.current=true;setUploading(type);
  const recordId=crypto.randomUUID(),path=uid+'/'+crypto.randomUUID()+'.'+ext;
  try{
   const stored=await supabase.storage.from('kyc-documents').upload(path,file,{upsert:false});
   if(stored.error)throw Error('Storage upload not confirmed');
   // Preserve previous reviewed evidence. New submissions start pending.
   const saved=await supabase.from('kyc_documents').insert({id:recordId,user_id:uid,tenant_id:tenant,document_type:type,file_name:file.name.slice(0,255),file_url:path,status:'pending'}).select('id,user_id,tenant_id,status').single();
   if(saved.error){
    // Only a definitive SQL rejection can safely trigger compensating deletion.
    if(/^(22|23|42)\w{3}$/.test(saved.error.code||'')){
     try{await supabase.storage.from('kyc-documents').remove([path]);}catch{/* staff reconcile unlinked objects */}
    }
    throw Error('Metadata save not confirmed');
   }
   if(saved.data?.id!==recordId||saved.data?.tenant_id!==tenant||saved.data?.user_id!==uid||saved.data?.status!=='pending')throw Error('Unexpected document receipt');
   setMessage('Document received for verification. It has not yet been approved.');
   await docs.refetch();
  }catch{
   setNeedsReview(true);
   setError('Document submission could not be confirmed. Refresh the records before trying again. Contact the centre if a file remains unlinked.');
  }finally{lock.current=false;setUploading(null);}
 }
 if(authLoading)return <p role="status">Checking document permissions…</p>;
 if(!enabled)return <p role="alert">A verified {kind} account with an assigned centre is required for personal evidence.</p>;
 return <section className="space-y-4 min-w-0" aria-label="Personal document evidence">
  <div className="rounded-xl border bg-card p-3 sm:p-5 space-y-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck aria-hidden="true" className="size-5 shrink-0"/>Identity & qualification evidence</h2><p className="text-sm text-muted-foreground">Upload documents only for your own account. Submitted files require a separate authorised review. Do not upload biometric templates, passwords or unrelated personal documents.</p>
   {docs.loading?<p role="status">Checking submitted documents…</p>:unavailable?<p role="alert">Document records could not be verified. Uploads and progress are unavailable until the read succeeds.</p>:<><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border p-3 min-w-0"><p className="text-sm text-muted-foreground">Required evidence received</p><p className="text-xl font-semibold tabular-nums">{progress.received}/{progress.required}</p></div><div className="rounded-lg border p-3 min-w-0"><p className="text-sm text-muted-foreground">Required evidence verified</p><p className="text-xl font-semibold tabular-nums">{progress.verified}/{progress.required}</p></div></div><progress className="block w-full accent-primary" aria-label="Required evidence verified" max={progress.required||1} value={progress.verified}/></>}
   <Button type="button" variant="outline" disabled={docs.loading||uploading!==null} onClick={()=>{setNeedsReview(false);setError('');void docs.refetch();}}>Refresh document records</Button>
   {error&&<p role="alert" className="text-sm text-destructive [overflow-wrap:anywhere]">{error}</p>}{message&&<p role="status" className="text-sm">{message}</p>}
  </div>
  {!docs.loading&&!unavailable&&<div className="grid gap-3 md:grid-cols-2">{requirements.map(req=>{
   const record=verified.latest.get(req.type),status=record?.status;
   const canUpload=maySubmitEvidence(status);
   return <article className="min-w-0 rounded-xl border bg-card p-3 sm:p-4 space-y-3" key={req.type}>
    <div className="flex gap-3 items-start"><FileText className="size-5 mt-0.5 shrink-0 text-primary" aria-hidden="true"/><div className="min-w-0 flex-1 [overflow-wrap:anywhere]"><h3 className="font-semibold">{req.label}</h3><p className="mt-1 text-xs text-muted-foreground">{req.required?'Required evidence':'Where applicable'} · {status?labels[status]||'Review required':'Not submitted'}</p></div></div>
    <p className="text-sm text-muted-foreground">{req.description}</p>
    {record?.file_name&&<p className="text-sm break-all">{record.file_name}</p>}{status==='rejected'&&record?.rejection_reason&&<p className="text-sm text-destructive [overflow-wrap:anywhere]">Reviewer feedback: {record.rejection_reason}</p>}
    {canUpload?<label className="block min-w-0 text-sm font-medium">{record?'Submit replacement evidence':'Choose evidence file'}<input type="file" aria-label={'Upload '+req.label} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={uploading!==null||needsReview} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(f)void upload(req.type,f);}} className="mt-1 block w-full min-h-11 min-w-0 rounded-lg border bg-background p-2 text-sm file:mr-2 file:max-w-full file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"/><span className="block mt-1 text-xs font-normal text-muted-foreground">{uploading===req.type?'Uploading and recording…':'PDF, Word or JPG/PNG · maximum 20 MB'}</span></label>:<p className="text-xs text-muted-foreground">Contact the centre if this record needs to be replaced or corrected.</p>}
   </article>;
  })}</div>}
  <p className="text-sm text-muted-foreground">Document verification is separate from application screening, enrolment, appointment and external identity services. The centre confirms which evidence is applicable to your programme or teaching role.</p>
 </section>;
}
