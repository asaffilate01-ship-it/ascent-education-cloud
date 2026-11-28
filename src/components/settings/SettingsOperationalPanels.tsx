import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import {useAuth,ROLE_LABELS} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {db} from '@/lib/db';
import {settingsCapabilities,settingsIntegrationEvidence} from '@/lib/settingsAccess';
import {matchesLocalSearch} from '@/lib/localSearch';
import {pagedRows} from '@/lib/pagedRows';

type Area='general'|'branding'|'integrations'|'data';
const Action=({to,label}:{to:string;label:string})=><Button variant="outline" asChild><Link to={to}>{label}</Link></Button>;
export default function SettingsOperationalPanels({area}:{area:Area}){
 const {user}=useAuth();const access=settingsCapabilities(user);
 if(!access.role)return <p role="alert">A verified active role is required.</p>;
 return <OperationalPanel key={JSON.stringify([area,user?.id,user?.tenantId,user?.role,user?.roles])} area={area}/>;
}
function OperationalPanel({area}:{area:Area}){
 const {user}=useAuth();const access=settingsCapabilities(user);
 const tenant=user?.tenantId;
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{loading:boolean;error:boolean;centre:{name:string;brand:string|null}|null;rows:ReturnType<typeof settingsIntegrationEvidence>}>({loading:false,error:false,centre:null,rows:[]});
 const [now,setNow]=useState(Date.now());
 const [raw,setRaw]=useState<unknown[]>([]);
 const [search,setSearch]=useState(''),[requiredOnly,setRequiredOnly]=useState(false);
 useEffect(()=>{
  let active=true;const readCentre=!!tenant&&area==='general',readProviders=!!tenant&&area==='integrations'&&access.integrations;
  setRaw([]);setState({loading:readCentre||readProviders,error:false,centre:null,rows:[]});
  if(!tenant||(!readCentre&&!readProviders))return()=>{active=false;};
  void(async()=>{
   try{
    if(readCentre){
     const result=await supabase.from('tenants').select('id,name,brand_name').eq('id',tenant).maybeSingle();
     const row=result.data;
     if(result.error||!row||row.id!==tenant||typeof row.name!=='string'||!row.name.trim()||!(row.brand_name===null||typeof row.brand_name==='string'))throw Error('Centre not verified');
     if(active)setState({loading:false,error:false,centre:{name:row.name,brand:row.brand_name},rows:[]});
    }else{
     const rows=await pagedRows<unknown>(()=>db.from('production_integrations').select('id,tenant_id,integration_key,category,required_for_launch,status,last_health_at,last_error').eq('tenant_id',tenant),()=>active);
     const verified=settingsIntegrationEvidence(rows,tenant,Date.now());
     if(active){setRaw(rows);setNow(Date.now());setState({loading:false,error:false,centre:null,rows:verified});}
    }
   }catch{if(active)setState({loading:false,error:true,centre:null,rows:[]});}
  })();
  return()=>{active=false;};
 },[area,tenant,access.integrations,revision]);
 useEffect(()=>{if(area!=='integrations')return;const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id);},[area]);
 const refresh=<Button variant="outline" disabled={state.loading} onClick={()=>setRevision(n=>n+1)}>Refresh records</Button>;
 const readiness=access.readinessPath&&access.centre?<Action to={access.readinessPath} label="Open production readiness"/>:null;
 if(area==='general')return <section className="space-y-4">
  <h3 className="text-lg font-semibold">General settings</h3>
  <p className="text-sm text-muted-foreground">Your verified workspace and centre assignment. Institutional configuration is managed through the authorised centre workflows, not a local save button.</p>
  <div className="rounded-xl border p-4 space-y-3"><BrandLogo className="h-9"/><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Active role</dt><dd className="font-medium">{access.role?ROLE_LABELS[access.role]:'Unverified'}</dd></div><div><dt className="text-xs text-muted-foreground">Centre assignment</dt><dd className="font-medium break-words">{!tenant?(access.owner?'Global platform role — no centre selected':'No centre assigned'):state.loading?'Verifying…':state.error?'Centre could not be verified':state.centre?.name||'Awaiting verification'}</dd></div>{state.centre?.brand&&<div><dt className="text-xs text-muted-foreground">Recorded brand</dt><dd className="font-medium">{state.centre.brand}</dd></div>}</dl>
  {state.error&&<p role="alert" className="text-sm text-destructive">Centre details could not be verified. No default centre is assumed.</p>}
  <div className="flex flex-wrap gap-2">{tenant&&refresh}{access.brandingPath&&<Action to={access.brandingPath} label="Manage centre identity"/>}{readiness}</div></div>
  <p className="text-sm text-muted-foreground">Timezone, language and institutional contact changes require a supported centre configuration workflow. They are not editable here.</p>
 </section>;
 if(area==='branding')return <section className="space-y-4"><h3 className="text-lg font-semibold">Centre branding</h3><div className="rounded-xl border bg-white p-4"><BrandLogo className="h-11"/></div><p className="text-sm text-muted-foreground">Use the existing authorised branding workspace for centre identity changes. Website publication and domain verification are separate.</p>{access.brandingPath?<Action to={access.brandingPath} label="Open authorised branding workspace"/>:<p role="status">Centre branding is managed by the assigned director or platform owner.</p>}</section>;
 if(area==='data')return <section className="space-y-4"><h3 className="text-lg font-semibold">Data and recovery</h3><p className="text-sm text-muted-foreground">Use role-scoped records and reporting services. An unfiltered profile or invoice download is not a verified backup.</p>
  {access.studentPath&&<article className="rounded-xl border p-4 space-y-2"><h4 className="font-medium">Student records</h4><p className="text-sm text-muted-foreground">Review verified centre enrolments in the student registry. Bulk student export requires a separate approved reporting workflow.</p><Action to={access.studentPath} label="Open student registry"/></article>}
  {access.financePath&&<article className="rounded-xl border p-4 space-y-2"><h4 className="font-medium">Financial reports</h4><p className="text-sm text-muted-foreground">Use the centre-scoped finance report service and its record limits.</p><Action to={access.financePath} label="Open finance reporting"/></article>}
  {access.auditPath&&<article className="rounded-xl border p-4 space-y-2"><h4 className="font-medium">Audit evidence</h4><Action to={access.auditPath} label="Open audit records"/></article>}
  {readiness&&<article className="rounded-xl border p-4 space-y-2"><h4 className="font-medium">Backup and recovery evidence</h4><p className="text-sm text-muted-foreground">Recorded recovery drills are reviewed separately. This screen does not create or restore backups.</p>{readiness}</article>}
  {!access.studentPath&&!access.financePath&&!access.auditPath&&!readiness&&<p role="status">No centre-level reporting tools are available for this workspace.</p>}
 </section>;
 if(!access.integrations||!tenant)return <section className="space-y-3"><h3 className="text-lg font-semibold">Integration evidence</h3><p role="status">A verified centre leadership role and centre assignment are required to review provider health. Contact your administrator.</p></section>;
 const rows=state.loading||state.error?[]:settingsIntegrationEvidence(raw,tenant,now);
 const filtered=rows.filter(row=>(!requiredOnly||row.required)&&matchesLocalSearch([row.name,row.key,row.status].join(' '),search));
 return <section className="space-y-4"><div className="flex flex-wrap justify-between items-start gap-3"><div><h3 className="text-lg font-semibold">Integration evidence</h3><p className="text-sm text-muted-foreground">Recorded provider checks for this centre. No live health or activation is inferred from a configured record.</p></div>{refresh}</div>
  <div className="flex flex-wrap gap-2">{readiness}{access.director&&<Action to="/director/microsoft-education" label="Microsoft Education administration"/>}</div>
  {state.loading?<p role="status">Verifying provider records…</p>:state.error?<p role="alert" className="text-sm text-destructive">Provider evidence could not be verified. No connection status is assumed.</p>:<>
   <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Recorded integrations</p><p className="text-xl font-semibold">{rows.length}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Current health evidence</p><p className="text-xl font-semibold">{rows.filter(r=>r.current).length}</p></div></div>
   <label className="block text-sm font-medium">Find an integration<input type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3"/></label>
   <div className="flex flex-wrap gap-2"><Button variant={requiredOnly?'default':'outline'} aria-pressed={requiredOnly} onClick={()=>setRequiredOnly(v=>!v)}>Required only</Button>{(search||requiredOnly)&&<Button variant="ghost" onClick={()=>{setSearch('');setRequiredOnly(false);}}>Clear filters</Button>}</div>
   <p role="status" className="text-sm text-muted-foreground">{filtered.length} of {rows.length} verified records match.</p>
   {!rows.length?<p>No provider records returned for this centre. Connection status is unknown.</p>:!filtered.length?<p>No records match the filters.</p>:<div className="grid gap-3 sm:grid-cols-2">{filtered.map(row=><article key={row.id} className="min-w-0 rounded-xl border p-3 [overflow-wrap:anywhere]"><h4 className="font-medium">{row.name}</h4><p className="mt-1 text-sm">{row.status}</p><p className="text-xs text-muted-foreground">{row.required?'Required for launch':'Optional'} · {row.checkedAt?'Last recorded '+new Date(row.checkedAt).toLocaleString():'No valid check time recorded'}</p></article>)}</div>}
  </>}
 </section>;
}
