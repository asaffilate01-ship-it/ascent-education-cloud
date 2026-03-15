import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { FileCheck, AlertTriangle, Shield, ClipboardList, Eye, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QAReview } from '@/types/platform';

const MOCK_REVIEWS: QAReview[] = [
  { id: '1', studentName: 'Sara Ali', module: 'Strategic Management', assignment: 'Business Strategy Report', lecturer: 'Dr. Khan', grade: 'Merit', moderationStatus: 'pending', plagiarismScore: 8, aiFlag: false, reviewedBy: '', reviewDate: '' },
  { id: '2', studentName: 'Omar Farooq', module: 'Financial Analysis', assignment: 'Ratio Analysis Case Study', lecturer: 'Mr. Rashid', grade: 'Pass', moderationStatus: 'sampled', plagiarismScore: 12, aiFlag: false, reviewedBy: 'Mr. Imran Syed', reviewDate: '2025-03-13' },
  { id: '3', studentName: 'Zara Sheikh', module: 'Computing L5', assignment: 'Database Design Project', lecturer: 'Ms. Fatima', grade: 'Distinction', moderationStatus: 'flagged', plagiarismScore: 34, aiFlag: true, reviewedBy: 'Mr. Imran Syed', reviewDate: '2025-03-14' },
  { id: '4', studentName: 'Hassan Ali', module: 'Accounting L3', assignment: 'Double Entry Bookkeeping', lecturer: 'Mr. Rashid', grade: 'Merit', moderationStatus: 'approved', plagiarismScore: 5, aiFlag: false, reviewedBy: 'Mr. Imran Syed', reviewDate: '2025-03-12' },
  { id: '5', studentName: 'Ayesha Khan', module: 'Business Environment', assignment: 'Market Analysis Report', lecturer: 'Dr. Khan', grade: 'Pass', moderationStatus: 'referred', plagiarismScore: 22, aiFlag: true, reviewedBy: 'Mr. Imran Syed', reviewDate: '2025-03-14' },
];

const modVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'approved') return 'success';
  if (s === 'sampled') return 'info';
  if (s === 'flagged' || s === 'referred') return 'danger';
  return 'warning';
};

export default function QADashboard() {
  const pendingCount = MOCK_REVIEWS.filter(r => r.moderationStatus === 'pending').length;
  const flaggedCount = MOCK_REVIEWS.filter(r => r.moderationStatus === 'flagged' || r.moderationStatus === 'referred').length;
  const approvedCount = MOCK_REVIEWS.filter(r => r.moderationStatus === 'approved').length;

  return (
    <DashboardLayout
      title="Quality Assurance"
      subtitle="Assessment moderation, compliance, and audit trails"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Moderation" value={pendingCount} change="action required" changeType="negative" icon={ClipboardList} />
        <StatCard label="Flagged/Referred" value={flaggedCount} change="needs review" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Approved" value={approvedCount} icon={FileCheck} />
        <StatCard label="Compliance Score" value="87%" change="Target: 95%" changeType="neutral" icon={Shield} />
      </div>

      {/* Mandatory Workflow */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Assessment Moderation Workflow</h3>
        <div className="flex items-center gap-2">
          {[
            { step: '1', label: 'Student Submits', done: true },
            { step: '2', label: 'Lecturer Marks', done: true },
            { step: '3', label: 'IQA Sample', done: true },
            { step: '4', label: 'Moderation Review', done: false },
            { step: '5', label: 'Approval', done: false },
            { step: '6', label: 'Grade Release', done: false },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                s.done ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                {s.step}
              </div>
              <span className="text-xs text-muted-foreground hidden lg:block">{s.label}</span>
              {i < 5 && <div className={`flex-1 h-0.5 ${s.done ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Moderation Queue</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs">Auto-Sample</Button>
          <Button size="sm" className="text-xs"><FolderOpen className="w-3 h-3 mr-1" /> Generate EV Pack</Button>
        </div>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3">Module</th>
                <th className="text-label text-left px-4 py-3">Assignment</th>
                <th className="text-label text-left px-4 py-3">Lecturer</th>
                <th className="text-label text-left px-4 py-3">Grade</th>
                <th className="text-label text-left px-4 py-3">Plagiarism</th>
                <th className="text-label text-left px-4 py-3">AI Flag</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                <th className="text-label text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_REVIEWS.map((r) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-secondary/50 transition-default">
                  <td className="px-4 py-3 text-sm font-medium">{r.studentName}</td>
                  <td className="px-4 py-3 text-sm">{r.module}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.assignment}</td>
                  <td className="px-4 py-3 text-sm">{r.lecturer}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{r.grade}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${r.plagiarismScore > 20 ? 'text-destructive' : r.plagiarismScore > 10 ? 'text-warning' : 'text-success'}`}>
                      {r.plagiarismScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.aiFlag ? (
                      <StatusBadge status="AI Detected" variant="danger" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.moderationStatus} variant={modVariant(r.moderationStatus)} />
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Eye className="w-3 h-3 mr-1" /> Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance and Audit */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Compliance Checklist
          </h3>
          <div className="space-y-2">
            {[
              { item: 'Plagiarism scan on all submissions', status: 'Active', ok: true },
              { item: 'AI detection enabled', status: 'Active', ok: true },
              { item: 'Auto-sampling rule (20% of submissions)', status: 'Active', ok: true },
              { item: 'No grade release without moderation', status: 'Enforced', ok: true },
              { item: 'All lecturer CVs uploaded', status: '2 missing', ok: false },
              { item: 'IQA reports for Q1 2025', status: 'Overdue', ok: false },
              { item: 'External Verifier visit scheduled', status: 'Not yet', ok: false },
            ].map((c) => (
              <div key={c.item} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{c.item}</span>
                <StatusBadge status={c.status} variant={c.ok ? 'success' : 'danger'} />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Audit Trail (Recent)</h3>
          <div className="space-y-2">
            {[
              { action: 'Grade changed: Sara Ali — Merit → Distinction', by: 'Dr. Khan', time: '14 Mar, 09:45', ip: '182.176.x.x' },
              { action: 'Moderation flagged: Zara Sheikh — AI detected', by: 'System', time: '14 Mar, 08:20', ip: '' },
              { action: 'Submission resubmitted: Omar Farooq', by: 'Omar Farooq', time: '13 Mar, 22:10', ip: '39.32.x.x' },
              { action: 'IQA sample approved: Hassan Ali', by: 'Mr. Imran Syed', time: '12 Mar, 15:30', ip: '182.176.x.x' },
              { action: 'Malpractice case opened: Zara Sheikh', by: 'Mr. Imran Syed', time: '14 Mar, 10:00', ip: '182.176.x.x' },
            ].map((a, i) => (
              <div key={i} className="py-2 border-b border-border/30 last:border-0">
                <p className="text-sm">{a.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.by} · {a.time} {a.ip && `· ${a.ip}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
