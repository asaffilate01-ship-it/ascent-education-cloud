import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {DashboardSkeleton} from '@/components/ui/Skeletons';
import ModuleJourney from '@/components/assessment/ModuleJourney';
export default function StudentCourses(){
 const {user}=useAuth();
 const enrolments=useSupabaseQuery('student_enrolments',{filters:[{column:'student_id',operator:'eq',value:user?.id||''},{column:'status',operator:'eq',value:'active'}],enabled:!!user?.id});
 const programmes=useSupabaseQuery('programmes',{orderBy:{column:'title',ascending:true}});
 const modules=useSupabaseQuery('modules',{orderBy:{column:'title',ascending:true}});
 if(enrolments.loading||programmes.loading||modules.loading)return <DashboardSkeleton/>;
 const error=enrolments.error||programmes.error||modules.error;
 const enrolled=new Set(enrolments.data.map(e=>e.programme_id));
 const courses=programmes.data.filter(p=>enrolled.has(p.id));
 return <DashboardLayout title="My courses" subtitle="Your classes, resources, assignments and results in one place">
  <p className="mb-5"><Link className="font-semibold underline" to="/student/labs">Open practical and coding labs</Link></p>
  {error?<p role="alert" className="rounded-lg border border-destructive p-4">Your courses could not be verified. Refresh this page or contact your centre.</p>:<>
   {!courses.length&&<p>No active enrolments yet. Contact your centre to complete enrolment.</p>}
   {courses.map(p=><section key={p.id} className="mb-6 rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">{p.title}</h2><p className="mt-1 text-sm text-muted-foreground">{p.awarding_body} · Level {p.level}</p>
    {modules.data.filter(m=>m.programme_id===p.id).map(m=><article key={m.id} className="mt-5"><h3 className="font-semibold">{m.title}</h3><p className="text-sm text-muted-foreground">{m.code} · Module status: {m.status}</p><ModuleJourney moduleId={m.id}/></article>)}
    {!modules.data.some(m=>m.programme_id===p.id)&&<p className="mt-4 text-sm">Your centre has not added modules yet.</p>}
   </section>)}
  </>}
 </DashboardLayout>;
}
