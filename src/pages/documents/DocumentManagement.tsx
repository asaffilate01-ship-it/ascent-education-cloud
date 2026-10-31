import {useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Card,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {FileText,Eye,Search,Clock,CheckCircle2,Pen,FolderOpen} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {toast} from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';

const ALLOWED=['student','admissions_admin','centre_director','superadmin'] as const;
const EXTENSIONS=['pdf','doc','docx','jpg','jpeg','png'];
const MAX_BYTES=20*1024*1024;
type DocumentTab='all'|'pending'|'verified'|'signed';
export default function DocumentManagement(){
 const {user}=useAuth();
 return <ScopedDocuments key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function ScopedDocuments(){
 const {user}=useAuth();
 const roleAllowed=!!user&&Array.isArray(user.roles)&&user.roles.includes(user.role)&&ALLOWED.some(role=>role===user.role);
 const isStudent=user?.role==='student';
 const enabled=roleAllowed&&!!user?.tenantId;
 const [search,setSearch]=useState('');
 const [tab,setTab]=useState<DocumentTab>('all');
 const [uploading,setUploading]=useState(false);
 const [opening,setOpening]=useState<string|null>(null);
 const scope=[
  {column:'tenant_id',operator:'eq' as const,value:user?.tenantId||''},
  ...(isStudent?[{column:'user_id',operator:'eq' as const,value:user?.id||''}]:[])
 ];
 const documents=useSupabaseQuery('kyc_documents',{enabled,filters:scope,orderBy:{column:'created_at',ascending:false}});
 const signatures=useSupabaseQuery('e_signatures',{enabled,filters:scope,orderBy:{column:'signed_at',ascending:false}});
 const authorised=(owner:string,tenant:string|null)=>!!enabled&&tenant===user?.tenantId&&(!isStudent||owner===user?.id);
 const rows=useMemo(()=>{
  const docs=documents.data.filter(d=>authorised(d.user_id,d.tenant_id));
  const signed=signatures.data.filter(d=>authorised(d.user_id,d.tenant_id)).map(d=>({
   id:d.id,document_type:d.document_type,file_name:'Signed: '+d.document_type,
   status:'signed',created_at:d.signed_at,file_url:null as string|null,
  }));
  const available=tab==='signed'?signed:docs.filter(d=>tab==='all'||d.status===tab);
  const term=search.trim().toLocaleLowerCase();
  return !term?available:available.filter(d=>
   [d.file_name||'',d.document_type||''].join(' ').toLocaleLowerCase().includes(term));
 // Role/account or query results are always a new component instance after a context switch.
 },[documents.data,signatures.data,tab,search,enabled,isStudent,user?.id,user?.tenantId]);
 const loading=documents.loading||signatures.loading;
 const error=documents.error||signatures.error;
 async function upload(event:React.ChangeEvent<HTMLInputElement>){
  const file=event.currentTarget.files?.[0];event.currentTarget.value='';
  if(!file||!enabled||!user?.tenantId||uploading)return;
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(!EXTENSIONS.includes(ext)||file.size===0||file.size>MAX_BYTES){
   toast.error('Choose a PDF, Word document or JPG/PNG under 20 MB.');return;
  }
  setUploading(true);
  const path=user.id+'/'+crypto.randomUUID()+'.'+ext;
  try{
   const stored=await supabase.storage.from('kyc-documents').upload(path,file,{upsert:false});
   if(stored.error)throw stored.error;
   const saved=await supabase.from('kyc_documents').insert({
    user_id:user.id,tenant_id:user.tenantId,document_type:'general',
    file_name:file.name.slice(0,255),file_url:path,status:'pending',
   });
   if(saved.error){
    // A failed metadata write must not silently leave a private orphan upload.
    await supabase.storage.from('kyc-documents').remove([path]).catch(()=>{});
    throw saved.error;
   }
   toast.success('Document received for centre verification.');
   void documents.refetch();
  }catch{
   toast.error('Upload could not be confirmed. Check your permissions and try again.');
  }finally{setUploading(false);}
 }
 async function openPrivate(path:string,id:string){
  if(opening||!enabled)return;
  setOpening(id);
  try{
   const res=await supabase.storage.from('kyc-documents').createSignedUrl(path,300);
   if(res.error||!res.data?.signedUrl)throw Error('Private file unavailable');
   const link=document.createElement('a');link.href=res.data.signedUrl;link.target='_blank';link.rel='noopener noreferrer';link.click();
  }catch{toast.error('Private file access could not be verified.');}finally{setOpening(null);}
 }
 return <DashboardLayout title="Private documents" subtitle="Your centre-controlled identity documents and signed records"
  actions={enabled?<label className="block max-w-xs text-xs font-semibold">Upload your document
   <input aria-label="Choose private document" type="file" disabled={uploading}
    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
    onChange={e=>void upload(e)}
    className="mt-2 block w-full min-h-11 rounded-lg border bg-card p-2 text-sm font-normal"
   />
   <span className="mt-1 block text-xs font-normal text-muted-foreground">{uploading?'Uploading and verifying…':'PDF, Word, JPG or PNG · maximum 20 MB'}</span>
  </label>:undefined}>
  {!enabled&&<p role="alert">A verified student, admissions or centre leadership role with an assigned centre is required to open private documents.</p>}
  {enabled&&<div className="space-y-5">
   <section className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">Student records are restricted to their own centre and account. Authorised admissions or centre staff must also have server-side document permissions. Identity files are not publicly shared.</p></section>
   {loading&&<p role="status">Verifying private documents and signatures…</p>}
   {error&&<div role="alert" className="space-y-3 rounded-lg border border-destructive p-4"><p>Private document records could not be verified. No documents will be shown until the read succeeds.</p><Button variant="outline" onClick={()=>{void documents.refetch();void signatures.refetch();}}>Retry document verification</Button></div>}
   {!loading&&!error&&<>
    <label className="block max-w-lg text-sm font-medium">Search private documents
     <span className="relative mt-2 block"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>
      <Input type="search" aria-label="Search private documents" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Document name or type" className="min-h-11 pl-9"/>
     </span>
    </label>
    <Tabs value={tab} onValueChange={value=>setTab(value as DocumentTab)}>
     <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1">
      <TabsTrigger className="min-h-11" value="all"><FolderOpen className="mr-1 size-4"/>All</TabsTrigger>
      <TabsTrigger className="min-h-11" value="pending"><Clock className="mr-1 size-4"/>Pending</TabsTrigger>
      <TabsTrigger className="min-h-11" value="verified"><CheckCircle2 className="mr-1 size-4"/>Verified</TabsTrigger>
      <TabsTrigger className="min-h-11" value="signed"><Pen className="mr-1 size-4"/>E-signed</TabsTrigger>
     </TabsList>
     <TabsContent value={tab} className="space-y-3">
      <p role="status" className="text-sm text-muted-foreground">{rows.length} authorised records match this view.</p>
      {!rows.length&&<div className="rounded-lg border p-6 text-sm text-muted-foreground">No verified records match these filters. Try another search, or upload a document if you have permission.</div>}
      {rows.map(d=><Card key={d.id}><CardContent className="flex min-w-0 flex-wrap items-center gap-3 p-4">
       <FileText className="size-5 shrink-0 text-primary"/>
       <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold">{d.file_name||d.document_type}</p>
        <p className="text-xs text-muted-foreground">{d.document_type} · {new Date(d.created_at).toLocaleDateString('en-PK',{timeZone:'Asia/Karachi'})}</p>
       </div>
       <StatusBadge status={d.status} variant={['verified','signed'].includes(d.status)?'success':d.status==='rejected'?'danger':'warning'}/>
       {d.file_url&&<Button variant="outline" className="min-h-11" disabled={opening!==null} aria-label={'Open private '+(d.file_name||d.document_type)} onClick={()=>void openPrivate(d.file_url!,d.id)}><Eye className="mr-2 size-4"/>{opening===d.id?'Checking…':'Open'}</Button>}
      </CardContent></Card>)}
     </TabsContent>
    </Tabs>
   </>}
  </div>}
 </DashboardLayout>;
}
