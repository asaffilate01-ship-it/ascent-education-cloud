import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { CheckCircle, Clock, FileText, Download, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useToast } from '@/hooks/use-toast';

interface Submission {
  id: string;
  student_name: string;
  assignment_title: string;
  module_title: string;
  submitted_at: string;
  deadline: string;
  status: string;
  late: boolean;
  word_count: number;
  plagiarism_score: number;
  grade: number | null;
  feedback: string | null;
}

export default function LecturerMarking() {
  const [selected, setSelected] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('submissions')
      .select('*, assignments(title, deadline, modules(title))')
      .order('submitted_at', { ascending: false });

    const mapped: Submission[] = (data || []).map((s: any) => ({
      id: s.id,
      student_name: s.student_name,
      assignment_title: s.assignments?.title || 'Unknown',
      module_title: s.assignments?.modules?.title || 'Unknown',
      submitted_at: s.submitted_at,
      deadline: s.assignments?.deadline || s.submitted_at,
      status: s.status,
      late: new Date(s.submitted_at) > new Date(s.assignments?.deadline || s.submitted_at),
      word_count: s.word_count || 0,
      plagiarism_score: s.plagiarism_score || 0,
      grade: s.grade,
      feedback: s.feedback,
    }));
    setSubmissions(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  if (loading) return <DashboardSkeleton />;

  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;
  const lateCount = submissions.filter((s) => s.late).length;
  const submission = submissions.find((s) => s.id === selected);

  const handleSubmitGrade = async () => {
    if (!submission || !gradeInput) return;
    setSaving(true);
    const { error } = await supabase
      .from('submissions')
      .update({ grade: Number(gradeInput), feedback: feedbackInput || null, status: 'graded', graded_at: new Date().toISOString() })
      .eq('id', submission.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Grade Submitted', description: `${submission.student_name} graded ${gradeInput}%` });
      fetchSubmissions();
    }
  };

  return (
    <DashboardLayout title="Marking" subtitle={`${pendingCount} submissions to mark · ${lateCount} late submissions`}>
      <div className="flex gap-4">
        <div className={`space-y-2 ${selected ? 'w-2/5' : 'w-full'}`}>
          {submissions.map((s) => (
            <div
              key={s.id}
              onClick={() => { setSelected(s.id); setGradeInput(s.grade?.toString() || ''); setFeedbackInput(s.feedback || ''); }}
              className={`surface-card p-4 cursor-pointer transition-default hover:shadow-lg ${
                selected === s.id ? 'ring-2 ring-primary' : ''
              } ${s.late ? 'border-l-4 border-l-warning' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">{s.assignment_title} · {s.module_title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>Submitted: {new Date(s.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    <span>{s.word_count} words</span>
                    <span className={s.plagiarism_score > 10 ? 'text-warning font-medium' : ''}>Plag: {s.plagiarism_score}%</span>
                  </div>
                </div>
                <div className="text-right">
                  {s.status === 'graded' ? (
                    <p className="text-lg font-bold text-primary">{s.grade}%</p>
                  ) : (
                    <StatusBadge status={s.late ? 'Late' : 'To Mark'} variant={s.late ? 'warning' : 'neutral'} />
                  )}
                </div>
              </div>
            </div>
          ))}
          {submissions.length === 0 && (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">No submissions yet</div>
          )}
        </div>

        {submission && (
          <div className="w-3/5 surface-card p-6 sticky top-20 self-start">
            <h2 className="text-lg font-bold mb-1">{submission.student_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{submission.assignment_title} · {submission.module_title}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="surface-data p-3 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Submitted</p>
                <p className="text-sm font-medium">{new Date(submission.submitted_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="surface-data p-3 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Deadline</p>
                <p className="text-sm font-medium">{new Date(submission.deadline).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="surface-data p-3 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Word Count</p>
                <p className="text-sm font-medium">{submission.word_count}</p>
              </div>
              <div className={`surface-data p-3 rounded-lg ${submission.plagiarism_score > 10 ? 'border border-warning/30' : ''}`}>
                <p className="text-[10px] text-muted-foreground uppercase">Plagiarism Score</p>
                <p className={`text-sm font-medium ${submission.plagiarism_score > 10 ? 'text-warning' : 'text-success'}`}>{submission.plagiarism_score}%</p>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 mb-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary/50" />
              <div className="flex-1">
                <p className="text-sm font-medium">{submission.assignment_title}.docx</p>
                <p className="text-xs text-muted-foreground">Click to preview submission</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-label mb-1.5 block">Grade (0-100)</label>
                <input
                  type="number" min="0" max="100"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="Enter grade..."
                  className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground"
                />
              </div>
              <div>
                <label className="text-label mb-1.5 block">Feedback</label>
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Provide constructive feedback..."
                  rows={4}
                  className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSubmitGrade} disabled={saving || !gradeInput}>
                  <CheckCircle className="w-4 h-4 mr-1.5" /> {saving ? 'Saving...' : 'Submit Grade'}
                </Button>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-1.5" /> Request Resubmission
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Grade will be sent to IQA for moderation before release to student
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
