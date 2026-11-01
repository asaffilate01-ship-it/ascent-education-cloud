import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {activeRoleVerified} from '@/lib/roleMembership';
import {db} from '@/lib/db';
import {summariseAssignedIqaWorkload,type AssignedIqaSummary} from '@/lib/qa/assignedIqaWorkload';

// Use a separate, active-role handoff rather than reusing the unallocated submissions list.
const WORKSPACES={
 iqa_officer:[
  {label:'Review my independently allocated marks',path:'/qa/assessment-approval',detail:'Revision-bound rubric decision and separate release'},
  {label:'My independently allocated appeals',path:'/qa/appeals',detail:'Evidence-based review followed by separate director sign-off'},
 ],
 programme_leader:[
  {label:'Programme and module management',path:'/programme/modules',detail:'Module and lecturer planning'},
  {label:'Independent assessment allocation',path:'/programme/assessments',detail:'Approved marker and IQA handoff'},
  {label:'Syllabus and board readiness',path:'/programme/syllabuses',detail:'Internal preparation, not external accreditation'},
 ],
 centre_director:[
  {label:'Assessment operations',path:'/director/assessment-management',detail:'Centre-scoped allocation and oversight'},
  {label:'Appeal sign-off',path:'/director/assessment-appeals',detail:'Separate approval following independent review'},
  {label:'Qualification readiness',path:'/director/syllabuses',detail:'Awarding-body preparation records'},
 ],
} as const;
const UNCONNECTED:Record<string,string>={
 sampling:'Automated sampling plans and approved evidence packs are not activated here.',
 plagiarism:'Similarity does not establish misconduct; a dedicated integrity case service is not connected here.',
 malpractice:'Formal malpractice notices, adjudication and appeals are not activated here.',
 audit:'Verified third-party audit evidence export is not connected here.',
 evidence:'External EQA evidence release requires a scoped, time-limited approval and audit.',
};
export default function QADashboard(){
 const {user}=useAuth();
 const {pathname}=useLocation();
 const verified=!!user?.id&&!!user.tenantId&&activeRoleVerified(user);
 const role=verified&&user&&user.role in WORKSPACES?user.role:null;
 if(role!=='iqa_officer'&&role!=='programme_leader'&&role!=='centre_director'){
  return <DashboardLayout title="Quality assurance"><p role="alert">An active, centre-verified QA, Programme Leader or Director role is required. No submissions were loaded.</p></DashboardLayout>;
 }
 const section=pathname.startsWith('/qa/')?pathname.slice(4):'';
 return <DashboardLayout title={role==='iqa_officer'?'My IQA quality desk':'Academic quality oversight'} subtitle="Authorised, independently allocated workflows">
  <section className="mb-5 rounded-xl border bg-primary/5 p-5">
   <h2 className="font-semibold">Current role, current centre, approved evidence only</h2>
   <p className="mt-2 text-sm text-muted-foreground">Internal coursework is not an official awarding-body result. Lecturer marking, independent assessment, IQA verification and student release are separate approvals.</p>
  </section>
  {role==='iqa_officer'&&<IqaWorkload key={user!.id+':'+user!.tenantId} reviewer={user!.id} tenant={user!.tenantId!}/>}
  {section&&UNCONNECTED[section]&&<section className="mb-5 rounded-xl border bg-card p-5" role="status"><h2 className="font-semibold capitalize">{section} readiness</h2><p className="mt-2 text-sm">{UNCONNECTED[section]}</p></section>}
  <section aria-label="Authorised quality workflows" className="grid gap-4 md:grid-cols-2">
   {WORKSPACES[role].map(item=><Link key={item.path} to={item.path} className="block rounded-xl border bg-card p-5 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
    <h2 className="font-semibold">{item.label}</h2><p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
   </Link>)}
  </section>
  <p className="mt-5 text-sm text-muted-foreground">This dashboard does not fetch legacy centre-wide submissions, contact details, unassigned marking drafts or external awarding-body evidence. Hosted RLS remains the ultimate access boundary.</p>
 </DashboardLayout>;
}
function IqaWorkload({reviewer,tenant}:{reviewer:string;tenant:string}){
 const [refresh,setRefresh]=useState(0);
 const [state,setState]=useState<{loading:boolean;error:string;summary:AssignedIqaSummary|null}>({loading:true,error:'',summary:null});
 useEffect(()=>{
  let active=true;
  setState({loading:true,error:'',summary:null});
  void (async()=>{
   const result=await db.from('unipathway_assessment_allocations')
    .select('attempt_id').eq('tenant_id',tenant).eq('qa_reviewer_id',reviewer).limit(200);
   if(result.error)throw result.error;
   const assigned=(result.data||[]) as Array<{attempt_id:string}>;
   const ids=[...new Set(assigned.map(row=>row.attempt_id))];
   const attempts:Array<{id:string;status:string}>=[];
   for(let offset=0;offset<ids.length;offset+=40){
    const chunk=ids.slice(offset,offset+40);
    const evidence=await db.from('unipathway_assessment_attempts')
     .select('id,status').eq('tenant_id',tenant).in('id',chunk).limit(chunk.length);
    if(evidence.error)throw evidence.error;
    if(!active)return;
    attempts.push(...((evidence.data||[]) as Array<{id:string;status:string}>));
   }
   const summary=summariseAssignedIqaWorkload(assigned,attempts);
   if(active)setState({loading:false,error:'',summary});
  })().catch(()=>{if(active)setState({loading:false,error:'Assigned IQA work could not be verified. No partial figures are shown.',summary:null});});
  return()=>{active=false;};
 },[reviewer,tenant,refresh]);
 return <section aria-label="My assigned IQA workload" className="mb-5 rounded-xl border bg-card p-5">
  <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">My allocated IQA workload</h2><Button size="sm" variant="outline" disabled={state.loading} onClick={()=>setRefresh(n=>n+1)}>Refresh</Button></div>
  <p className="mt-2 text-sm text-muted-foreground">Read-only snapshot of up to 200 assignments for this reviewer and centre. Open the full independent QA queue below.</p>
  {state.loading&&<p role="status" className="mt-4">Verifying assigned attempts…</p>}
  {state.error&&<p role="alert" className="mt-4 text-destructive">{state.error}</p>}
  {state.summary&&<div className="mt-4 grid gap-3 sm:grid-cols-3">
   <article className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Awaiting IQA review</p><p className="text-2xl font-bold">{state.summary.awaitingReview}</p></article>
   <article className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Awaiting separate release</p><p className="text-2xl font-bold">{state.summary.awaitingRelease}</p></article>
   <article className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Other allocated attempts</p><p className="text-2xl font-bold">{state.summary.other}</p></article>
  </div>}
 </section>;
}
