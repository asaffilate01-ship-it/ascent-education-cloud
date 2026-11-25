import MicrosoftAccountQueue from '@/components/classroom/MicrosoftAccountQueue';
import {useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Brand={id:string;tenant_id:string;name:string;primary_hex:string|null;logo_light_reference:string|null};
type Template={id:string;tenant_id:string;name:string;teams_brand_theme:string|null;recording_default:boolean;breakout:boolean};
type Account={id:string;tenant_id:string;institutional_email:string|null;role_type:string;provisioning_status:string;license_sku:string|null;provisioned_at:string|null;disabled_at:string|null};
type Section<T>={rows:T[];loading:boolean;error:boolean};
const initial=<T,>():Section<T>=>({rows:[],loading:true,error:false});
const unavailable=<T,>():Section<T>=>({rows:[],loading:false,error:true});
const string=(x:unknown):x is string=>typeof x==='string'&&x.length>0;
const nullable=(x:unknown):x is string|null=>x===null||typeof x==='string';
const instant=(x:unknown)=>x===null||typeof x==='string'&&Number.isFinite(Date.parse(x));
function checked<T>(result:any,tenant:string,valid:(r:any)=>boolean):Section<T>{
 if(result.error||!Array.isArray(result.data)||result.data.length>500||result.data.some((r:any)=>!r||r.tenant_id!==tenant||!string(r.id)||!valid(r))||new Set(result.data.map((r:any)=>r.id)).size!==result.data.length)return unavailable<T>();
 return {rows:result.data,loading:false,error:false};
}
export default function MicrosoftEducationAdmin(){
 const {user,loading}=useAuth();
 const allowed=!loading&&!!user?.id&&!!user.tenantId&&user.role==='centre_director'&&user.roles?.includes('centre_director')===true;
 return <DashboardLayout title="UniPathway Teams setup" subtitle="Institutional identity, branding and teaching readiness">
  {loading?<p role="status">Checking your centre permissions…</p>:!allowed?<p role="alert">A verified centre director with an assigned centre is required.</p>:<MicrosoftSetup key={[user.id,user.tenantId,user.role,user.roles.join(',')].join(':')} tenant={user.tenantId}/>}
 </DashboardLayout>;
}
function MicrosoftSetup({tenant}:{tenant:string}){
 const [brand,setBrand]=useState<Section<Brand>>(initial),[templates,setTemplates]=useState<Section<Template>>(initial),[accounts,setAccounts]=useState<Section<Account>>(initial);
 const [refresh,setRefresh]=useState(0),[query,setQuery]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;setBrand(initial());setTemplates(initial());setAccounts(initial());setPage(0);
  const load=async<T,>(request:()=>PromiseLike<any>,valid:(r:any)=>boolean,set:(v:Section<T>)=>void)=>{
   try{const result=await request();if(active)set(checked<T>(result,tenant,valid));}catch{if(active)set(unavailable());}
  };
  void load<Brand>(()=>db.from('microsoft_brand_profiles').select('id,tenant_id,name,primary_hex,logo_light_reference').eq('tenant_id',tenant).eq('active',true).order('id').limit(501),r=>string(r.name)&&nullable(r.primary_hex)&&nullable(r.logo_light_reference),setBrand);
  void load<Template>(()=>db.from('teams_class_templates').select('id,tenant_id,name,teams_brand_theme,recording_default,breakout').eq('tenant_id',tenant).eq('active',true).order('id').limit(501),r=>string(r.name)&&nullable(r.teams_brand_theme)&&typeof r.recording_default==='boolean'&&typeof r.breakout==='boolean',setTemplates);
  void load<Account>(()=>db.from('microsoft_education_accounts').select('id,tenant_id,institutional_email,role_type,provisioning_status,license_sku,provisioned_at,disabled_at').eq('tenant_id',tenant).order('id').limit(501),r=>nullable(r.institutional_email)&&['student','lecturer','staff','moderator'].includes(r.role_type)&&string(r.provisioning_status)&&nullable(r.license_sku)&&instant(r.provisioned_at)&&instant(r.disabled_at),setAccounts);
  return()=>{active=false;};
 },[tenant,refresh]);
 const filtered=useMemo(()=>accounts.rows.filter(a=>[a.institutional_email||'',a.role_type,a.provisioning_status].some(s=>s.toLowerCase().includes(query.trim().toLowerCase()))),[accounts.rows,query]);
 const pages=Math.max(1,Math.ceil(filtered.length/20)),current=Math.min(page,pages-1);
 const status=(a:Account)=>a.disabled_at||['disabled','provisioned_disabled','suspended'].includes(a.provisioning_status)?'Sign-in disabled':a.provisioning_status==='ready'&&a.provisioned_at&&a.institutional_email&&a.license_sku?'Recorded ready; live check required':a.provisioning_status==='pending'?'Provisioning pending':'Requires review';
 return <div className="min-w-0 space-y-5">
  <MicrosoftAccountQueue key={tenant} tenantId={tenant}/>
  <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 space-y-2"><h2 className="font-semibold">Microsoft Teams delivery readiness</h2><p className="text-sm text-muted-foreground">UniPathway provides the learner portal, lesson entry, resources and archive. Microsoft controls its accounts, Teams client, meeting features, licences and retention. The saved setup below is not live provider verification.</p><Button variant="outline" disabled={brand.loading||templates.loading||accounts.loading} onClick={()=>{setBrand(initial());setTemplates(initial());setAccounts(initial());setRefresh(v=>v+1);}}>Refresh setup records</Button></section>
  <section className="rounded-xl border bg-card p-3 sm:p-5 space-y-3" aria-label="Institutional account records"><h2 className="font-semibold">Institutional account records</h2>
   {accounts.loading?<p role="status">Checking centre account mappings…</p>:accounts.error?<p role="alert" className="text-sm">Account records could not be verified or exceed the 500-record review limit. No partial counts or account details are shown.</p>:<>
    <dl className="grid gap-2 sm:grid-cols-3">{[['Recorded mappings',accounts.rows.length],['Sign-in disabled',accounts.rows.filter(a=>status(a)==='Sign-in disabled').length],['Recorded ready',accounts.rows.filter(a=>status(a)==='Recorded ready; live check required').length]].map(([k,v])=><div className="rounded-lg border p-3" key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>)}</dl>
    <label className="block text-sm font-medium">Search account mappings<input type="search" maxLength={120} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Institutional address, role or status"/></label>
    <p role="status" className="text-sm text-muted-foreground">{filtered.length} matching account mappings</p>
    {!filtered.length?<p className="text-sm">No matching account mappings.</p>:<ul className="grid gap-2 lg:grid-cols-2">{filtered.slice(current*20,current*20+20).map(a=><li key={a.id} className="min-w-0 space-y-1 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><p className="font-medium break-all">{a.institutional_email||'Address not recorded'}</p><p className="text-xs text-muted-foreground">{a.role_type} · {a.license_sku?'Licence allocation recorded':'Licence not confirmed'}</p><p>{status(a)}</p></li>)}</ul>}
    {pages>1&&<nav aria-label="Institutional account pages" className="flex flex-wrap items-center gap-2"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous mappings</Button><span>Page {current+1} of {pages}</span><Button variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next mappings</Button></nav>}
   </>}
  </section>
  <section className="grid gap-3 md:grid-cols-2">
   <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-5"><h2 className="font-semibold">Saved brand profiles</h2>{brand.loading?<p role="status">Checking branding…</p>:brand.error?<p role="alert" className="mt-2 text-sm">Brand profiles unavailable. Confirm the centre schema and permissions before configuring a theme.</p>:brand.rows.length?brand.rows.map(b=><p key={b.id} className="mt-2 text-sm [overflow-wrap:anywhere]">{b.name} · {b.primary_hex||'Colour missing'} · {b.logo_light_reference?'Logo reference saved':'Logo missing'}</p>):<p className="mt-2 text-sm">No saved brand profile.</p>}<p className="mt-3 text-xs text-muted-foreground">Saved records do not prove that a theme is applied in Microsoft.</p></div>
   <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-5"><h2 className="font-semibold">Saved teaching templates</h2>{templates.loading?<p role="status">Checking teaching templates…</p>:templates.error?<p role="alert" className="mt-2 text-sm">Teaching templates unavailable. Confirm the centre schema and permissions before use.</p>:templates.rows.length?templates.rows.map(t=><p key={t.id} className="mt-2 text-sm [overflow-wrap:anywhere]">{t.name} · theme {t.teams_brand_theme||'not linked'} · recording requested {t.recording_default?'yes':'no'} · breakouts planned {t.breakout?'yes':'no'}</p>):<p className="mt-2 text-sm">No teaching template saved.</p>}</div>
  </section>
  <section className="rounded-xl border bg-card p-3 sm:p-5 space-y-3"><h2 className="font-semibold">Microsoft administrator activation</h2><ol className="list-decimal space-y-2 pl-5 text-sm"><li>Verify the managed institutional domain and approved Microsoft 365/Teams licence allocation.</li><li>Complete secure administrator-led activation, password or passwordless onboarding and MFA.</li><li>Confirm Teams policies, recording notices, retention and private release controls.</li><li>Test real lecturer and learner accounts, invitations, teaching features and released-recording access.</li></ol><a className="inline-flex min-h-11 items-center underline text-sm" target="_blank" rel="noopener noreferrer" href="https://admin.teams.microsoft.com/">Open Microsoft Teams admin centre</a><p className="text-xs text-muted-foreground">This workspace does not request Graph credentials, enable accounts, allocate a new licence or mark a mailbox ready automatically.</p></section>
 </div>;
}
