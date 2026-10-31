import {useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Heart,Shield,AlertTriangle,Stethoscope,Save} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import type {Tables} from '@/integrations/supabase/types';
import {toast} from 'sonner';

const BLOOD_GROUPS=['A+','A-','B+','B-','AB+','AB-','O+','O-'];
type HealthRecord=Tables<'health_records'>;
const STAFF_ROLES=['welfare_officer','centre_director','superadmin'] as const;
const blank=()=>({
 blood_group:'',allergies:'',medical_conditions:'',medications:'',
 emergency_contact_name:'',emergency_contact_phone:'',emergency_contact_relationship:'',
 doctor_name:'',doctor_phone:'',insurance_provider:'',insurance_number:'',notes:'',last_checkup_date:'',
});
function formFromRecord(record:HealthRecord|null){
 if(!record)return blank();
 return {
  blood_group:record.blood_group||'',allergies:(record.allergies||[]).join(', '),
  medical_conditions:(record.medical_conditions||[]).join(', '),
  medications:(record.medications||[]).join(', '),
  emergency_contact_name:record.emergency_contact_name||'',
  emergency_contact_phone:record.emergency_contact_phone||'',
  emergency_contact_relationship:record.emergency_contact_relationship||'',
  doctor_name:record.doctor_name||'',doctor_phone:record.doctor_phone||'',
  insurance_provider:record.insurance_provider||'',insurance_number:record.insurance_number||'',
  notes:record.notes||'',last_checkup_date:record.last_checkup_date||'',
 };
}
export default function HealthRecords(){
 const {user}=useAuth();
 // Remount all patient selections and unsaved form values when account, centre or role changes.
 return <HealthWorkspace key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function HealthWorkspace(){
 const {user}=useAuth();
 const isStudent=user?.role==='student';
 const isStaff=!!user&&STAFF_ROLES.some(role=>role===user.role);
 const ready=!!user?.id&&!!user.tenantId&&(isStudent||isStaff);
 const [selectedStudent,setSelectedStudent]=useState('');
 const scope=[{column:'tenant_id',operator:'eq' as const,value:user?.tenantId||''}];
 const enrolments=useSupabaseQuery('student_enrolments',{
  enabled:ready&&isStaff,filters:[...scope,{column:'status',operator:'eq',value:'active'}],
 });
 const profiles=useSupabaseQuery('profiles',{enabled:ready&&isStaff,filters:scope});
 const enrolled=new Set(enrolments.data.map(row=>row.student_id));
 const choices=profiles.data.filter(p=>p.user_id&&enrolled.has(p.user_id));
 const target=isStudent?user!.id:selectedStudent;
 const authorisedTarget=isStudent?target===user?.id:!!target&&choices.some(p=>p.user_id===target);
 const records=useSupabaseQuery('health_records',{
  enabled:ready&&authorisedTarget,
  filters:[...scope,{column:'student_id',operator:'eq',value:target||''}],
 });
 const loading=records.loading||(isStaff&&(enrolments.loading||profiles.loading));
 const error=records.error||(isStaff&&(enrolments.error||profiles.error));
 const selectedRecord=records.data.find(r=>r.student_id===target&&r.tenant_id===user?.tenantId)||null;
 return <DashboardLayout title="Health Records" subtitle="Private medical information and emergency contacts">
  <section className="mb-5 rounded-xl border bg-card p-4">
   <h2 className="flex items-center gap-2 font-semibold"><Shield className="size-4"/>Private health record access</h2>
   <p className="mt-2 text-sm text-muted-foreground">Students can view and update their own centre record. Welfare staff and centre leaders may work only with enrolled learners at their assigned centre, subject to server permissions. Do not share confidential health details in general messages.</p>
  </section>
  {!ready&&<p role="alert">A verified student or welfare/centre leadership role with a centre assignment is required.</p>}
  {ready&&isStaff&&<div className="mb-5 max-w-md space-y-2">
   <Label htmlFor="health-student-select">Select an enrolled student at this centre</Label>
   <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={loading||!!error}>
    <SelectTrigger id="health-student-select" aria-label="Select enrolled student at this centre" className="min-h-11"><SelectValue placeholder="Choose an enrolled student"/></SelectTrigger>
    <SelectContent>{choices.map(p=><SelectItem key={p.user_id} value={p.user_id}>{p.full_name||'Student'} ({p.user_id.slice(0,8)})</SelectItem>)}</SelectContent>
   </Select>
   {!loading&&!error&&!choices.length&&<p className="text-sm text-muted-foreground">No authorised active enrolments were found. Check your centre assignment.</p>}
  </div>}
  {ready&&loading&&<p role="status">Verifying the selected student's private health record…</p>}
  {ready&&error&&<div role="alert" className="space-y-2 rounded-lg border border-destructive p-4"><p>Health records or enrolled-student permissions could not be verified. No medical details are shown.</p><Button variant="outline" onClick={()=>{void records.refetch();if(isStaff){void enrolments.refetch();void profiles.refetch();}}}>Retry verification</Button></div>}
  {ready&&!loading&&!error&&isStaff&&!target&&<p className="rounded-lg border p-4 text-sm text-muted-foreground">Select an enrolled student to see their record. No other student's medical details are loaded in advance.</p>}
  {ready&&!loading&&!error&&target&&!authorisedTarget&&<p role="alert">The selected student is not in this centre's verified active enrolments.</p>}
  {ready&&!loading&&!error&&authorisedTarget&&<HealthEditor
   key={[user!.id,user!.tenantId,user!.role,target,selectedRecord?.id,selectedRecord?.updated_at].join(':')}
   studentId={target} tenantId={user!.tenantId!} record={selectedRecord}
   onSaved={()=>void records.refetch()}
  />}
 </DashboardLayout>;
}
function HealthEditor({studentId,tenantId,record,onSaved}:{
 studentId:string;tenantId:string;record:HealthRecord|null;onSaved:()=>void;
}){
 const [form,setForm]=useState(()=>formFromRecord(record));
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const split=(s:string)=>s.split(',').map(part=>part.trim()).filter(Boolean);
 const save=async()=>{
  if(saving)return;
  setSaving(true);setMessage('');
  try{
   const payload={
    student_id:studentId,tenant_id:tenantId,
    blood_group:form.blood_group||null,
    allergies:split(form.allergies),medical_conditions:split(form.medical_conditions),
    medications:split(form.medications),
    emergency_contact_name:form.emergency_contact_name||null,
    emergency_contact_phone:form.emergency_contact_phone||null,
    emergency_contact_relationship:form.emergency_contact_relationship||null,
    doctor_name:form.doctor_name||null,doctor_phone:form.doctor_phone||null,
    insurance_provider:form.insurance_provider||null,insurance_number:form.insurance_number||null,
    notes:form.notes||null,last_checkup_date:form.last_checkup_date||null,
   };
   const result=await supabase.from('health_records').upsert(payload,{onConflict:'student_id'});
   if(result.error)throw result.error;
   setMessage('Save accepted by the centre database. Refreshing your authorised record.');
   onSaved();
  }catch{
   toast.error('Record could not be saved. Check your permissions and try again.');
   setMessage('Save could not be confirmed. Your unsaved edits are still on this screen.');
  }finally{setSaving(false);}
 };
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <h2 className="font-semibold">{record?'Update authorised record':'Create an authorised record'}</h2>
   <Button disabled={saving} className="min-h-11" onClick={()=>void save()}><Save className="mr-2 size-4"/>{saving?'Saving…':'Save health record'}</Button>
  </div>
  {message&&<p role="status">{message}</p>}
  <div className="grid gap-5 lg:grid-cols-2">
   <section className="surface-card space-y-4 p-5">
    <h3 className="flex items-center gap-2 font-semibold"><Heart className="size-4"/>Medical information</h3>
    <div className="grid gap-3 sm:grid-cols-2">
     <div className="space-y-2"><Label>Blood group</Label><Select value={form.blood_group} onValueChange={v=>setForm(prev=>({...prev,blood_group:v}))}><SelectTrigger aria-label="Blood group"><SelectValue placeholder="Select if known"/></SelectTrigger><SelectContent>{BLOOD_GROUPS.map(group=><SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
     <div className="space-y-2"><Label htmlFor="health-checkup">Last checkup</Label><Input id="health-checkup" type="date" value={form.last_checkup_date} onChange={e=>setForm(prev=>({...prev,last_checkup_date:e.target.value}))}/></div>
    </div>
    {([
     ['Allergies','allergies'],['Medical conditions','medical_conditions'],
     ['Current medications','medications'],['Medical notes','notes']
    ] as const).map(([title,field])=><div key={field} className="space-y-2"><Label htmlFor={'health-'+field}>{title}</Label><Input id={'health-'+field} value={form[field]} onChange={e=>setForm(prev=>({...prev,[field]:e.target.value}))}/></div>)}
   </section>
   <div className="space-y-5">
    <section className="surface-card space-y-3 p-5">
     <h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4"/>Emergency contact</h3>
     {([
      ['Contact name','emergency_contact_name'],['Phone','emergency_contact_phone'],
      ['Relationship','emergency_contact_relationship']
     ] as const).map(([title,field])=><div key={field} className="space-y-2"><Label htmlFor={'health-'+field}>{title}</Label><Input id={'health-'+field} value={form[field]} onChange={e=>setForm(prev=>({...prev,[field]:e.target.value}))}/></div>)}
    </section>
    <section className="surface-card space-y-3 p-5">
     <h3 className="flex items-center gap-2 font-semibold"><Stethoscope className="size-4"/>Doctor and insurance</h3>
     {([
      ['Doctor name','doctor_name'],['Doctor phone','doctor_phone'],
      ['Insurance provider','insurance_provider'],['Policy number','insurance_number']
     ] as const).map(([title,field])=><div key={field} className="space-y-2"><Label htmlFor={'health-'+field}>{title}</Label><Input id={'health-'+field} value={form[field]} onChange={e=>setForm(prev=>({...prev,[field]:e.target.value}))}/></div>)}
    </section>
   </div>
  </div>
 </div>;
}
