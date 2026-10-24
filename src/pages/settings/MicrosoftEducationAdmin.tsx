import {useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Brand={id:string;name:string;primary_hex:string|null;logo_light_reference:string|null;teams_brand_theme?:string};
type Template={id:string;name:string;teams_brand_theme:string|null;recording_default:boolean;breakout:boolean};
type Account={id:string;institutional_email:string|null;role_type:string;provisioning_status:string;license_sku:string|null};
export default function MicrosoftEducationAdmin(){
 const {user}=useAuth();
 return <DashboardLayout title="UniPathway Teams setup" subtitle="Branding, institutional identity, teaching and recording readiness"><MicrosoftSetup key={`${user?.id}:${user?.tenantId}`} tenantId={user?.tenantId}/></DashboardLayout>;
}
function MicrosoftSetup({tenantId}:{tenantId?:string|null}){
 const [brand,setBrand]=useState<Brand[]>([]),[templates,setTemplates]=useState<Template[]>([]),[accounts,setAccounts]=useState<Account[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  if(!tenantId){setLoading(false);setError('Select a centre tenant before reviewing its Microsoft setup.');return;}
  void Promise.all([
   db.from('microsoft_brand_profiles').select('id,name,primary_hex,logo_light_reference').eq('tenant_id',tenantId).eq('active',true).limit(100),
   db.from('teams_class_templates').select('id,name,teams_brand_theme,recording_default,breakout').eq('tenant_id',tenantId).eq('active',true).limit(100),
   db.from('microsoft_education_accounts').select('id,institutional_email,role_type,provisioning_status,license_sku').eq('tenant_id',tenantId).order('id').limit(100),
  ]).then(([b,t,a])=>{if(!active)return;const failure=[b,t,a].find(r=>r.error);if(failure)throw new Error('Microsoft setup records could not be loaded. Check centre access and deployed schema.');setBrand(b.data||[]);setTemplates(t.data||[]);setAccounts(a.data||[]);})
   .catch(e=>{if(active){setError(e.message);setBrand([]);setTemplates([]);setAccounts([]);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[tenantId,refresh]);
 return <div className="space-y-5">
  <section className="rounded-xl border bg-primary/5 p-5"><h2 className="font-semibold">UniPathway experience, Microsoft Teams delivery</h2><p className="mt-2 text-sm">UniPathway owns the learner portal, lesson entry, resources and private archive. Native Teams provides live audio, video, breakout rooms, screen sharing and Microsoft Whiteboard. Teams Premium meeting themes can apply approved logos, colours and images; Microsoft’s client and identity remain visible.</p></section>
  {loading&&<p role="status">Loading saved centre configuration…</p>}{error&&<p role="alert">{error}</p>}
  <Button variant="outline" onClick={()=>setRefresh(n=>n+1)}>Refresh setup records</Button>
  {!loading&&!error&&<>
   <section className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border p-5"><h2 className="font-semibold">Saved brand profiles</h2>{brand.length?brand.map(b=><p key={b.id} className="mt-2 text-sm">{b.name} · {b.primary_hex||'Colour missing'} · {b.logo_light_reference?'Logo reference saved':'Logo missing'}</p>):<p className="mt-2 text-sm">No saved brand profile.</p>}<p className="mt-3 text-xs text-muted-foreground">Saved records do not confirm that the theme is applied in Microsoft 365.</p></div>
    <div className="rounded-xl border p-5"><h2 className="font-semibold">Saved teaching templates</h2>{templates.length?templates.map(t=><p key={t.id} className="mt-2 text-sm">{t.name} · theme: {t.teams_brand_theme||'not linked'} · recording requested: {t.recording_default?'yes':'no'} · breakouts planned: {t.breakout?'yes':'no'}</p>):<p className="mt-2 text-sm">No teaching template saved.</p>}</div></section>
   <section className="rounded-xl border p-5"><h2 className="font-semibold">Accessible institutional account records (first 100)</h2>{accounts.length?accounts.map(a=><p key={a.id} className="mt-2 text-sm">{a.institutional_email||'Email pending'} · {a.role_type} · {a.provisioning_status} · {a.license_sku||'Licence not recorded'}</p>):<p className="mt-2 text-sm">No Microsoft accounts mapped for this centre.</p>}</section>
  </>}
  <section className="rounded-xl border p-5 space-y-3"><h2 className="font-semibold">Microsoft administrator activation</h2>
   <ol className="list-decimal space-y-2 pl-5 text-sm"><li>Verify the institutional domain and work/school accounts; allocate suitable Microsoft 365/Teams licences to lecturers and students.</li><li>Apply UniPathway branding in Entra sign-in, meeting invitations and Teams Premium meeting themes. Assign Premium licences to the organisers who need branded themes.</li><li>Configure lobby admission, approved presenters, microphone permissions, breakout managers, screen sharing and Whiteboard policies. Run the organiser controls in Teams desktop.</li><li>Configure recording/transcription permissions, notices, OneDrive/SharePoint storage, retention and academic release responsibilities.</li><li>Connect Microsoft Graph recording retrieval to private archive ingestion, with admin consent and organiser application-access scope. This portal has not verified that connection.</li><li>Test lecturer, in-centre student and remote student accounts together: pairs, one-to-one support, class recall, shared audio, screen sharing, whiteboards and released-recording playback.</li></ol>
   <a className="block underline text-sm" target="_blank" rel="noopener noreferrer" href="https://admin.teams.microsoft.com/">Open Microsoft Teams admin centre</a>
   <a className="block underline text-sm" target="_blank" rel="noopener noreferrer" href="https://learn.microsoft.com/en-us/microsoftteams/meeting-themes">Microsoft meeting branding requirements</a>
  </section>
 </div>;
}
