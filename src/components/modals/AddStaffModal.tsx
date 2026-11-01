import {invitationOutcome} from '@/lib/accountInvitation';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useToast} from '@/hooks/use-toast';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {
 STAFF_CAPABILITIES,STAFF_DEFAULTS,staffRoleValid,parseCapabilityOverrides,UNIPATHWAY_SIGN_IN,
 type CapabilityEffect,type StaffCapability
} from '@/lib/staffPermissionProfiles';
const INVITABLE_ROLES=[
 {value:'office_admin',label:'Office Administrator'},{value:'hr_officer',label:'HR Officer'},
 {value:'secretary',label:'Secretary'},{value:'admissions_admin',label:'Admissions Admin'},
 {value:'lecturer',label:'Lecturer'},{value:'programme_leader',label:'Programme Leader'},
 {value:'assessor',label:'Assessor'},{value:'iqa_officer',label:'IQA / QA Officer'},
 {value:'exams_officer',label:'Exams Officer'},{value:'finance_officer',label:'Finance Officer'},
 {value:'marketing_officer',label:'Marketing Officer'},{value:'security_officer',label:'Security Officer'},
 {value:'welfare_officer',label:'Welfare Officer'},
] as const;
const inviteEnabled=import.meta.env.VITE_UNIPATHWAY_STAFF_INVITES_ENABLED==='true';
export default function AddStaffModal({open,onOpenChange,onStaffAdded,tenantId}:{
 open:boolean;onOpenChange:(value:boolean)=>void;onStaffAdded?:()=>void;tenantId?:string;
}){
 const {toast}=useToast(),{user}=useAuth();
 const manager=!!user?.id&&['centre_director','superadmin'].includes(user.role)&&user.roles?.includes(user.role);
 const office=!!user?.id&&user.role==='office_admin'&&user.roles?.includes('office_admin');
 const centre=manager?(tenantId||user?.tenantId||''):user?.tenantId||'';
 const allow=!!centre&&(manager||office);
 const roles=manager?INVITABLE_ROLES:INVITABLE_ROLES.filter(r=>['office_admin','hr_officer','secretary'].includes(r.value));
 const [loading,setLoading]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState('');
 const [role,setRole]=useState('secretary'),[overrides,setOverrides]=useState<Partial<Record<StaffCapability,CapabilityEffect>>>({});
 useEffect(()=>{if(open){setRole(office?'secretary':'lecturer');setOverrides({});}},[open,office]);
 async function handleSubmit(event:React.FormEvent){
  event.preventDefault();
  if(!allow||!inviteEnabled||loading)return;
  if(name.trim().length<2||name.trim().length>120||!email.trim()||!roles.some(r=>r.value===role)){
   toast({title:'Invalid invitation',description:'Choose an authorised role, a name and a valid email address.',variant:'destructive'});return;
  }
  if(office&&Object.keys(overrides).length){toast({title:'Director approval required',description:'Office administrators may invite only the default role profile. A director must separately review extra or reduced permissions.',variant:'destructive'});return;}
  const permissions=manager&&staffRoleValid(role)?parseCapabilityOverrides(overrides):{};
  setLoading(true);
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw Error('Your current login could not be verified.');
   const result=await supabase.functions.invoke('invite-staff',{
    body:{tenantId:centre,email:email.trim().toLowerCase(),fullName:name.trim(),role,permissions},
    headers:{Authorization:`Bearer ${session.access_token}`}
   });
   const status=await invitationOutcome(result);
   toast({title:status==='invited'?'Invitation sent':'Verified access assigned',
    description:`${name.trim()}: ${roles.find(r=>r.value===role)?.label}. Staff sign in at ${UNIPATHWAY_SIGN_IN}. Role assignment and optional permissions were processed by the server.`});
   setName('');setEmail('');setOverrides({});
   onOpenChange(false);onStaffAdded?.();
  }catch(e){
   toast({title:'Staff access not confirmed',description:e instanceof Error?e.message:'Invitation or personal permissions were not confirmed. Do not retry without checking the existing account.',variant:'destructive'});
  }finally{setLoading(false);}
 }
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
  <DialogHeader>
   <DialogTitle>Invite a centre staff member</DialogTitle>
   <DialogDescription>Accounts are assigned to a verified centre with a single approved job role. Privileged roles cannot be selected here.</DialogDescription>
  </DialogHeader>
  {!inviteEnabled?<p role="status" className="rounded-lg border p-4 text-sm">The UniPathway invitation service is not yet activated. This form cannot create or update staff accounts until the server-side authorisation and email gateway have been verified.</p>:
  !allow?<p role="alert">A verified centre manager or eligible office administrator is required to invite staff.</p>:
  <form onSubmit={handleSubmit} className="space-y-4">
   <p className="rounded-lg bg-secondary/40 p-3 text-sm">Staff will sign in at <a className="underline" href={UNIPATHWAY_SIGN_IN}>{UNIPATHWAY_SIGN_IN}</a>. The invitation is sent to the email entered here; do not replace an existing email account without the account owner verifying the change.</p>
   <label className="block text-sm font-medium">Full name
    <Input className="mt-1" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/>
   </label>
   <label className="block text-sm font-medium">Email to invite
    <Input className="mt-1" required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="new.staff@example.com"/>
   </label>
   <label className="block text-sm font-medium">Centre role
    <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" required value={role}
     onChange={e=>{setRole(e.target.value);setOverrides({});}}>
     {roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
   </label>
   {staffRoleValid(role)&&<section className="rounded-xl border p-4 space-y-3" aria-label="Personal office permissions">
    <h3 className="font-semibold">Default, extra or reduced permissions</h3>
    <p className="text-xs text-muted-foreground">Each setting is checked again by server-side centre membership and capability policies. Selecting a checkbox never grants centre-director, examination award, finance or private student-data privileges.</p>
    {STAFF_CAPABILITIES.map(cap=><label key={cap.key} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
     <span className="font-semibold">{cap.label}</span><span className="text-xs text-muted-foreground">{cap.description}</span>
     <span className="text-xs">Role default: {STAFF_DEFAULTS[role].includes(cap.key)?'Allowed':'Not granted'}</span>
     <select value={overrides[cap.key]||'default'} disabled={office}
      onChange={e=>setOverrides(old=>{const next={...old};if(e.target.value==='default')delete next[cap.key];
       else next[cap.key]=e.target.value as CapabilityEffect;return next;})}
      className="mt-1 min-h-10 rounded-lg border bg-background px-3">
      <option value="default">Role default</option><option value="allow">Extra access</option><option value="deny">Less access</option>
     </select>
    </label>)}
   </section>}
   <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={loading} onClick={()=>onOpenChange(false)}>Cancel</Button>
    <Button type="submit" disabled={loading}>{loading?'Inviting…':'Issue verified invitation'}</Button></div>
  </form>}
 </DialogContent></Dialog>;
}
