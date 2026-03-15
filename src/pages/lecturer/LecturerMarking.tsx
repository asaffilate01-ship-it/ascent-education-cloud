import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { ClipboardList, CheckCircle, Clock, AlertTriangle, FileText, Download, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const SUBMISSIONS = [
  { id: '1', student: 'Sara Ali', assignment: 'Business Strategy Report', module: 'Strategic Management', submitted: '2025-03-14', deadline: '2025-03-18', status: 'pending', late: false, wordCount: 3200, plagiarism: 8 },
  { id: '2', student: 'Omar Farooq', assignment: 'Business Strategy Report', module: 'Strategic Management', submitted: '2025-03-15', deadline: '2025-03-18', status: 'pending', late: false, wordCount: 2980, plagiarism: 12 },
  { id: '3', student: 'Hassan Malik', assignment: 'Business Plan', module: 'Business Environment', submitted: '2025-03-06', deadline: '2025-03-05', status: 'pending', late: true, wordCount: 4100, plagiarism: 5 },
  { id: '4', student: 'Zara Sheikh', assignment: 'Case Study Analysis', module: 'Strategic Management', submitted: '2025-03-12', deadline: '2025-03-15', status: 'marked', grade: 72, late: false, wordCount: 2800, plagiarism: 3, feedback: 'Good analysis with clear structure.' },
  { id: '5', student: 'Ayesha Noor', assignment: 'Case Study Analysis', module: 'Strategic Management', submitted: '2025-03-13', deadline: '2025-03-15', status: 'marked', grade: 68, late: false, wordCount: 3100, plagiarism: 7, feedback: 'Needs deeper critical evaluation in section 3.' },
];

export default function LecturerMarking() {
  const [selected, setSelected] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const pendingCount = SUBMISSIONS.filter(s => s.status === 'pending').length;
  const overdueCount = SUBMISSIONS.filter(s => s.late).length;
  const submission = SUBMISSIONS.find(s => s.id === selected);

  return (
    <DashboardLayout title="Marking" subtitle={`${pendingCount} submissions to mark · ${overdueCount} late submissions`}>
      <div className="flex gap-4">
        {/* List */}
        <div className={`space-y-2 ${selected ? 'w-2/5' : 'w-full'}`}>
          {SUBMISSIONS.map((s) => (
            <div
              key={s.id}
              onClick={() => { setSelected(s.id); setGradeInput((s as any).grade?.toString() || ''); setFeedbackInput((s as any).feedback || ''); }}
              className={`surface-card p-4 cursor-pointer transition-default hover:shadow-lg ${
                selected === s.id ? 'ring-2 ring-primary' : ''
              } ${s.late ? 'border-l-4 border-l-warning' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.student}</p>
                  <p className="text-xs text-muted-foreground">{s.assignment} · {s.module}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>Submitted: {new Date(s.submitted).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    <span>{s.wordCount} words</span>
                    <span className={s.plagiarism > 10 ? 'text-warning font-medium' : ''}>Plag: {s.plagiarism}%</span>
                  </div>
                </div>
                <div className="text-right">
                  {s.status === 'marked' ? (
                    <p className="text-lg font-bold text-primary">{(s as any).grade}%</p>
                  ) : (
                    <StatusBadge status={s.late ? 'Late' : 'To Mark'} variant={s.late ? 'warning' : 'neutral'} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Marking Panel */}
        {submission && (
          <div className="w-3/5 surface-card p-6 sticky top-20 self-start">
            <h2 className="text-lg font-bold mb-1">{submission.student}</h2>
            <p className="text-sm text-muted-foreground mb-4">{submission.assignment} · {submission.module}</p>

            {/* Submission details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="surface-data p-3 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Submitted</p>
                <p className="text-sm font-medium">{new Date(submission.submitted).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="surface-data p-3 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Deadline</p>
                <p className="text-sm font-medium">{new Date(submission.deadline).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="surface-data p-3 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Word Count</p>
                <p className="text-sm font-medium">{submission.wordCount}</p>
              </div>
              <div className={`surface-data p-3 rounded-lg ${submission.plagiarism > 10 ? 'border border-warning/30' : ''}`}>
                <p className="text-[10px] text-muted-foreground uppercase">Plagiarism Score</p>
                <p className={`text-sm font-medium ${submission.plagiarism > 10 ? 'text-warning' : 'text-success'}`}>{submission.plagiarism}%</p>
              </div>
            </div>

            {/* File preview */}
            <div className="border border-border rounded-lg p-4 mb-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary/50" />
              <div className="flex-1">
                <p className="text-sm font-medium">{submission.assignment}.docx</p>
                <p className="text-xs text-muted-foreground">Click to preview submission</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>

            {/* Grading form */}
            <div className="space-y-3">
              <div>
                <label className="text-label mb-1.5 block">Grade (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
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
                <Button className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Submit Grade
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
