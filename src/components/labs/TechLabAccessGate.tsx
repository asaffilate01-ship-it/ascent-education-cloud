import {createContext,useContext,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
const enabled=import.meta.env.VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED==='true';
const TechLabContext=createContext<readonly string[]>([]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const useTechLabModuleIds=()=>useContext(TechLabContext);
export default function TechLabAccessGate({children}:{children:React.ReactNode}){
 const {user}=useAuth();
 const [modules,setModules]=useState<readonly string[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const permitted=!!user?.id&&!!user?.tenantId&&user.role==='student'&&user.roles?.includes('student');
 useEffect(()=>{
  let active=true;setModules([]);setError('');setLoading(true);
  if(!permitted||!enabled){setLoading(false);return()=>{active=false;};}
  void(async()=>{
   try{
    const {data,error:e}=await (supabase.rpc as any)('my_unipathway_tech_lab_modules');
    if(e||!Array.isArray(data))throw Error('The lab entitlement service did not verify access');
    const ids=data.map((row:{module_id?:unknown})=>row.module_id);
    if(ids.some(id=>typeof id!=='string'||!uuid.test(id)))throw Error('Invalid lab entitlement');
    if(active)setModules([...new Set(ids as string[])]);
   }catch{if(active)setError('Technology lab permissions could not be verified. Ask your course team to check your enrolled modules.');}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[user?.id,user?.tenantId,user?.role,user?.roles?.join(','),permitted]);
 if(!permitted)return <main role="alert" className="mx-auto max-w-2xl space-y-4 p-6">Your current role and centre are not authorised to access student technology labs. <Link className="underline" to="/student">Return to your dashboard</Link>.</main>;
 if(!enabled)return <main role="status" className="mx-auto max-w-2xl space-y-4 p-6">
  <h1 className="text-xl font-semibold">Technology lab access is being verified</h1>
  <p>Course-specific lab entitlements and provider policies are not yet activated in UniPathway. No AWS or other paid lab has been started.</p>
  <p>You can practise now in the browser labs, which need no cloud account.</p>
  <div className="flex flex-wrap gap-3"><Button asChild><Link to="/labs/tech">Open the Tech Lab</Link></Button><Button asChild variant="outline"><Link to="/labs/language">Open the Language Lab</Link></Button></div>
  <Link className="underline" to="/student/courses">View your enrolled courses</Link>
 </main>;
 if(loading)return <main role="status" className="p-6">Checking your enrolled technology modules and lab authorisation…</main>;
 if(error||!modules.length)return <main role="alert" className="mx-auto max-w-2xl space-y-4 p-6">
  <h1 className="text-xl font-semibold">No current technology lab authorisation</h1>
  <p>{error||'Your active programmes do not currently include an approved, individually granted technology lab. Other students may access their standard course content without the tech lab.'}</p>
  <p>Meanwhile, the browser Tech Lab and Language Lab are open to every student, in class or at home.</p>
  <div className="flex flex-wrap gap-3"><Button asChild><Link to="/labs/tech">Open the Tech Lab</Link></Button><Button asChild variant="outline"><Link to="/labs/language">Open the Language Lab</Link></Button><Button asChild variant="outline"><Link to="/student/courses">My course modules</Link></Button></div>
 </main>;
 return <TechLabContext.Provider value={modules}>{children}</TechLabContext.Provider>;
}
