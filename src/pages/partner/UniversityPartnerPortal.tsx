import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { GraduationCap, Users, CreditCard, FileText, CheckCircle, Clock, Award, ChevronRight, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REFERRED_STUDENTS = [
  { id: '1', name: 'Sara Ali', programme: 'Level 5 Business', centre: 'EduPathway Lahore', grade: '72%', status: 'offer_issued', appliedTo: 'BA Top-Up', country: 'UK' },
  { id: '2', name: 'Zara Sheikh', programme: 'Level 5 Business', centre: 'EduPathway Lahore', grade: '78%', status: 'application_received', appliedTo: 'BA Top-Up', country: 'UK' },
  { id: '3', name: 'Usman Raza', programme: 'Level 5 Computing', centre: 'Karachi IT', grade: '68%', status: 'conditional_offer', appliedTo: 'BSc Top-Up', country: 'UK' },
  { id: '4', name: 'Fatima Khan', programme: 'Level 5 Business', centre: 'Peshawar TC', grade: '82%', status: 'enrolled', appliedTo: 'BA Top-Up', country: 'Canada' },
  { id: '5', name: 'Ali Hussain', programme: 'Level 5 Computing', centre: 'EduPathway Lahore', grade: '62%', status: 'documents_pending', appliedTo: 'BSc Top-Up', country: 'UK' },
  { id: '6', name: 'Bilal Ahmed', programme: 'Level 4 Computing', centre: 'Karachi IT', grade: '55%', status: 'not_eligible', appliedTo: '-', country: '-' },
];

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'neutral' }> = {
  application_received: { label: 'Received', variant: 'info' },
  documents_pending: { label: 'Docs Pending', variant: 'warning' },
  conditional_offer: { label: 'Conditional', variant: 'info' },
  offer_issued: { label: 'Offer Issued', variant: 'success' },
  enrolled: { label: 'Enrolled', variant: 'success' },
  not_eligible: { label: 'Not Eligible', variant: 'danger' },
};

const columns = [
  { key: 'name', label: 'Student', render: (s: typeof REFERRED_STUDENTS[0]) => (
    <div>
      <p className="text-sm font-medium">{s.name}</p>
      <p className="text-[10px] text-muted-foreground">{s.centre}</p>
    </div>
  )},
  { key: 'programme', label: 'Current Programme', render: (s: typeof REFERRED_STUDENTS[0]) => <span className="text-xs">{s.programme}</span> },
  { key: 'grade', label: 'Grade', render: (s: typeof REFERRED_STUDENTS[0]) => <span className="text-xs font-semibold">{s.grade}</span> },
  { key: 'appliedTo', label: 'Applying For', render: (s: typeof REFERRED_STUDENTS[0]) => <span className="text-xs">{s.appliedTo}</span> },
  { key: 'country', label: 'Country', render: (s: typeof REFERRED_STUDENTS[0]) => <span className="text-xs">{s.country}</span> },
  { key: 'status', label: 'Status', render: (s: typeof REFERRED_STUDENTS[0]) => {
    const cfg = statusConfig[s.status] || { label: s.status, variant: 'neutral' as const };
    return <StatusBadge status={cfg.label} variant={cfg.variant} />;
  }},
  { key: 'actions', label: '', render: (s: typeof REFERRED_STUDENTS[0]) => (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" className="h-7 text-xs">Review</Button>
      {s.status === 'application_received' && <Button size="sm" className="h-7 text-xs">Issue Offer</Button>}
    </div>
  )},
];

const COMMISSION_SUMMARY = [
  { intake: 'Sep 2025', enrolled: 4, rate: '£3,000', total: '£12,000', status: 'pending' },
  { intake: 'Jan 2025', enrolled: 7, rate: '£3,000', total: '£21,000', status: 'paid' },
  { intake: 'Sep 2024', enrolled: 12, rate: '£2,500', total: '£30,000', status: 'paid' },
];

export default function UniversityPartnerPortal() {
  const totalReferred = REFERRED_STUDENTS.length;
  const enrolled = REFERRED_STUDENTS.filter(s => s.status === 'enrolled').length;
  const offersOut = REFERRED_STUDENTS.filter(s => ['offer_issued', 'conditional_offer'].includes(s.status)).length;

  return (
    <DashboardLayout
      title="University Partner Portal"
      subtitle="University of Sunderland — Partner Dashboard"
      actions={<Button size="sm"><FileText className="w-3.5 h-3.5 mr-1.5" />Export Report</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Referred Students" value={totalReferred} change="This cycle" icon={Users} />
        <StatCard label="Offers Issued" value={offersOut} changeType="positive" change="Active" icon={Award} />
        <StatCard label="Enrolled" value={enrolled} changeType="positive" change="Confirmed" icon={GraduationCap} />
        <StatCard label="Commission Due" value="£12,000" change="This intake" changeType="positive" icon={CreditCard} />
      </div>

      {/* Referred Students Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Referred Students</h2>
      </div>
      <DataTable columns={columns} data={REFERRED_STUDENTS} />

      {/* Commissions */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Commission History
          </h3>
          <div className="space-y-2">
            {COMMISSION_SUMMARY.map((c) => (
              <div key={c.intake} className="flex items-center justify-between p-3 surface-data rounded-lg">
                <div>
                  <p className="text-sm font-medium">{c.intake} Intake</p>
                  <p className="text-xs text-muted-foreground">{c.enrolled} students × {c.rate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{c.total}</p>
                  <StatusBadge status={c.status === 'paid' ? 'Paid' : 'Pending'} variant={c.status === 'paid' ? 'success' : 'warning'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> Available Programmes
          </h3>
          <div className="space-y-2">
            {[
              { prog: 'BA (Hons) Business Management', entry: 'Level 5 Diploma', intake: 'Sep / Jan' },
              { prog: 'BSc (Hons) Computing', entry: 'Level 5 Diploma', intake: 'Sep / Jan' },
              { prog: 'BA (Hons) Accounting & Finance', entry: 'Level 5 Diploma + IAB', intake: 'Sep' },
            ].map((p) => (
              <div key={p.prog} className="p-3 surface-data rounded-lg">
                <p className="text-sm font-medium">{p.prog}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Entry: {p.entry} · Intakes: {p.intake}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
