import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {loadModuleOverview,type OverviewModule,type OverviewPanel} from '@/lib/moduleOverview';
export default function ModuleOverview({teacher=false}:{teacher?:boolean}) {
  const {user}=useAuth();const [params]=useSearchParams();const moduleId=params.get('module')||'';
  return <Workspace key={`${user?.id}:${user?.tenantId}:${moduleId}:${teacher}`} student={user?.id} tenant={user?.tenantId} moduleId={moduleId} teacher={teacher}/>;
}
function Workspace({student,tenant,moduleId,teacher}:{student?:string;tenant?:string;moduleId:string;teacher:boolean}) {
  const [state,setState]=useState<{module:OverviewModule|null;panels:OverviewPanel[]}|null>(null);
  const [error,setError]=useState(''),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true);
  useEffect(()=>{let current=true;setLoading(true);setState(null);setError('');
    void(async()=>{try{
      if(!student||!tenant||!moduleId)throw Error('Select a module from your courses or teaching dashboard.');
      const result=await loadModuleOverview(student,tenant,moduleId,teacher,()=>current);
      if(current)setState(result);
    }catch(e){if(current)setError(e instanceof Error?e.message:'Module could not be verified.');}finally{if(current)setLoading(false);}})();
    return()=>{current=false;};
  },[student,tenant,moduleId,teacher,refresh]);
  return <DashboardLayout title={state?.module?.title||'Module overview'} subtitle={teacher?'Prepare, teach and follow up in one place':'Your next steps, resources and progress'}>
    <Link className="font-semibold underline" to={teacher?'/lecturer':'/student/courses'}>{teacher?'Back to my teaching':'Back to my courses'}</Link>
    <Button className="ml-3" variant="outline" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh module</Button>
    {loading&&<p className="mt-5" role="status">Checking your module access and learning records…</p>}
    {error&&<p className="mt-5" role="alert">{error}</p>}
    {!loading&&!error&&!state?.module&&<p className="mt-5" role="alert">This module is unavailable or you no longer have access. Contact your centre if your enrolment or teaching assignment has changed.</p>}
    {!loading&&state?.module&&<><ModuleJourney moduleId={moduleId} teacher={teacher}/><p className="mb-5 text-sm text-muted-foreground">Class access, resource release and submission rules are checked again when you open each tool. Practice feedback is separate from released assessment results.</p>
      <Button asChild className="mb-5"><Link to={`/${teacher?'lecturer':'student'}/lessons?module=${moduleId}`}>{teacher?'Build and publish lessons':'Continue your next lesson'}</Link></Button><div className="grid gap-5 lg:grid-cols-2">{state.panels.map(panel=><section key={panel.title} className="surface-card p-5" aria-label={panel.title}>
        <h2 className="text-lg font-bold">{panel.title}</h2><p role={panel.error?'alert':undefined} className={`mt-2 text-sm ${panel.error?'text-destructive':'text-muted-foreground'}`}>{panel.summary}</p>
        <ul className="my-4 space-y-3">{panel.items.map(item=><li className="rounded-lg border p-3" key={item.id}><Link className="font-semibold underline" to={item.to}>{item.title}</Link><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></li>)}</ul>
        <Button variant="outline" asChild><Link to={panel.to}>Open {panel.title.toLowerCase()}</Link></Button>
      </section>)}</div></>}
  </DashboardLayout>;
}
