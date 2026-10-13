import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Award, BookOpen, Building2, ExternalLink, Globe2, Plus, Search, ShieldCheck } from 'lucide-react';

type PartnerKind = 'recruitment_group'|'awarding_body'|'pathway_provider'|'application_platform'|'university'|'language_provider';
type Relationship = 'prospect'|'contacted'|'application_submitted'|'due_diligence'|'contracted'|'active'|'suspended'|'rejected';
interface Partner {
 id: string; name: string; slug: string; partner_kind: PartnerKind; countries: string[];
 website: string | null; relationship_status: Relationship; accreditation_status: string;
 agreement_signed_on: string | null; next_action: string | null; notes: string | null;
}
interface Route {
 id: string; partner_id: string; route_name: string; qualification_name: string | null; qualification_level: string | null;
 destination_country: string; destination_institution: string; destination_programme: string;
 entry_stage: string | null; review_status: string; student_visible: boolean;
}
const KINDS: { value: PartnerKind; label: string }[] = [
 { value:'recruitment_group',label:'Recruitment groups' },
 { value:'awarding_body',label:'Awarding bodies' },
 { value:'pathway_provider',label:'Pathway providers' },
 { value:'application_platform',label:'Application platforms' },
 { value:'university',label:'Universities' },
 { value:'language_provider',label:'Language providers' },
];
const COUNTRIES = ['UK','USA','Canada','Australia','Germany','France','Malta','UAE','Ireland','Europe','New Zealand'];
const editableStatuses: Relationship[] = ['prospect','contacted','application_submitted','due_diligence','suspended','rejected'];
const label = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const cleanSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);

export default function GlobalEducationPartners() {
 const { user } = useAuth();
 const tenantId = user?.tenantId;
 const canManage = user?.roles?.some(r=>['centre_director','superadmin'].includes(r)) ?? false;
 const [partners,setPartners] = useState<Partner[]>([]);
 const [routes,setRoutes] = useState<Route[]>([]);
 const [loading,setLoading] = useState(true);
 const [busy,setBusy] = useState(false);
 const [search,setSearch] = useState('');
 const [kind,setKind] = useState('all');
 const [country,setCountry] = useState('all');
 const [tab,setTab] = useState<'partners'|'routes'>('partners');
 const [showPartnerForm,setShowPartnerForm] = useState(false);
 const [newName,setNewName] = useState('');
 const [newKind,setNewKind] = useState<PartnerKind>('recruitment_group');
 const [newCountries,setNewCountries] = useState('UK');
 const [newUrl,setNewUrl] = useState('');
 const [showRouteForm,setShowRouteForm] = useState(false);
 const [routePartnerId,setRoutePartnerId] = useState('');
 const [routeAwarder,setRouteAwarder] = useState('');
 const [routeQualification,setRouteQualification] = useState('');
 const [routeLevel,setRouteLevel] = useState('Level 5');
 const [routeCountry,setRouteCountry] = useState('UK');
 const [routeInstitution,setRouteInstitution] = useState('');
 const [routeProgramme,setRouteProgramme] = useState('');
 const [routeEntry,setRouteEntry] = useState('');

 async function load() {
  if (!tenantId) { setLoading(false); return; }
  setLoading(true);
  const [p,r] = await Promise.all([
   supabase.from('international_education_partners' as any).select('*').eq('tenant_id',tenantId).order('name'),
   supabase.from('international_pathway_routes' as any).select('*').eq('tenant_id',tenantId).order('created_at',{ascending:false})
  ]);
  if(p.error) toast.error('Could not load partner records: '+p.error.message);
  if(r.error) toast.error('Could not load progression routes: '+r.error.message);
  setPartners((p.data||[]) as unknown as Partner[]);
  setRoutes((r.data||[]) as unknown as Route[]);
  setLoading(false);
 }
 useEffect(()=>{ void load(); },[tenantId]);
 const filtered = useMemo(()=>partners.filter(p=>
  (kind==='all'||p.partner_kind===kind) && (country==='all'||p.countries?.includes(country)) &&
  [p.name,p.partner_kind,p.relationship_status].join(' ').toLowerCase().includes(search.toLowerCase())
 ),[partners,kind,country,search]);
 const filteredRoutes = useMemo(()=>routes.filter(r=>
   (country==='all'||r.destination_country===country) &&
   [r.route_name,r.destination_institution,r.destination_programme,r.qualification_name||''].join(' ').toLowerCase().includes(search.toLowerCase())
 ),[routes,country,search]);
 const addPartner = async (event: React.FormEvent) => {
  event.preventDefault();
  if(!tenantId || !canManage) return;
  const name=newName.trim();
  if(!name) return toast.error('Enter a partner name');
  const url = newUrl.trim();
  if(url && !/^https:\/\//i.test(url)) return toast.error('Use an https:// website URL');
  const slug=cleanSlug(name);
  if(!slug) return toast.error('Enter a valid partner name');
  setBusy(true);
  const {error}=await supabase.from('international_education_partners' as any).insert({
   tenant_id:tenantId, name,slug,partner_kind:newKind,relationship_status:'prospect',
   countries:newCountries.split(',').map(x=>x.trim()).filter(Boolean), website:url||null,
  } as any);
  setBusy(false);
  if(error) return toast.error(error.message);
  toast.success('Added as an unverified prospective partner');
  setNewName('');setNewUrl('');setShowPartnerForm(false);await load();
 };
 const setStatus = async (partner:Partner,status:Relationship) => {
  if(!canManage||!tenantId)return;
  if(status==='active'||status==='contracted') return toast.error('Signed agreement evidence is required before activation');
  setBusy(true);
  const {error}=await supabase.from('international_education_partners' as any)
   .update({relationship_status:status,updated_at:new Date().toISOString()} as any).eq('id',partner.id).eq('tenant_id',tenantId);
  setBusy(false);
  if(error) return toast.error(error.message);
  toast.success('Partner outreach status saved');await load();
 };
 const addRoute=async(event:React.FormEvent)=>{
  event.preventDefault();
  if(!tenantId||!canManage)return;
  if(!routePartnerId||!routeQualification.trim()||!routeInstitution.trim()||!routeProgramme.trim()) return toast.error('Complete the required route fields');
  setBusy(true);
  const {error}=await supabase.from('international_pathway_routes' as any).insert({
   tenant_id:tenantId, partner_id:routePartnerId, awarding_body_id:routeAwarder||null,
   route_name:`${routeQualification.trim()} → ${routeProgramme.trim()}`,
   qualification_name:routeQualification.trim(),qualification_level:routeLevel.trim(),
   destination_country:routeCountry,destination_institution:routeInstitution.trim(),
   destination_programme:routeProgramme.trim(),entry_stage:routeEntry.trim()||null,
   review_status:'proposed',student_visible:false,pathway_type:'progression_review'
  } as any);
  setBusy(false);
  if(error)return toast.error(error.message);
  toast.success('Pathway proposal saved. Evidence and institution approval must be verified before publication.');
  setShowRouteForm(false);setRouteQualification('');setRouteInstitution('');setRouteProgramme('');await load();
 };
 const counts=[
  {label:'Organisations identified',value:partners.length,icon:Building2},
  {label:'Signed or active',value:partners.filter(p=>['contracted','active'].includes(p.relationship_status)).length,icon:ShieldCheck},
  {label:'Routes under review',value:routes.filter(r=>r.review_status!=='verified').length,icon:BookOpen},
  {label:'Verified routes',value:routes.filter(r=>r.review_status==='verified').length,icon:Award}
 ];
 return <DashboardLayout title="Global Education Partnerships" subtitle="Recruitment groups, awarding bodies and verified international study pathways">
  <div className="rounded-xl border border-amber-300/40 bg-amber-100/30 dark:bg-amber-900/10 p-4 mb-5 text-sm">
   <strong>Internal research catalogue.</strong> Listings are potential partners, not contracted relationships. Only authorised, evidence-verified programmes may be advertised to students. No platform API or university admissions agreement is implied.
  </div>
  {!tenantId && <div role="alert" className="surface-card p-5 mb-5 text-sm">Your user profile has no tenant assignment. Ask the platform administrator to assign a centre before managing partnerships.</div>}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{counts.map(c=><div key={c.label} className="surface-card p-4"><div className="flex items-center justify-between text-xs text-muted-foreground">{c.label}<c.icon className="w-4 h-4"/></div><p className="text-2xl font-semibold mt-2">{loading?'…':c.value}</p></div>)}</div>
  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
   <div className="flex bg-muted/50 rounded-lg p-1 gap-1" role="tablist">
    <button role="tab" aria-selected={tab==='partners'} onClick={()=>setTab('partners')} className={`text-sm px-4 py-2 rounded-md ${tab==='partners'?'bg-background shadow font-semibold':'text-muted-foreground'}`}>Organisations</button>
    <button role="tab" aria-selected={tab==='routes'} onClick={()=>setTab('routes')} className={`text-sm px-4 py-2 rounded-md ${tab==='routes'?'bg-background shadow font-semibold':'text-muted-foreground'}`}>Study pathways</button>
   </div>
   {canManage&&tenantId&&<Button size="sm" onClick={()=>tab==='partners'?setShowPartnerForm(v=>!v):setShowRouteForm(v=>!v)}><Plus className="h-4 w-4 mr-2"/> {tab==='partners'?'Add organisation':'Propose pathway'}</Button>}
  </div>
  {canManage && showPartnerForm && tab==='partners' && <form onSubmit={addPartner} className="surface-card p-5 mb-4 grid md:grid-cols-2 gap-3">
   <label className="text-xs font-medium">Organisation name <Input required value={newName} onChange={e=>setNewName(e.target.value)}/></label>
   <label className="text-xs font-medium">Type <select className="w-full h-10 rounded-md bg-background border px-3" value={newKind} onChange={e=>setNewKind(e.target.value as PartnerKind)}>{KINDS.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
   <label className="text-xs font-medium">Countries (comma separated) <Input value={newCountries} onChange={e=>setNewCountries(e.target.value)}/></label>
   <label className="text-xs font-medium">Website (optional) <Input type="url" placeholder="https://" value={newUrl} onChange={e=>setNewUrl(e.target.value)}/></label>
   <div className="md:col-span-2"><Button size="sm" type="submit" disabled={busy}>Save unverified prospect</Button></div>
  </form>}
  {canManage && showRouteForm && tab==='routes' && <form onSubmit={addRoute} className="surface-card p-5 mb-4 grid md:grid-cols-2 gap-3">
   <label className="text-xs font-medium">Recruitment/pathway partner <select required className="w-full h-10 rounded-md bg-background border px-3" value={routePartnerId} onChange={e=>setRoutePartnerId(e.target.value)}><option value="">Choose organisation</option>{partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="text-xs font-medium">Awarding body (optional) <select className="w-full h-10 rounded-md bg-background border px-3" value={routeAwarder} onChange={e=>setRouteAwarder(e.target.value)}><option value="">None</option>{partners.filter(p=>p.partner_kind==='awarding_body').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="text-xs font-medium">Qualification <Input required placeholder="e.g. Diploma in Business" value={routeQualification} onChange={e=>setRouteQualification(e.target.value)}/></label>
   <label className="text-xs font-medium">Qualification level <Input value={routeLevel} onChange={e=>setRouteLevel(e.target.value)}/></label>
   <label className="text-xs font-medium">Destination <select className="w-full h-10 rounded-md bg-background border px-3" value={routeCountry} onChange={e=>setRouteCountry(e.target.value)}>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></label>
   <label className="text-xs font-medium">Expected entry stage <Input placeholder="Under review — no guarantee" value={routeEntry} onChange={e=>setRouteEntry(e.target.value)}/></label>
   <label className="text-xs font-medium">Destination institution <Input required value={routeInstitution} onChange={e=>setRouteInstitution(e.target.value)}/></label>
   <label className="text-xs font-medium">Degree programme <Input required value={routeProgramme} onChange={e=>setRouteProgramme(e.target.value)}/></label>
   <div className="md:col-span-2 text-xs text-muted-foreground">New pathways are always unpublished proposals until institution-specific evidence and authorised review are completed.</div>
   <div className="md:col-span-2"><Button size="sm" type="submit" disabled={busy}>Save proposed route</Button></div>
  </form>}
  <div className="flex flex-col sm:flex-row gap-3 mb-4">
   <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search organisations or pathways" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   {tab==='partners' && <select aria-label="Partner type" className="h-10 rounded-md border px-3 bg-background text-sm" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option>{KINDS.map(k=><option value={k.value} key={k.value}>{k.label}</option>)}</select>}
   <select aria-label="Destination country" className="h-10 rounded-md border px-3 bg-background text-sm" value={country} onChange={e=>setCountry(e.target.value)}><option value="all">All countries</option>{COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
  </div>
  {loading?<div className="surface-card p-8 text-sm text-muted-foreground text-center">Loading partnerships…</div>:tab==='partners'?<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
   {filtered.map(p=><article key={p.id} className="surface-card p-5 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-sm">{p.name}</h3><p className="text-xs text-muted-foreground mt-1">{label(p.partner_kind)}</p></div><Globe2 className="w-4 h-4 text-muted-foreground flex-none"/></div>
    <div className="text-xs text-muted-foreground flex flex-wrap gap-1">{p.countries?.map(c=><span key={c} className="bg-muted/60 px-2 py-1 rounded-md">{c}</span>)}</div>
    <div className="text-xs"><span className="font-semibold">Relationship:</span> {label(p.relationship_status)}</div>
    <div className="text-xs"><span className="font-semibold">Accreditation:</span> {label(p.accreditation_status)}</div>
    {p.website&&<a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Official website <ExternalLink className="w-3.5 h-3.5"/></a>}
    {canManage && <label className="mt-auto text-xs text-muted-foreground">Outreach status
     <select aria-label={`Update ${p.name} outreach status`} className="w-full h-9 mt-1 rounded-md bg-background border px-2" disabled={busy} value={p.relationship_status} onChange={e=>void setStatus(p,e.target.value as Relationship)}>
      {!editableStatuses.includes(p.relationship_status)&&<option value={p.relationship_status}>{label(p.relationship_status)} — contract controlled</option>}
      {editableStatuses.map(s=><option key={s} value={s}>{label(s)}</option>)}
     </select>
    </label>}
   </article>)}
   {filtered.length===0&&<div className="surface-card p-8 text-sm text-muted-foreground">No organisations match these filters.</div>}
  </div>:<div className="space-y-3">
   {filteredRoutes.map(r=><article className="surface-card p-5" key={r.id}>
    <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
     <div><h3 className="font-semibold text-sm">{r.route_name}</h3><p className="text-sm text-muted-foreground mt-1">{r.destination_institution} · {r.destination_country}</p></div>
     <span className="text-xs rounded-full px-3 py-1 bg-muted h-fit">{label(r.review_status)} · {r.student_visible?'Published':'Internal only'}</span>
    </div>
    <p className="text-xs text-muted-foreground mt-3">{r.qualification_name||'Qualification TBC'} {r.qualification_level||''} → {r.destination_programme} · {r.entry_stage||'Entry stage not confirmed'}</p>
    {r.review_status!=='verified'&&<p className="text-xs text-amber-700 dark:text-amber-400 mt-2">Not a confirmed progression agreement. Requires institutional verification.</p>}
   </article>)}
   {filteredRoutes.length===0&&<div className="surface-card p-8 text-sm text-muted-foreground">No proposed pathways yet. Create one for formal university eligibility review.</div>}
  </div>}
 </DashboardLayout>;
}
