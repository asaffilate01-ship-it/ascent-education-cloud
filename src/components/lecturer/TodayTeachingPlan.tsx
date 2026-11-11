import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {useScheduledLectures} from '@/hooks/useScheduledLectures';
import {formatPakistanAcademicDate} from '@/lib/assessment/courseworkQueue';
import {pakistanTeachingDate,savedTeachingPlanForPakistanDate} from '@/lib/teachingPlan';

type AssignedModule={id:string;title:string;code:string|null};

export default function TodayTeachingPlan({modules}:{modules:AssignedModule[]}){
 const {user}=useAuth();
 const {myLectures,loading,error,refetch}=useScheduledLectures();
 const [clock,setClock]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
 const allowed=new Map(modules.map(module=>[module.id,module]));
 const authorised=!!user?.id&&!!user.tenantId&&user.role==='lecturer'&&user.roles?.includes('lecturer');
 const candidateSlots=authorised?myLectures.filter(slot=>slot.tenant_id===user.tenantId&&slot.lecturer_id===user.id&&allowed.has(slot.module_id)):[];
 const today=savedTeachingPlanForPakistanDate(candidateSlots,new Date(clock));
 return <section aria-labelledby="today-plan-title" className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 id="today-plan-title" className="text-lg font-semibold">Today's saved weekly plan · Pakistan time</h2>
    <p className="mt-1 text-sm text-muted-foreground">{pakistanTeachingDate(new Date(clock))} · These are potential teaching-plan slots, not confirmed class invitations or Teams meetings.</p>
   </div>
   <Button variant="outline" size="sm" asChild><Link to="/lecturer/teaching">Full teaching timetable</Link></Button>
  </div>
  {!authorised?<p role="alert" className="mt-4 text-sm">Active lecturer and centre access are required.</p>
   :loading?<p role="status" className="mt-4 text-sm">Verifying assigned teaching-plan slots…</p>
   :error?<div className="mt-4 space-y-2"><p role="alert" className="text-sm">Teaching-plan data could not be verified. No slots are displayed.</p><Button size="sm" variant="outline" onClick={()=>void refetch()}>Retry plan</Button></div>
   :!today.length?<p className="mt-4 text-sm text-muted-foreground">{modules.length?'No saved weekly-plan slots match today in Pakistan. Check the full timetable for future plans.':'No authorised teaching modules are currently assigned.'}</p>
   :<ol className="mt-4 space-y-3">{today.slice(0,5).map(slot=>{
     const module=allowed.get(slot.module_id)!;
     return <li key={slot.id} className="rounded-lg border bg-secondary/20 p-3">
      <div className="flex flex-wrap justify-between gap-2">
       <div><p className="text-sm font-semibold tabular-nums">{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)} PKT</p>
        <p className="mt-1 break-words font-medium">{module.title}</p>
        <p className="text-xs text-muted-foreground">{module.code||'Module'} · {slot.room||'Room unconfirmed'} · {slot.recurrence||'Recurrence unverified'}</p>
       </div>
       <div className="flex flex-wrap items-start gap-2"><Link className="inline-flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent" to={'/lecturer/module?'+new URLSearchParams({module:module.id})}>Module</Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent" to={'/lecturer/classroom?'+new URLSearchParams({module:module.id})}>Check classes</Link>
       </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Plan effective {slot.effective_from} to {slot.effective_until||'open-ended'}. Verify actual session, learners and invitations before teaching.</p>
     </li>;
    })}{today.length>5&&<li className="text-sm text-muted-foreground">Showing five of {today.length} plan slots. Open the full timetable for the rest.</li>}</ol>}
 </section>;
}
