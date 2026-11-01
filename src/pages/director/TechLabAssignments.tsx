import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
type Module={id:string;title:string;programme_id:string;tenant_id:string};
type Enrollment={student_id:string;programme_id:string;tenant_id:string;status:string};
type Profile={user_id:string;full_name:string|null;email:string|null};
type Approval={module_id:string;enabled:boolean;evidence_reference:string};
type Grant={student_id:string;module_id:string;valid_until:string;revoked_at:string|null};
const enabled=import.meta.env.VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED==='true';
export default function TechLabAssignments(){
 const {user}=useAuth();
 return <Workspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function Workspace(){
 const {user}=useAuth();
 const tenant=user?.tenantId||'';
 const allowed=!!user?.id&&!!tenant&&user.role==='centre_director'&&user.roles?.includes('centre_director');
 const [modules,setModules]=useState<Module[]>([]),[enrolments,setEnrolments]=useState<Enrollment[]>([]),
 [profiles,setProfiles]=useState<Profile[]>([]),[approvals,setApprovals]=useState<Approval[]>([]),
 [grants,setGrants]=useState<Grant[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0),[module,setModule]=useState(''),[student,setStudent]=useState(''),[source,setSource]=useState('');
 const [validUntil,setValidUntil]=useState('');
 const load=useCallback(async(current:()=>boolean)=>{
  setLoading(true);setError('');setModules([]);setEnrolments([]);setProfiles([]);setApprovals([]);setGrants([]);
  if(!allowed||!enabled){setLoading(false);return;}
  try{
   const [m,e,a,g]=await Promise.all([
    db.from('modules').select('id,title,programme_id,tenant_id').eq('tenant_id',tenant).order('title').limit(250),
    db.from('student_enrolments').select('student_id,programme_id,tenant_id,status').eq('tenant_id',tenant).eq('status','active').limit(500),
    db.from('unipathway_approved_tech_modules').select('module_id,enabled,evidence_reference').eq('tenant_id',tenant).limit(250),
    db.from('unipathway_student_lab_entitlements').select('student_id,module_id,valid_until,revoked_at').eq('tenant_id',tenant).limit(500)
   ]);
   if([m,e,a,g].some(r=>r.error))throw Error('The module entitlement registry is not fully available.');
   const en=(e.data||[]) as Enrollment[],ids=[...new Set(en.map(x=>x.student_id))];
   const p=ids.length?await db.from('profiles').select('user_id,full_name,email').eq('tenant_id',tenant).in('user_id',ids).limit(500):{data:[],error:null};
   if(p.error)throw Error('Student identities cannot be verified.');
   if(current()){setModules((m.data||[]) as Module[]);setEnrolments(en);setApprovals((a.data||[]) as Approval[]);
    setGrants((g.data||[]) as Grant[]);setProfiles((p.data||[]) as Profile[]);}
  }catch{if(current())setError('Lab allocation evidence could not be verified. No student lab entitlement was granted.');}
  finally{if(current())setLoading(false);}
 },[allowed,tenant]);
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[load,revision]);
 const selected=modules.find(m=>m.id===module),approved=approvals.some(a=>a.module_id===module&&a.enabled);
 const candidates=selected?enrolments.filter(e=>e.programme_id===selected.programme_id):[];
 const staffName=(uid:string)=>profiles.find(p=>p.user_id===uid)?.full_name||'Enrolled learner';
 async function markTech(event:React.FormEvent){
  event.preventDefault();if(!allowed||busy||!selected||source.trim().length<12)return;
  setBusy(true);setError('');setNote('');
  try{
   const r=await db.rpc('review_unipathway_tech_lab_module',{p_module:selected.id,p_enabled:true,p_reference:source.trim()});
   if(r.error||r.data!==true)throw Error('The server did not confirm module eligibility.');
   setNote('Internal technology-module eligibility verified for this centre. External vendor accreditation is separate.');
   setRevision(v=>v+1);
  }catch{setError('Tech module approval could not be verified.');}finally{setBusy(false);}
 }
 async function grant(event:React.FormEvent){
  event.preventDefault();if(!allowed||busy||!selected||!approved||!candidates.some(c=>c.student_id===student))return;
  const dt=validUntil?new Date(validUntil+'T23:59:00Z'):null;
  if(!dt||!Number.isFinite(dt.getTime())||dt.getTime()<=Date.now()){setError('Choose a future expiry date for this course-linked lab grant.');return;}
  setBusy(true);setError('');setNote('');
  try{
   const r=await db.rpc('grant_unipathway_tech_lab_to_student',{p_student:student,p_module:selected.id,p_until:dt.toISOString()});
   if(r.error||r.data!==true)throw Error('The grant was not confirmed');
   setNote('The individual learner now has a recorded tech module grant. A real lab still needs a verified provider and safe classroom invitation.');
   setRevision(v=>v+1);
  }catch{setError('Lab entitlement could not be verified; check the learner enrolment and course designation.');}
  finally{setBusy(false);}
 }
 async function revoke(uid:string){
  if(!allowed||busy||!selected)return;setBusy(true);setError('');setNote('');
  try{const r=await db.rpc('revoke_unipathway_tech_lab',{p_student:uid,p_module:selected.id});
   if(r.error||r.data!==true)throw Error('Revocation not confirmed');
   setNote('Technology lab access revoked in the database. Existing external AWS sessions require provider-side revocation.');
   setRevision(v=>v+1);
  }catch{setError('The lab entitlement could not be revoked. Check backend access before allowing another session.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Tech lab course allocations" subtitle="Approve course modules and student-specific lab access independently of the provider">
  <div className="space-y-5">
   {!allowed?<p role="alert" className="rounded-xl border p-5">Only an active verified Centre Director may manage lab eligibility.</p>:
   !enabled?<section role="status" className="rounded-xl border bg-card p-6 space-y-2">
    <h2 className="font-semibold">Technology lab entitlement service not activated</h2>
    <p className="text-sm text-muted-foreground">The reviewed UniPathway module and per-student lab-entitlement schema must be deployed and tested before course-specific lab access can be granted. Other students cannot open a cloud lab by having a student role alone.</p>
   </section>:<>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Step 1 — Verify a technology course module</h2>
     <p className="text-sm text-muted-foreground">Only real, centre-matching modules are selectable. Verifying a module as suitable for technology teaching does not prove Microsoft, AWS or other external vendor recognition.</p>
     <label className="block max-w-xl text-sm font-medium">Module
      <select value={module} onChange={e=>{setModule(e.target.value);setStudent('');setSource('');}}
       className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3">
       <option value="">Choose enrolled technology module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}
      </select>
     </label>
     {selected&&!approved&&<form onSubmit={markTech} className="space-y-3">
      <label className="block max-w-xl text-sm font-medium">Official internal approval/equipment evidence reference
       <Input className="mt-1" required minLength={12} maxLength={500} value={source} onChange={e=>setSource(e.target.value)}/>
      </label>
      <Button type="submit" disabled={busy||source.trim().length<12}>Verify tech module for centre</Button>
     </form>}
     {selected&&approved&&<p role="status">This module is recorded as internally approved for technology lab teaching.</p>}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Step 2 — Grant an enrolled learner access</h2>
     <p className="text-sm text-muted-foreground">Only active students in the selected module's programme can receive a dated entitlement. Non-tech students, other centres and withdrawn enrolments must be denied.</p>
     <form onSubmit={grant} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Enrolled learner
       <select value={student} onChange={e=>setStudent(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3">
        <option value="">Choose programme enrolment</option>{candidates.map(s=><option key={s.student_id} value={s.student_id}>{staffName(s.student_id)} · {s.student_id.slice(0,8)}</option>)}
       </select>
      </label>
      <label className="text-sm font-medium">Grant expires
       <Input className="mt-1 min-h-11" type="date" required value={validUntil} onChange={e=>setValidUntil(e.target.value)}/>
      </label>
      <div className="sm:col-span-2"><Button type="submit" disabled={busy||!approved||!student||!validUntil}>Grant time-limited technology lab access</Button></div>
     </form>
     {!candidates.length&&<p className="text-sm text-muted-foreground">No active students are enrolled in this selected programme.</p>}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Current individually approved lab grants</h2>
     {grants.filter(g=>g.module_id===module).map(g=><article key={g.student_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div><p className="text-sm font-semibold">{staffName(g.student_id)}</p>
       <p className="text-xs text-muted-foreground">{g.revoked_at?'Revoked':'Expires '+new Date(g.valid_until).toLocaleDateString()}</p></div>
      {!g.revoked_at&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void revoke(g.student_id)}>Revoke lab entitlement</Button>}
     </article>)}
    </section>
    {loading&&<p role="status">Verifying centre labs and student programme links…</p>}
    {error&&<p role="alert">{error}</p>}
    {note&&<p role="status">{note}</p>}
    {!loading&&<Button variant="outline" onClick={()=>setRevision(v=>v+1)}>Recheck grants</Button>}
   </>}
  </div>
 </DashboardLayout>;
}
