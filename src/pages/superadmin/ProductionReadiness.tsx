import {useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import type {EducationTables} from '@/integrations/supabase/education-types';
export default function ProductionReadiness(){
 const {user}=useAuth();const tenant=user?.tenantId;
 const [integrations,setIntegrations]=useState<EducationTables['production_integrations']['Row'][]>([]);
 const [checks,setChecks]=useState<EducationTables['production_readiness_checks']['Row'][]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;setIntegrations([]);setChecks([]);setError('');setLoading(true);
  if(!tenant){setLoading(false);return;}
  Promise.all([supabase.from('production_integrations').select('*').eq('tenant_id',tenant).order('category'),supabase.from('production_readiness_checks').select('*').eq('tenant_id',tenant).order('category')]).then(([i,c])=>{
   if(!active)return;if(i.error||c.error)setError('Readiness evidence could not be loaded. Launch status is unknown.');else{setIntegrations(i.data||[]);setChecks(c.data||[]);}setLoading(false);
  });return()=>{active=false;};
 },[tenant]);
 const pending=checks.filter(c=>!['pass','not_applicable'].includes(c.status)).length;
 const required=integrations.filter(i=>i.required_for_launch&&!['healthy','not_applicable'].includes(i.status)).length;
 return <DashboardLayout title="Production Readiness" subtitle="Launch decisions require recorded operational evidence">
  {error&&<p role="alert" className="surface-card p-4 mb-4 text-destructive">{error}</p>}
  <div className="surface-card p-5 mb-5"><h2 className="font-semibold">{loading?'Loading evidence…':!tenant?'Centre assignment required':!checks.length||!integrations.length?'Readiness has not been established':pending||required?`${pending} checks outstanding · ${required} required integrations unverified`:'Recorded gates complete — review evidence before launch'}</h2><p className="text-sm text-muted-foreground mt-2">A successful build does not establish live provider health, academic approval or backup readiness.</p></div>
  <div className="grid lg:grid-cols-2 gap-4"><section className="surface-card p-5 space-y-4"><h2 className="font-semibold">External integrations</h2>{integrations.map(i=><div key={i.id} className="border-b pb-3"><div className="flex justify-between gap-3"><p>{i.integration_key.replace(/_/g,' ')}</p><StatusBadge status={i.status} variant={i.status==='healthy'?'success':'warning'}/></div><p className="text-xs text-muted-foreground">{i.required_for_launch?'Required for launch':'Optional / scope dependent'} · {i.last_health_at?`Last checked ${new Date(i.last_health_at).toLocaleString()}`:'No live verification recorded'}</p></div>)}</section>
  <section className="surface-card p-5 space-y-4"><h2 className="font-semibold">Launch checks</h2>{checks.map(c=><div key={c.id} className="border-b pb-3"><div className="flex justify-between gap-3"><p>{c.check_key.replace(/_/g,' ')}</p><StatusBadge status={c.status} variant={c.status==='pass'?'success':'warning'}/></div><p className="text-xs text-muted-foreground">{c.evidence_reference||'Evidence not recorded'}</p></div>)}</section></div>
 </DashboardLayout>;
}
