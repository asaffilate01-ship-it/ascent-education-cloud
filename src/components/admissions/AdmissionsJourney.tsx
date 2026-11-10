import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {admissionsPath,admissionRoleWorkflow} from '@/lib/admissionsNavigation';

type Application={id:string;tenant_id:string;student_name:string;email:string;stage:string;user_id:string|null;
 programme_id:string|null;programme_name:string|null;intake:string|null;document_checklist:unknown};
type Kyc={id:string;document_type:string;status:string;verified_at:string|null;expiry_date:string|null};
type Enrolment={id:string;programme_id:string;application_id:string|null;status:string};
type Signature={id:string;document_type:string;signed_at:string};
type Invoice={id:string;amount:number;paid:number;status:string;sponsor_amount:number|null;sponsor_paid:number|null;sponsor_reference:string|null};
type Module={id:string;title:string;programme_id:string;lecturer_id:string|null};
type Lecture={id:string;module_id:string;day_of_week:number;start_time:string;end_time:string;room:string|null;is_active:boolean};
type State={kyc:Kyc[];enrolments:Enrolment[];signatures:Signature[];invoices:Invoice[];modules:Module[];lectures:Lecture[]};
const empty:State={kyc:[],enrolments:[],signatures:[],invoices:[],modules:[],lectures:[]};
export const admissionReadiness=(a:Application,state:State)=>{
 const confirmed=state.enrolments.some(e=>e.status==='active'&&e.application_id===a.id&&e.programme_id===a.programme_id);
 // A status label alone is not proof of a completed verification. Require a
 // real verification timestamp and reject future-dated or expired evidence.
 const now=Date.now(),today=new Date(now).toISOString().slice(0,10);
 const kycVerified=state.kyc.some(d=>['passport','cnic','identity','national_id'].includes(d.document_type)&&
   d.status==='verified'&&typeof d.verified_at==='string'&&Number.isFinite(Date.parse(d.verified_at))&&
   Date.parse(d.verified_at)<=now&&(!d.expiry_date||d.expiry_date>=today));
 const requiredDocs=state.kyc.filter(d=>d.status==='verified'&&typeof d.verified_at==='string'&&
   Number.isFinite(Date.parse(d.verified_at))&&Date.parse(d.verified_at)<=now&&
   (!d.expiry_date||d.expiry_date>=today));
 const liveModules=state.modules.filter(m=>m.programme_id===a.programme_id);
 const allocatedLecturers=liveModules.filter(m=>!!m.lecturer_id);
 const activeLessons=state.lectures.filter(l=>l.is_active&&liveModules.some(m=>m.id===l.module_id));
 return [
  {key:'application',title:'Application and programme link',status:a.programme_id?'recorded':'review',detail:a.programme_id?'Programme reference is recorded; verify the qualification, intake, entry conditions and centre approval.':'Choose a verified programme or supported non-qualification service. A free-text programme name is not an allocation.',to:'/admissions/applications'},
  {key:'identity',title:'Identity and academic evidence',status:kycVerified?'recorded':'review',detail:kycVerified?`Identity document has dated verification evidence; ${requiredDocs.length} validly verified document(s) for this learner in the centre. Academic credentials and applicant matching still require review.`:'No current identity document with a dated, non-expired verification is confirmed. Staff must check official KYC, student identity and academic records.',to:'/documents'},
  {key:'eligibility',title:'Entry and awarding-body eligibility',status:'manual',detail:'No programme-specific entry-decision record is confirmed from this application. Check evidence, qualification prerequisites and recognition scope before an offer.',to:'/admissions/eligibility'},
  {key:'funding',title:'Funding, fee schedule and payment',status:'manual',detail:state.invoices.length
  ?`${state.invoices.length} learner-level invoice record(s) were found, but invoices have no application link. These do not prove funding approval or payment settlement for this application. Finance must verify the invoice, payer and receipt independently.`
  :'No learner-level invoice record was found. This does not prove that an application is unpaid; scholarship, sponsor and payment evidence require an independent finance decision.',to:'/director/funding'},
  {key:'offer',title:'Offer review and acceptance',status:'manual',detail:state.signatures.length
  ?`${state.signatures.length} learner-level signed document record(s) were found, but they are not linked to this application. A formal offer and its acceptance still require document-specific verification.`
  :'No learner-level electronic signature record was found. Do not infer an offer, acceptance or automatic conversion from a pipeline stage.',to:'/admissions/offers'},
  {key:'enrolment',title:'Academic enrolment',status:confirmed?'recorded':'review',detail:confirmed?'An active enrolment references this exact application and programme.':'No confirmed academic handover matching this application. Use the admissions review workflow, not a kanban stage drag.',to:'/admissions'},
  {key:'modules',title:'Correct modules and lecturer allocation',status:confirmed&&liveModules.length>0?'recorded':'review',detail:confirmed?`${liveModules.length} associated module(s), ${allocatedLecturers.length} lecturer allocation(s). Confirm each active timetable and learner entitlement.`:'Module access must derive from a verified active programme enrolment. No standalone module allocation is confirmed.',to:'/director/programmes'},
  {key:'schedule',title:'Intake dates, sessions and invitations',status:confirmed&&activeLessons.length?'recorded':'review',detail:`Application intake: ${a.intake||'not recorded'}. ${activeLessons.length} active recurring lecture(s). Dates, cohort placement and live-class invitations need separate checking.`,to:'/director/schedule'},
  {key:'card',title:'Student ID card and document issuance',status:'manual',detail:'No verified physical/digital ID-card issuance record is linked to this application. Identity approval is not proof that a student card was generated or delivered.',to:'/director/students'}
 ] as const;
};
const activeRoles=new Set(['admissions_admin','centre_director']);
export default function AdmissionsJourney({application}:{application:Application}){
 const {user}=useAuth();
 const location=useLocation();
 const permitted=Boolean(user?.id&&user?.tenantId===application.tenant_id&&user.role&&activeRoles.has(user.role)&&user.roles?.includes(user.role));
 const [state,setState]=useState<State>(empty),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const tenant=application.tenant_id,student=application.user_id,programme=application.programme_id;
 const load=useCallback(async(current:()=>boolean)=>{
  setLoading(true);setError('');setState(empty);
  if(!permitted){setLoading(false);return;}
  try{
   const [kyc,signatures,enrolments,invoices,modules]=await Promise.all([
    student?pagedRows<Kyc>(()=>db.from('kyc_documents').select('id,document_type,status,verified_at,expiry_date')
     .eq('tenant_id',tenant).eq('user_id',student),current):Promise.resolve([]),
    student?pagedRows<Signature>(()=>db.from('e_signatures').select('id,document_type,signed_at')
     .eq('tenant_id',tenant).eq('user_id',student),current):Promise.resolve([]),
    student?pagedRows<Enrolment>(()=>db.from('student_enrolments').select('id,programme_id,application_id,status')
     .eq('tenant_id',tenant).eq('student_id',student),current):Promise.resolve([]),
    student?pagedRows<Invoice>(()=>db.from('invoices').select('id,amount,paid,status,sponsor_amount,sponsor_paid,sponsor_reference')
     .eq('tenant_id',tenant).eq('student_id',student),current):Promise.resolve([]),
    programme?pagedRows<Module>(()=>db.from('modules').select('id,title,programme_id,lecturer_id')
     .eq('tenant_id',tenant).eq('programme_id',programme),current):Promise.resolve([])
   ]);
   const lectures=modules.length?await rowsByIds<Lecture>(modules.map(m=>m.id),ids=>()=>db.from('scheduled_lectures')
    .select('id,module_id,day_of_week,start_time,end_time,room,is_active').eq('tenant_id',tenant).in('module_id',ids),current):[];
   if(current())setState({kyc,enrolments,signatures,invoices,modules,lectures});
  }catch{if(current())setError('Verification records could not be read completely. No readiness or allocation decisions can be made.');}
  finally{if(current())setLoading(false);}
 },[permitted,tenant,student,programme]);
 useEffect(()=>{let current=true;void load(()=>current);return()=>{current=false;};},[load,revision]);
 const checks=useMemo(()=>admissionReadiness(application,state),[application,state]);
 if(!permitted)return <p role="alert">An assigned admissions or centre-director role is required to view applicant checks.</p>;
 return <section className="min-w-0 [overflow-wrap:anywhere] rounded-xl border bg-card p-4 sm:p-5 space-y-4" aria-label="Application verification and enrolment checklist">
  <div className="flex flex-wrap items-start justify-between gap-2">
   <div className="min-w-0"><h3 className="font-semibold">Application readiness: {application.student_name}</h3>
    <p className="text-sm text-muted-foreground">Evidence tracking only. A record is not an official approval or automatic acceptance.</p></div>
   <Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Recheck source records</Button>
  </div>
  {loading&&<p role="status">Checking KYC, funding, offers, enrolment, modules and teaching dates…</p>}
  {error&&<p role="alert">{error}</p>}
  {/* Keep at most two columns, and let enlarged text raise each card's minimum width. */}
  {!loading&&!error&&<>
   <div className="rounded-lg border bg-secondary/30 p-3 text-sm" role="status">
    <p className="font-semibold">{checks.filter(item=>item.status!=='recorded').length} of {checks.length} checks still require source verification or an independent decision</p>
    <p className="mt-1 text-muted-foreground">A recorded source is not an approved admission. Learner-level invoices and signatures are not application-linked, and must never be treated as proof of an accepted offer or settled fee.</p>
   </div>
   <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,max(18rem,calc(50%_-_0.375rem))),1fr))] gap-3">
   {checks.map(item=>{const destination=admissionRoleWorkflow(item.to,user!.role);return <article key={item.key} className="min-w-0 rounded-xl border p-4">
    <h4 className="font-semibold text-sm">{item.title}</h4>
    <p className="mt-1 text-xs text-muted-foreground">{item.status==='recorded'?'Source record found · not approval':item.status==='manual'?'Manual independent decision required':'Verification outstanding'}</p>
    <p className="mt-2 text-sm leading-relaxed">{item.detail}</p>
    {destination.handoff&&<p className="mt-2 text-xs leading-relaxed text-muted-foreground" role="note">{destination.handoff}</p>}
    <Link className="mt-3 inline-flex min-h-11 min-w-0 max-w-full items-center whitespace-normal rounded-lg border px-3 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={admissionsPath(destination.path,location.search,application.id)} aria-label={`Open related workflow: ${item.title}`}>{destination.handoff?'Review applicant evidence':'Open related workflow'}</Link>
   </article>})}
  </div></>}
 </section>;
}
