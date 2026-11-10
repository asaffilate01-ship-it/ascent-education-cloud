import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {activeRoleVerified} from '@/lib/roleMembership';
import {ClipboardCheck,ShieldCheck,CalendarClock,FileSearch,AlertTriangle} from 'lucide-react';

const requirements=[
  {title:'Approve programme-specific policy',detail:'IQA lead and Centre Director confirm the awarding body, qualification, sample rate, risk triggers, scope and effective policy version. There is no universal percentage.'},
  {title:'Verify the full assessment population',detail:'Trusted server-side queries must prove centre, course, date window, released status, marker decisions and independent IQA release without truncated pages.'},
  {title:'Generate an auditable proposal',detail:'A cryptographic server draw combines required high-risk cases and coverage across levels, subjects, assessors and assessment methods. Record reasons and uncovered groups.'},
  {title:'Independently allocate and approve',detail:'A competent reviewer who did not assess the sampled work must approve the plan. Only then may eligible scripts enter an authorised audit queue.'},
  {title:'Close corrective actions and evidence',detail:'Log rubric agreement, feedback quality, changes, assessor standardisation, deadlines and dated closure. EQA access requires a separate time-limited permission.'},
] as const;

export default function IqaSamplingReadiness(){
 const {user,loading}=useAuth();
 const authorised=!loading&&!!user?.id&&!!user.tenantId&&
   activeRoleVerified(user)&&['iqa_officer','programme_leader','centre_director','superadmin'].includes(user.role);
 const reviewLink=user?.role==='centre_director'?'/director/quality':
   user?.role==='programme_leader'?'/programme/assessments':
   user?.role==='superadmin'?'/landlord/compliance':'/qa/assessment-approval';
 return <DashboardLayout title="Fortnightly IQA sampling" subtitle="Programme-specific audit preparation and independent verification">
  {!authorised ? <section role="alert" className="rounded-xl border bg-card p-5">
    <h2 className="font-semibold">Verified academic quality role required</h2>
    <p className="mt-2 text-sm">No sampling plans, students, scripts or assessment records were loaded. Sign in with an authorised active centre role.</p>
   </section> : <>
    <section role="status" className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="sampling-service-status">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarClock aria-hidden="true" className="size-5 text-primary"/>
        <h2 id="sampling-service-status" className="text-lg font-semibold">Automated audit service not activated</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The source repository includes a tested sampling proposal algorithm, but the approved policy registry, secure scheduler, reviewer assignments, audit store and externally validated permissions are not connected to this screen. It cannot schedule, save, approve or complete an IQA audit.</p>
      <p className="mt-3 text-sm font-semibold">Existing individual human assessor marking and independent IQA approval continue separately, before any released result.</p>
      <Link to={reviewLink} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
       <ClipboardCheck aria-hidden="true" className="size-4"/> Open authorised quality work
      </Link>
    </section>
    <section className="mt-5" aria-labelledby="sampling-activation-steps">
      <h2 id="sampling-activation-steps" className="text-lg font-semibold">Required activation steps</h2>
      <p className="mt-1 text-sm text-muted-foreground">These are outstanding evidence requirements, not completed checks or live audit results.</p>
      <ol className="mt-3 grid gap-3 lg:grid-cols-2">
        {requirements.map((step,index)=><li key={step.title} className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary font-semibold text-foreground">{index+1}</span>
            <div className="min-w-0"><h3 className="text-sm font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p></div>
          </div>
        </li>)}
      </ol>
    </section>
    <section className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck aria-hidden="true" className="size-5"/> Independence rule</h2>
        <p className="mt-2 text-sm text-muted-foreground">An assessor cannot audit their own marking. Centre, programme, active membership and reviewer competence must be checked by the backend, not only by hiding UI actions.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><FileSearch aria-hidden="true" className="size-5"/> Coverage and shortfalls</h2>
        <p className="mt-2 text-sm text-muted-foreground">Every cycle must report represented and missing levels, subjects, assessors and methods. Small samples may require additional targeted review.</p>
      </div>
    </section>
    <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0"/> A completed source build does not establish awarding-body approval, production scheduling, learner access or external EQA authorisation.</p>
   </>}
 </DashboardLayout>;
}
