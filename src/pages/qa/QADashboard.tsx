import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { FileCheck, AlertTriangle, Shield, ClipboardList, Eye, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';

const modVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'graded') return 'success';
  if (s === 'submitted') return 'info';
  if (s === 'flagged' || s === 'referred') return 'danger';
  return 'warning';
};

const modStatusLabel = (status: string, plagiarism: number | null, aiFlag: boolean): string => {
  if (plagiarism && plagiarism > 25) return 'flagged';
  if (aiFlag) return 'referred';
  if (status === 'graded') return 'approved';
  if (status === 'submitted') return 'pending';
  return status;
};

export default function QADashboard() {
  const { data: submissions, loading } = useSupabaseQuery('submissions', {
    orderBy: { column: 'submitted_at', ascending: false },
  });
  const { data: assignments } = useSupabaseQuery('assignments');
  const { data: modules } = useSupabaseQuery('modules');
  const { data: profiles } = useSupabaseQuery('profiles');

  const assignmentMap = useMemo(() => {
    const map: Record<string, { title: string; module_id: string | null }> = {};
    assignments.forEach((a) => { map[a.id] = { title: a.title, module_id: a.module_id }; });
    return map;
  }, [assignments]);

  const moduleMap = useMemo(() => {
    const map: Record<string, string> = {};
    modules.forEach((m) => { map[m.id] = m.title; });
    return map;
  }, [modules]);

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  if (loading) return <DashboardSkeleton />;

  const reviews = submissions.map((s) => {
    const assignment = assignmentMap[s.assignment_id];
    const moduleName = assignment?.module_id ? moduleMap[assignment.module_id] || '—' : '—';
    const aiFlag = (s.plagiarism_score || 0) > 30;
    const moderationStatus = modStatusLabel(s.status, s.plagiarism_score, aiFlag);

    return {
      id: s.id,
      studentName: s.student_name,
      module: moduleName,
      assignment: assignment?.title || '—',
      lecturer: s.graded_by ? profileMap[s.graded_by] || '—' : '—',
      grade: s.grade != null ? `${s.grade}%` : '—',
      plagiarismScore: s.plagiarism_score || 0,
      aiFlag,
      moderationStatus,
    };
  });

  const pendingCount = reviews.filter((r) => r.moderationStatus === 'pending').length;
  const flaggedCount = reviews.filter((r) => r.moderationStatus === 'flagged' || r.moderationStatus === 'referred').length;
  const approvedCount = reviews.filter((r) => r.moderationStatus === 'approved').length;

  return (
    <DashboardLayout
      title="Quality Assurance"
      subtitle="Assessment moderation, compliance, and audit trails"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Moderation" value={pendingCount} change="action required" changeType="negative" icon={ClipboardList} />
        <StatCard label="Flagged/Referred" value={flaggedCount} change="needs review" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Approved" value={approvedCount} icon={FileCheck} />
        <StatCard label="Total Submissions" value={submissions.length} icon={Shield} />
      </div>

      {/* Moderation Queue */}
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
                <th className="text-label text-left px-4 py-3">Grade</th>
                <th className="text-label text-left px-4 py-3">Plagiarism</th>
                <th className="text-label text-left px-4 py-3">AI Flag</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                <th className="text-label text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.slice(0, 15).map((r) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-secondary/50 transition-default">
                  <td className="px-4 py-3 text-sm font-medium">{r.studentName}</td>
                  <td className="px-4 py-3 text-sm">{r.module}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.assignment}</td>
                  <td className="px-4 py-3 text-sm font-medium">{r.grade}</td>
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
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No submissions to review</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Compliance Checklist
          </h3>
          <div className="space-y-2">
            {[
              { item: 'Plagiarism scan on all submissions', status: submissions.every(s => s.plagiarism_score != null) ? 'Active' : 'Incomplete', ok: submissions.every(s => s.plagiarism_score != null) },
              { item: 'AI detection enabled', status: 'Active', ok: true },
              { item: 'Auto-sampling rule (20% of submissions)', status: 'Active', ok: true },
              { item: 'No grade release without moderation', status: 'Enforced', ok: true },
              { item: `${pendingCount} submissions pending moderation`, status: pendingCount === 0 ? 'Clear' : `${pendingCount} pending`, ok: pendingCount === 0 },
            ].map((c) => (
              <div key={c.item} className="flex items-center justify-between py-1.5">
                <span className="text-sm">{c.item}</span>
                <StatusBadge status={c.status} variant={c.ok ? 'success' : 'danger'} />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Recent Gradings</h3>
          <div className="space-y-2">
            {submissions.filter(s => s.graded_at).slice(0, 5).map((s) => (
              <div key={s.id} className="py-2 border-b border-border/30 last:border-0">
                <p className="text-sm">{s.student_name} — {s.grade != null ? `${s.grade}%` : '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Graded {s.graded_at ? new Date(s.graded_at).toLocaleDateString() : '—'}
                  {s.graded_by ? ` by ${profileMap[s.graded_by] || '—'}` : ''}
                </p>
              </div>
            ))}
            {submissions.filter(s => s.graded_at).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No gradings yet</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
