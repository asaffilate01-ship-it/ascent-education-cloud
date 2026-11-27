import ApplicationReviewQueue from '@/components/admissions/ApplicationReviewQueue';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { UserPlus, FileText, Award, TrendingUp, LayoutGrid, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {Link,useSearchParams} from 'react-router-dom';
import AddLeadModal from '@/components/modals/AddLeadModal';
import KanbanBoard from '@/components/admissions/KanbanBoard';
import AdmissionHandover from '@/components/admissions/AdmissionHandover';
import ServiceActivationQueue from '@/components/admissions/ServiceActivationQueue';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { admissionsPath, applicationReviewAction } from '@/lib/admissionsNavigation';
import {matchesLocalSearch} from '@/lib/localSearch';
import {consultationTriage,parseConsultationLead} from '@/lib/consultationTriage';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'conditional_offer', label: 'Conditional' },
  { key: 'unconditional_offer', label: 'Unconditional' },
  { key: 'deposit_paid', label: 'Deposit Paid' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'lost', label: 'Lost' },
];

const stageVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (['enrolled', 'deposit_paid'].includes(s)) return 'success';
  if (['conditional_offer', 'unconditional_offer'].includes(s)) return 'info';
  if (['under_review', 'applied'].includes(s)) return 'warning';
  if (['lost', 'deferred'].includes(s)) return 'danger';
  return 'neutral';
};

export default function AdmissionsCRM() {
  const {user}=useAuth();
  return <AdmissionsWorkspace key={JSON.stringify([user?.id,user?.tenantId,user?.role,user?.roles])}/>;
}

function AdmissionsWorkspace() {
  const {user}=useAuth();
  const tenant=user?.tenantId||'';
  const canWork=!!user?.id&&!!tenant&&!!user.role&&['admissions_admin','centre_director'].includes(user.role)&&user.roles?.includes(user.role);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [pageState,setPageState]=useState({filter:'',index:0});
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'kanban' ? 'kanban' : 'table';
  const search = params.get('q') || '';
  const stageFilter = PIPELINE_STAGES.some(stage => stage.key === params.get('stage')) ? params.get('stage')! : 'all';
  const destFilter = ['pakistan', 'germany', 'uk', 'usa', 'canada', 'australia'].includes(params.get('destination') || '') ? params.get('destination')! : 'all';
  const sourceFilter = ['ielts', 'university', 'consultation'].includes(params.get('source') || '') ? params.get('source')! : 'all';
  const setFilter = (key: 'q' | 'stage' | 'source' | 'destination' | 'view', value: string) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      if (!value || value === 'all' || (key === 'view' && value === 'table')) next.delete(key);
      else next.set(key, value);
      return next;
    }, {replace: true});
  };
  const { data: applications, loading, error, refetch } = useSupabaseQuery('applications', {
    enabled:canWork,filters:[{column:'tenant_id',operator:'eq',value:tenant}],
    orderBy: { column: 'updated_at', ascending: false },
  });

  if(!canWork)return <DashboardLayout title="Admissions Pipeline"><p role="alert">A verified Admissions Admin or Centre Director role and a centre assignment are required.</p></DashboardLayout>;
  if (loading) return <DashboardLayout title="Admissions Pipeline"><DashboardSkeleton /></DashboardLayout>;
  if(error)return <DashboardLayout title="Admissions Pipeline"><div role="alert" className="rounded border border-destructive p-4">Applications could not be loaded. <Button onClick={()=>void refetch()}>Retry</Button></div></DashboardLayout>;

  const scoped=applications.filter(app=>app.tenant_id===tenant);
  const consultationQueue=consultationTriage(scoped,tenant);
  const filtered = scoped.filter((app) => {
    if (stageFilter !== 'all' && app.stage !== stageFilter) return false;
    const source = (app.source || '').toLowerCase();
    if (sourceFilter === 'consultation' && !parseConsultationLead(app)) return false;
    if (sourceFilter === 'ielts' && source !== 'ielts_preparation') return false;
    if (sourceFilter === 'university' && !source.startsWith('university_progression_')) return false;
    if (destFilter !== 'all') {
      const d = (app as any).destination || (source.startsWith('consultancy_') ? source.replace('consultancy_', '') : source.startsWith('university_progression_') ? source.replace('university_progression_', '') : 'pakistan');
      if (String(d).toLowerCase() !== destFilter) return false;
    }
    if (search.trim()) return matchesLocalSearch([app.student_name,app.email,app.programme_name,app.counsellor,source].filter(Boolean).join(' '),search);

    return true;
  });

  const filterKey=JSON.stringify([search,stageFilter,destFilter,sourceFilter,view]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/25));
  const page=Math.min(pageState.filter===filterKey?pageState.index:0,pageCount-1);
  const visible=filtered.slice(page*25,page*25+25);
  const pagination=(className:string)=>filtered.length>25&&<nav aria-label="Application pages" className={className+' mt-4 flex-wrap items-center gap-3'}>
    <Button variant="outline" disabled={page===0} onClick={()=>setPageState({filter:filterKey,index:page-1})}>Previous applications</Button>
    <span className="text-sm">Page {page+1} of {pageCount}</span>
    <Button variant="outline" disabled={page+1>=pageCount} onClick={()=>setPageState({filter:filterKey,index:page+1})}>Next applications</Button>
  </nav>;
  const totalLeads = scoped.length;
  const applied = scoped.filter((a) => !['lead', 'contacted', 'qualified', 'lost'].includes(a.stage)).length;
  const offers = scoped.filter((a) => ['conditional_offer', 'unconditional_offer'].includes(a.stage)).length;
  const enrolled = scoped.filter((a) => a.stage === 'enrolled').length;

  return (
    <DashboardLayout
      title="Admissions Pipeline"
      subtitle="Review offers, enrol learners and follow up on applications"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center rounded-md border border-border overflow-hidden">
            <button
              aria-label="Kanban view" aria-pressed={view === 'kanban'} onClick={() => setFilter('view', 'kanban')}
              className={`min-h-11 min-w-11 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              aria-label="Table view" aria-pressed={view === 'table'} onClick={() => setFilter('view', 'table')}
              className={`min-h-11 min-w-11 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button onClick={() => setAddLeadOpen(true)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> New Lead
          </Button>
        </div>
      }
    >
      <ApplicationReviewQueue kind="student" />
      <section className="mb-5 rounded-xl border bg-card p-4" aria-label="Admissions review tasks">
       <h2 className="font-semibold">Application checks and handover</h2>
       <p className="mt-1 text-sm text-muted-foreground">Review identity, eligibility, finance, accepted offers, correct programme and module access before enrolment. No stage drag proves identity or payment.</p>
       <div className="mt-3 flex flex-wrap gap-2">{[
        ['Identity documents','/admissions/documents'],['Eligibility','/admissions/eligibility'],['Offers & acceptance','/admissions/offers'],['Module allocation','/admissions/allocations']
       ].map(([name,to])=><Link key={to} to={admissionsPath(to, params.toString(), null)} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{name}</Link>)}</div>
      </section>
      <section className="mb-5 rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="consultation-triage-title">
       <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="consultation-triage-title" className="font-semibold">Consultation request triage</h2><p className="mt-1 text-sm text-muted-foreground">{consultationQueue.length} recognised early-stage consultation requests</p></div><Button variant="outline" onClick={()=>setParams(current=>{const next=new URLSearchParams(current);next.set('source','consultation');next.delete('q');next.delete('stage');next.delete('destination');return next;})}>Filter consultation enquiries</Button></div>
       <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Applicant-entered preferences from the existing contact form. Requests are not confirmed appointments; edited messages may require manual review. Review the original enquiry and confirm adviser availability, date and fees before contacting applicants.</p>
       {consultationQueue.length===0?<p className="mt-3 text-sm text-muted-foreground">No recognisable early-stage consultation requests in this centre's loaded records.</p>:<div className="mt-3 divide-y">{consultationQueue.slice(0,10).map(({application,preferences})=><article key={application.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{application.student_name}</h3><p className="mt-1 text-xs text-muted-foreground">{application.stage.replace(/_/g,' ')} · Counsellor: {application.counsellor||'Unassigned'}</p><p className="mt-1 text-sm">{preferences.destination||'Destination to confirm'} · {preferences.format||'Meeting format to confirm'}</p><p className="mt-1 text-sm text-muted-foreground">Requested date: {preferences.preferredDate||'Flexible / to confirm'} · {preferences.window||'Time to confirm'}</p></div><Button asChild variant="outline"><Link to={admissionsPath(applicationReviewAction(application.stage).path,'',application.id)} aria-label={'Review consultation request for '+application.student_name}>Review request</Link></Button></article>)}</div>}
       {consultationQueue.length>10&&<p className="mt-2 text-xs text-muted-foreground">Showing the first 10 requests by preferred date. Use the consultation filter for all recognised enquiries.</p>}
      </section>
      <AdmissionHandover applications={scoped} onRefetch={()=>void refetch()}/>
      <details className="surface-card p-5 mb-6"><summary className="cursor-pointer font-semibold">IELTS and consultancy service activation</summary><div className="mt-4"><ServiceActivationQueue /></div></details>
      <details className="mb-6"><summary className="cursor-pointer text-sm font-medium">Pipeline totals · {totalLeads} applications</summary><div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,max(9rem,calc(50%_-_0.5rem))),1fr))] gap-4 mt-4 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]">
        <StatCard label="Total Leads" value={String(totalLeads)} icon={UserPlus} />
        <StatCard label="Applications" value={String(applied)} icon={FileText} />
        <StatCard label="Offers Issued" value={String(offers)} icon={Award} />
        <StatCard label="Enrolled" value={String(enrolled)} icon={TrendingUp} />
      </div></details>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 sm:p-4">
        <div className="relative min-w-0 basis-full sm:basis-auto sm:flex-1 sm:min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input aria-label="Search applications" placeholder="Search by name, email, programme..." value={search} onChange={(e) => setFilter('q', e.target.value)} maxLength={120} className="pl-9 h-11 text-sm" />
        </div>
        <Select value={stageFilter} onValueChange={value => setFilter('stage', value)}>
          <SelectTrigger aria-label="Filter by application stage" className="w-full sm:w-[150px] min-w-0 h-11 text-sm">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={value => setFilter('source', value)}>
          <SelectTrigger aria-label="Filter by lead source" className="w-full sm:w-[160px] min-w-0 h-11 text-sm"><SelectValue placeholder="Lead source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lead sources</SelectItem>
            <SelectItem value="ielts">IELTS enquiries</SelectItem>
            <SelectItem value="university">University progression</SelectItem>
            <SelectItem value="consultation">Consultation requests</SelectItem>
          </SelectContent>
        </Select>
        <Select value={destFilter} onValueChange={value => setFilter('destination', value)}>
          <SelectTrigger aria-label="Filter by study destination" className="w-full sm:w-[150px] min-w-0 h-11 text-sm">
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Destinations</SelectItem>
            <SelectItem value="pakistan">🇵🇰 Pakistan</SelectItem>
            <SelectItem value="germany">🇩🇪 Germany</SelectItem>
            <SelectItem value="uk">🇬🇧 UK</SelectItem>
            <SelectItem value="usa">🇺🇸 USA</SelectItem>
            <SelectItem value="canada">🇨🇦 Canada</SelectItem>
            <SelectItem value="australia">🇦🇺 Australia</SelectItem>
          </SelectContent>
        </Select>
        {(search||stageFilter!=='all'||sourceFilter!=='all'||destFilter!=='all')&&<Button variant="ghost" onClick={()=>setParams(current=>{const next=new URLSearchParams(current);for(const key of ['q','stage','source','destination'])next.delete(key);return next;},{replace:true})}>Clear filters</Button>}
      </div>

      <section className="md:hidden space-y-3 mb-5" aria-label="Application task cards">
        <h2 className="font-semibold">Applications ({filtered.length})</h2>
        {filtered.length===0&&<p className="text-muted-foreground">No applications match your filters.</p>}
        {visible.map(app=><article key={app.id} className="surface-card p-4 space-y-2 min-w-0 break-words">
          <h3 className="font-semibold">{app.student_name}</h3><p className="text-sm text-muted-foreground">{app.email}</p>
          <p>{app.programme_name||'Programme not yet assigned'}</p>
          <StatusBadge status={app.stage.replace(/_/g,' ')} variant={stageVariant(app.stage)}/>
          <p className="text-sm">{['unconditional_offer','deposit_paid'].includes(app.stage)?'Next: use Academic enrolment review above to verify the account and programme.':app.stage==='enrolled'?'Next: verify class allocation, timetable and learning materials.':app.stage==='lost'?'Application closed.':app.stage==='conditional_offer'?'Next: verify outstanding offer conditions and supporting documents.':'Next: review the application and record the follow-up with your admissions team.'}</p>
          <p className="text-sm text-muted-foreground">Counsellor: {app.counsellor||'Unassigned'}</p>
          <Button asChild variant="outline" className="w-full justify-between whitespace-normal text-left">
            <Link to={admissionsPath(applicationReviewAction(app.stage).path, params.toString(), app.id)} aria-label={`${applicationReviewAction(app.stage).label} for ${app.student_name}`}>
              {applicationReviewAction(app.stage).label}<span aria-hidden="true">→</span>
            </Link>
          </Button>
        </article>)}
        {pagination("flex")}
      </section>
      <div className="hidden md:block">
      {/* View Toggle */}
      {view === 'kanban' ? (
        <KanbanBoard applications={filtered} onRefetch={refetch} />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Applications ({filtered.length})</h2>
          </div>
          <div className="surface-card overflow-hidden">
            <div className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" tabIndex={0} role="region" aria-label="Scrollable applications table">
              <table className="w-full">
                <thead>
                  <tr className="surface-data">
                    <th className="text-label text-left px-4 py-3">Student</th>
                    <th className="text-label text-left px-4 py-3 hidden md:table-cell">Programme</th>
                    <th className="text-label text-left px-4 py-3">Stage</th>
                    <th className="text-label text-left px-4 py-3 hidden md:table-cell">Counsellor</th>
                    <th className="text-label text-left px-4 py-3 hidden lg:table-cell">Source</th>
                    <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Updated</th>
                    <th className="text-label text-left px-4 py-3">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((app) => (
                    <tr key={app.id} className="border-t border-border/50 hover:bg-secondary/50 transition-default">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{app.student_name}</p>
                        <p className="text-xs text-muted-foreground">{app.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{app.programme_name || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.stage.replace(/_/g, ' ')} variant={stageVariant(app.stage)} />
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{app.counsellor || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{app.source || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {new Date(app.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="outline">
                          <Link to={admissionsPath(applicationReviewAction(app.stage).path, params.toString(), app.id)} aria-label={`${applicationReviewAction(app.stage).label} for ${app.student_name}`}>
                            {applicationReviewAction(app.stage).label}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">No applications match your filters</div>
            )}
          </div>
          {pagination("flex")}
        </>
      )}

      </div>
      <AddLeadModal open={addLeadOpen} onOpenChange={setAddLeadOpen} onCreated={refetch} />
    </DashboardLayout>
  );
}
