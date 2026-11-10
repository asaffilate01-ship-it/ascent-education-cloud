import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {matchesLocalSearch} from '@/lib/localSearch';

const PAGE_SIZE=12;
type View='all'|'in_progress'|'offers'|'other';
const steps:Record<string,{label:string;detail:string;view:Exclude<View,'all'>}>={
  lead:{label:'Enquiry recorded',detail:'Admissions has an initial lead record; a formal application or place is not yet confirmed.',view:'in_progress'},
  contacted:{label:'Contact recorded',detail:'Staff have recorded contact activity. Eligibility and an offer are separate decisions.',view:'in_progress'},
  qualified:{label:'Initial review recorded',detail:'A preliminary review is on record. Your programme and entry requirements still require verification.',view:'in_progress'},
  applied:{label:'Application recorded',detail:'An application stage is recorded. The centre must independently verify supporting evidence.',view:'in_progress'},
  under_review:{label:'Under staff review',detail:'Admissions is reviewing the case. An offer or enrolment is not yet established.',view:'in_progress'},
  conditional_offer:{label:'Conditional offer stage recorded',detail:'Check any conditions with admissions. This status alone does not establish that a signed offer has been issued or accepted.',view:'offers'},
  unconditional_offer:{label:'Unconditional offer stage recorded',detail:'Confirm the formal offer document and acceptance with admissions before treating this as a place.',view:'offers'},
  deposit_paid:{label:'Deposit stage recorded',detail:'A pipeline stage is not verified payment settlement. Check your actual invoice and receipt with finance.',view:'offers'},
  enrolled:{label:'Enrolment stage recorded',detail:'Verify that your own active course enrolment is visible in My Courses. Stage status alone is not proof of course access.',view:'other'},
  deferred:{label:'Deferred status recorded',detail:'Contact admissions about the revised intake and any outstanding conditions.',view:'other'},
  lost:{label:'Case closed in admissions',detail:'Contact the centre if this does not match your understanding or you wish to enquire again.',view:'other'},
};
const unknown={label:'Status requires confirmation',detail:'Please ask admissions to explain the current recorded stage and any next step.',view:'other' as const};
const readableDate=(value:string|null|undefined)=>{
  if(!value||!Number.isFinite(Date.parse(value)))return null;
  return new Intl.DateTimeFormat('en-PK',{timeZone:'Asia/Karachi',day:'numeric',month:'short',year:'numeric'}).format(new Date(value));
};

export default function StudentApplications(){
  const {user,loading:authLoading}=useAuth();
  const allowed=!authLoading&&!!user?.id&&!!user?.tenantId&&user.role==='student'&&user.roles?.includes('student');
  const tenant=user?.tenantId||'';
  const student=user?.id||'';
  const records=useSupabaseQuery('applications',{
    enabled:allowed,
    // Project only learner-facing metadata. Never load agent notes or KYC documents.
    select:'id,tenant_id,user_id,programme_name,stage,created_at,updated_at',
    filters:[{column:'tenant_id',operator:'eq',value:tenant},{column:'user_id',operator:'eq',value:student}],
    orderBy:{column:'updated_at',ascending:false},
  });
  const [search,setSearch]=useState('');
  const [view,setView]=useState<View>('all');
  const [page,setPage]=useState(0);
  if(authLoading)return <DashboardLayout title="My applications"><p role="status">Checking your student access…</p></DashboardLayout>;
  if(!allowed)return <DashboardLayout title="My applications"><p role="alert">A verified student role and assigned centre are required. No applicant information was loaded.</p></DashboardLayout>;
  const own=records.data.filter(row=>row.tenant_id===tenant&&row.user_id===student);
  const filtered=own.filter(row=>(view==='all'||(steps[row.stage||'']||unknown).view===view)&&
    matchesLocalSearch(`${row.programme_name||''} ${(steps[row.stage||'']||unknown).label}`,search));
  const maxPage=Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1);
  const currentPage=Math.min(page,maxPage);
  const shown=filtered.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  const changeView=(value:View)=>{setView(value);setPage(0);};
  return <DashboardLayout title="My applications" subtitle="Track applications explicitly linked to your verified student account.">
    <section className="rounded-xl border bg-card p-4 sm:p-5" aria-label="Application scope">
      <h2 className="font-semibold">Your applications and enquiries</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">These are staff-recorded application stages, not official offer letters, payment confirmations or guaranteed places. Only cases linked to your account appear; earlier enquiries made before registering are not automatically matched by name or email.</p>
      <p className="mt-2 text-sm text-muted-foreground">For a missing enquiry, document request or correction, contact the admissions team rather than submitting identity documents through this page.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-accent" to="/contact?subject=Admissions%20Enquiry">Contact admissions</Link>
        <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-accent" to="/student/courses">Check active courses</Link>
      </div>
    </section>
    {records.loading?<p role="status" className="mt-5">Checking applications linked to your account…</p>
    :records.error?<section className="mt-5 rounded-xl border bg-card p-4" role="alert">
      <p>Your application records could not be verified. No empty or completion status is being assumed.</p>
      <Button className="mt-3" variant="outline" onClick={()=>void records.refetch()}>Retry applications</Button>
    </section>
    :<>
      {own.length>0&&<section className="mt-5 rounded-xl border bg-card p-4 sm:p-5" aria-label="Filter my applications">
        <label htmlFor="application-filter-search" className="block text-sm font-semibold">Search your applications</label>
        <Input id="application-filter-search" type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} className="mt-2 min-h-11" placeholder="Programme or recorded status"/>
        <div role="group" aria-label="Application stage filter" className="mt-3 flex flex-wrap gap-2">
          {([['all','All'],['in_progress','In progress'],['offers','Offer stages'],['other','Other statuses']] as const)
            .map(([key,label])=><Button key={key} type="button" variant={view===key?'default':'outline'} aria-pressed={view===key} onClick={()=>changeView(key)}>{label}</Button>)}
        </div>
        <p className="mt-3 text-sm text-muted-foreground" role="status">{filtered.length} of {own.length} linked application records match your filters</p>
      </section>}
      {own.length===0?<section className="mt-5 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">No account-linked applications found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This does not mean you have no previous enquiry. Ask admissions to check any earlier record and explain the identity-linking process.</p>
        <Link to="/apply" className="mt-3 inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-semibold">Explore study and application options</Link>
      </section>
      :filtered.length===0?<p className="mt-5 rounded-xl border bg-card p-5">No linked applications match this search. Clear the search or change the stage filter.</p>
      :<section className="mt-5 space-y-3" aria-label="Your linked application records">
        {shown.map(row=>{
          const info=steps[row.stage||'']||unknown;
          const date=readableDate(row.updated_at||row.created_at);
          return <article key={row.id} className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
            <p className="text-xs font-semibold text-success">{info.label}</p>
            <h2 className="mt-2 break-words text-lg font-semibold">{row.programme_name||'Programme to be confirmed'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{info.detail}</p>
            <p className="mt-3 text-xs text-muted-foreground">Reference: <span className="break-all">{row.id}</span>{date?` · Last recorded ${date} (Pakistan time)`:''}</p>
            {row.stage==='enrolled'&&<Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" to="/student/courses">Check my active enrolments</Link>}
          </article>;
        })}
        {filtered.length>PAGE_SIZE&&<nav aria-label="Application pages" className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={currentPage===0} onClick={()=>setPage(v=>Math.max(0,v-1))}>Previous page</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage+1} of {Math.ceil(filtered.length/PAGE_SIZE)}</span>
          <Button variant="outline" disabled={currentPage===maxPage} onClick={()=>setPage(v=>Math.min(maxPage,v+1))}>Next page</Button>
        </nav>}
      </section>}
    </>}
  </DashboardLayout>;
}
