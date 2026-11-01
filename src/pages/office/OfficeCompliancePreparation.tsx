import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {READINESS_TRACKS} from '@/lib/operationsReadinessCatalog';
import {staffRoleValid} from '@/lib/staffPermissionProfiles';

const enabled=import.meta.env.VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED==='true';

/** Public readiness guidance is visible only after the personal server
 * capability is verified. Draft preparation is not board accreditation. */
export default function OfficeCompliancePreparation(){
 const {user}=useAuth();
 return <Preparation key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function Preparation(){
 const {user}=useAuth();
 const tenant=user?.tenantId||'',role=user?.role||'';
 const eligible=!!user?.id&&!!tenant&&staffRoleValid(role)&&user.roles?.includes(role);
 const [loading,setLoading]=useState(true),[allowed,setAllowed]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let active=true;setAllowed(false);setError('');setLoading(true);
  if(!eligible||!enabled){setLoading(false);return()=>{active=false;};}
  void(async()=>{
   try{
    const result=await (supabase.rpc as any)('get_my_unipathway_office_workspace',{p_role:role});
    const record=result.data as {centreId?:unknown;role?:unknown;capabilities?:unknown}|null;
    if(result.error||!record||record.centreId!==tenant||record.role!==role||!Array.isArray(record.capabilities))
     throw Error('Unverified staff capability');
    if(active)setAllowed(record.capabilities.includes('prepare_compliance'));
   }catch{if(active)setError('Your individual compliance-preparation permission could not be verified.');}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[tenant,role,eligible,refresh]);
 return <DashboardLayout title="Centre compliance preparation" subtitle="Office evidence checklists — no external approval or confidential student access">
  <div className="space-y-5">
   <Link to="/office" className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm hover:bg-accent">Return to my office dashboard</Link>
   {!eligible?<p role="alert">A currently assigned Office Administrator, HR Officer or Secretary role and centre membership are required.</p>:
    !enabled?<p role="status" className="rounded-xl border p-5">Personal office permissions are not yet activated on this UniPathway backend. This preparation workspace remains unavailable until centre-scoped permission RPCs and RLS have passed staging checks.</p>:
    loading?<p role="status">Checking your personal preparation permission…</p>:
    error?<div role="alert" className="rounded-xl border p-5"><p>{error}</p><Button variant="outline" className="mt-3" onClick={()=>setRefresh(v=>v+1)}>Retry verification</Button></div>:
    !allowed?<p role="alert" className="rounded-xl border p-5">Your Centre Director has not authorised compliance preparation for this selected role. No records have been loaded or changed.</p>:
    <>
     <section className="rounded-xl border bg-card p-5 space-y-2">
      <h2 className="font-semibold">Evidence preparation only</h2>
      <p className="text-sm text-muted-foreground">Review official source requirements, assemble non-confidential evidence references and refer decisions to the Centre Director or authorised quality officer. These prompts never mean that UniPathway is an approved exam centre, qualification provider or funding contractor.</p>
     </section>
     <div className="grid gap-3 md:grid-cols-2">
      {READINESS_TRACKS.map(track=><details key={track.key} className="rounded-xl border bg-card p-4">
       <summary className="min-h-11 cursor-pointer font-semibold">{track.label}</summary>
       <p className="mt-2 text-sm text-muted-foreground">{track.scope}</p>
       <p className="mt-2 text-sm">Authority: {track.authority}</p>
       <a className="mt-2 inline-flex min-h-11 items-center text-sm underline" href={track.officialUrl} target="_blank" rel="noopener noreferrer">Open official authority resource</a>
       <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{track.requirements.map(item=><li key={item.title}><strong>{item.title}</strong> — {item.description}</li>)}</ul>
      </details>)}
     </div>
    </>}
  </div>
 </DashboardLayout>;
}
