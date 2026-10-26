import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { UserPlus, FileText, Award, TrendingUp, LayoutGrid, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import AddLeadModal from '@/components/modals/AddLeadModal';
import KanbanBoard from '@/components/admissions/KanbanBoard';
import AdmissionHandover from '@/components/admissions/AdmissionHandover';
import ServiceActivationQueue from '@/components/admissions/ServiceActivationQueue';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

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
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [view, setView] = useState<'kanban' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [destFilter, setDestFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const { data: applications, loading, error, refetch } = useSupabaseQuery('applications', {
    orderBy: { column: 'updated_at', ascending: false },
  });

  if (loading) return <DashboardSkeleton />;
  if(error)return <DashboardLayout title="Admissions Pipeline"><div role="alert" className="rounded border border-destructive p-4">Applications could not be loaded. <Button onClick={()=>void refetch()}>Retry</Button></div></DashboardLayout>;

  const filtered = applications.filter((app) => {
    if (stageFilter !== 'all' && app.stage !== stageFilter) return false;
    const source = (app.source || '').toLowerCase();
    if (sourceFilter === 'ielts' && source !== 'ielts_preparation') return false;
    if (sourceFilter === 'university' && !source.startsWith('university_progression_')) return false;
    if (destFilter !== 'all') {
      const d = (app as any).destination || (source.startsWith('consultancy_') ? source.replace('consultancy_', '') : source.startsWith('university_progression_') ? source.replace('university_progression_', '') : 'pakistan');
      if (String(d).toLowerCase() !== destFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        app.student_name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        (app.programme_name || '').toLowerCase().includes(q) ||
        (app.counsellor || '').toLowerCase().includes(q) ||
        source.includes(q)
      );
    }
    return true;
  });

  const totalLeads = applications.length;
  const applied = applications.filter((a) => !['lead', 'contacted', 'qualified', 'lost'].includes(a.stage)).length;
  const offers = applications.filter((a) => ['conditional_offer', 'unconditional_offer'].includes(a.stage)).length;
  const enrolled = applications.filter((a) => a.stage === 'enrolled').length;

  return (
    <DashboardLayout
      title="Admissions Pipeline"
      subtitle="Review offers, enrol learners and follow up on applications"
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center rounded-md border border-border overflow-hidden">
            <button
              aria-label="Kanban view" onClick={() => setView('kanban')}
              className={`p-3 transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              aria-label="Table view" onClick={() => setView('table')}
              className={`p-3 transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button size="sm" onClick={() => setAddLeadOpen(true)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> New Lead
          </Button>
        </div>
      }
    >
      <AdmissionHandover applications={applications} onRefetch={()=>void refetch()}/>
      <details className="surface-card p-5 mb-6"><summary className="cursor-pointer font-semibold">IELTS and consultancy service activation</summary><div className="mt-4"><ServiceActivationQueue /></div></details>
      <details className="mb-6"><summary className="cursor-pointer text-sm font-medium">Pipeline totals · {totalLeads} applications</summary><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard label="Total Leads" value={String(totalLeads)} icon={UserPlus} />
        <StatCard label="Applications" value={String(applied)} icon={FileText} />
        <StatCard label="Offers Issued" value={String(offers)} icon={Award} />
        <StatCard label="Enrolled" value={String(enrolled)} icon={TrendingUp} />
      </div></details>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input aria-label="Search applications" placeholder="Search by name, email, programme..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 text-sm" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[150px] h-11 text-sm">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px] h-11 text-sm"><SelectValue placeholder="Lead source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lead sources</SelectItem>
            <SelectItem value="ielts">IELTS enquiries</SelectItem>
            <SelectItem value="university">University progression</SelectItem>
          </SelectContent>
        </Select>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-[150px] h-11 text-sm">
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
      </div>

      <section className="md:hidden space-y-3 mb-5" aria-label="Application task cards">
        <h2 className="font-semibold">Applications ({filtered.length})</h2>
        {filtered.length===0&&<p className="text-muted-foreground">No applications match your filters.</p>}
        {filtered.map(app=><article key={app.id} className="surface-card p-4 space-y-2 min-w-0 break-words">
          <h3 className="font-semibold">{app.student_name}</h3><p className="text-sm text-muted-foreground">{app.email}</p>
          <p>{app.programme_name||'Programme not yet assigned'}</p>
          <StatusBadge status={app.stage.replace(/_/g,' ')} variant={stageVariant(app.stage)}/>
          <p className="text-sm">{['unconditional_offer','deposit_paid'].includes(app.stage)?'Next: use Academic enrolment review above to verify the account and programme.':app.stage==='enrolled'?'Next: verify class allocation, timetable and learning materials.':app.stage==='lost'?'Application closed.':app.stage==='conditional_offer'?'Next: verify outstanding offer conditions and supporting documents.':'Next: review the application and record the follow-up with your admissions team.'}</p>
          <p className="text-sm text-muted-foreground">Counsellor: {app.counsellor||'Unassigned'}</p>
        </article>)}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="surface-data">
                    <th className="text-label text-left px-4 py-3">Student</th>
                    <th className="text-label text-left px-4 py-3 hidden md:table-cell">Programme</th>
                    <th className="text-label text-left px-4 py-3">Stage</th>
                    <th className="text-label text-left px-4 py-3 hidden md:table-cell">Counsellor</th>
                    <th className="text-label text-left px-4 py-3 hidden lg:table-cell">Source</th>
                    <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">No applications match your filters</div>
            )}
          </div>
        </>
      )}

      </div>
      <AddLeadModal open={addLeadOpen} onOpenChange={setAddLeadOpen} onCreated={refetch} />
    </DashboardLayout>
  );
}
