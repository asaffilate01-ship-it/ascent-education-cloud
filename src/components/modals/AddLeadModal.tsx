import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useToast} from '@/hooks/use-toast';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';

type Programme={id:string;title:string;status:string;tenant_id:string};
export default function AddLeadModal({open,onOpenChange,onCreated}:{
 open:boolean;onOpenChange:(value:boolean)=>void;onCreated?:()=>void;
}){
 const {user}=useAuth(),{toast}=useToast();
 const centre=user?.tenantId||'';
 const authorised=Boolean(user?.id&&centre&&user?.role&&['admissions_admin','centre_director'].includes(user.role)&&user.roles?.includes(user.role));
 const [loading,setLoading]=useState(false),[fetching,setFetching]=useState(false),[error,setError]=useState('');
 const [programmes,setProgrammes]=useState<Programme[]>([]);
 const [form,setForm]=useState({studentName:'',phone:'',email:'',programmeId:'',interest:'',source:'Website',notes:''});
 useEffect(()=>{
  let active=true;setProgrammes([]);setError('');
  if(!open||!authorised){setFetching(false);return()=>{active=false;};}
  setFetching(true);
  void(async()=>{
   try{
    const {data,error:e}=await supabase.from('programmes').select('id,title,status,tenant_id')
     .eq('tenant_id',centre).eq('status','active').order('title').limit(100);
    if(e||!Array.isArray(data))throw Error('Current centre programmes cannot be verified');
    if(active)setProgrammes(data as Programme[]);
   }catch{if(active)setError('Programme catalogue could not be verified. Refresh this form before assigning an applicant.');}
   finally{if(active)setFetching(false);}
  })();
  return()=>{active=false;};
 },[open,authorised,centre]);
 const update=(key:keyof typeof form,value:string)=>setForm(prev=>({...prev,[key]:value}));
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!authorised||loading||fetching||error)return;
  const selected=programmes.find(p=>p.id===form.programmeId&&p.tenant_id===centre&&p.status==='active');
  const interest=selected?.title||form.interest.trim();
  if(form.studentName.trim().length<2||!form.email.trim()||!interest){setError('Provide the learner name, valid email address and an existing programme or named preparation service.');return;}
  setLoading(true);setError('');
  try{
   const {data,error:e}=await supabase.from('applications').insert({
    tenant_id:centre,student_name:form.studentName.trim(),email:form.email.trim().toLowerCase(),
    phone:form.phone.trim()||null,programme_id:selected?.id||null,programme_name:interest,
    stage:'lead',source:form.source,notes:form.notes.trim()||null,
   }).select('id,tenant_id,stage').single();
   if(e||!data?.id||data.tenant_id!==centre||data.stage!=='lead')throw Error('Lead creation was not confirmed. Check the pipeline for a possible existing record.');
   setForm({studentName:'',phone:'',email:'',programmeId:'',interest:'',source:'Website',notes:''});
   toast({title:'Lead recorded',description:'The enquiry is saved to this centre. Qualification and eligibility must be reviewed before any offer.'});
   onOpenChange(false);onCreated?.();
  }catch(e){
   const message=e instanceof Error?e.message:'Lead creation was not confirmed.';
   setError(message);toast({title:'Lead not confirmed',description:message,variant:'destructive'});
  }finally{setLoading(false);}
 }
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg">
  <DialogHeader><DialogTitle>Record a new enquiry</DialogTitle>
   <DialogDescription>Capture verified contact details and a current centre programme or a preparation service. No student account or formal enrolment is created.</DialogDescription></DialogHeader>
  {!authorised?<p role="alert">An assigned Admissions Admin or Centre Director role is required.</p>:
  <form onSubmit={submit} className="space-y-4">
   {fetching&&<p role="status">Checking eligible centre programmes…</p>}
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-medium">Student full name
     <Input className="mt-1" required minLength={2} maxLength={120} value={form.studentName} onChange={e=>update('studentName',e.target.value)}/>
    </label>
    <label className="text-sm font-medium">Phone (optional)
     <Input className="mt-1" inputMode="tel" maxLength={40} value={form.phone} onChange={e=>update('phone',e.target.value)}/>
    </label>
   </div>
   <label className="block text-sm font-medium">Student email address
    <Input className="mt-1" required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={e=>update('email',e.target.value)}/>
   </label>
   <label className="block text-sm font-medium">Existing centre programme (optional)
    <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={form.programmeId}
     onChange={e=>{update('programmeId',e.target.value);setError('');}}>
     <option value="">Preparation service or course enquiry</option>
     {programmes.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
   </label>
   {!form.programmeId&&<label className="block text-sm font-medium">Interested service or subject
    <Input className="mt-1" required maxLength={160} placeholder="IELTS preparation, German A2, Python coding, FSc tuition…" value={form.interest} onChange={e=>update('interest',e.target.value)}/>
    <span className="block mt-1 text-xs text-muted-foreground">This is an enquiry only; it does not automatically authorise a new awarding-body qualification.</span>
   </label>}
   <label className="block text-sm font-medium">Lead source
    <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={form.source} onChange={e=>update('source',e.target.value)}>
     {['Website','WhatsApp','Walk-in','Facebook Ad','Instagram','Agent Referral','Webinar','Phone'].map(x=><option key={x}>{x}</option>)}
    </select>
   </label>
   <label className="block text-sm font-medium">Counselling notes (optional)
    <Input className="mt-1" maxLength={500} value={form.notes} onChange={e=>update('notes',e.target.value)}/>
   </label>
   <div className="flex justify-end gap-2">
    <Button type="button" variant="outline" disabled={loading} onClick={()=>onOpenChange(false)}>Cancel</Button>
    <Button type="submit" disabled={loading||fetching||!!error||(!form.programmeId&&!form.interest.trim())}>{loading?'Recording…':'Save lead'}</Button>
   </div>
  </form>}
 </DialogContent></Dialog>;
}
