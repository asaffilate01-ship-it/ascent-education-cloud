import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { ClipboardList, Upload, Clock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const ASSIGNMENTS = [
  { id: '1', title: 'Business Strategy Report', module: 'Strategic Management', deadline: '2025-03-18', status: 'pending', maxMarks: 100, wordCount: '3,000', type: 'Report' },
  { id: '2', title: 'Financial Ratio Analysis', module: 'Financial Analysis', deadline: '2025-03-22', status: 'pending', maxMarks: 80, wordCount: '2,500', type: 'Case Study' },
  { id: '3', title: 'Marketing Environment Report', module: 'Business Environment', deadline: '2025-02-28', status: 'graded', grade: 72, maxMarks: 100, feedback: 'Good analysis of macro-environmental factors. More critical evaluation needed in the SWOT section.', type: 'Report' },
  { id: '4', title: 'Business Plan — Group Project', module: 'Business Environment', deadline: '2025-03-05', status: 'submitted', maxMarks: 100, type: 'Group Project' },
  { id: '5', title: 'Organisational Behaviour Case Study', module: 'Business Environment', deadline: '2025-02-15', status: 'graded', grade: 78, maxMarks: 100, feedback: 'Excellent application of Herzberg and Maslow theories. Well-structured arguments.', type: 'Case Study' },
  { id: '6', title: 'IT Project Proposal', module: 'Computing', deadline: '2025-03-28', status: 'pending', maxMarks: 60, wordCount: '1,500', type: 'Proposal' },
];

type TabType = 'all' | 'pending' | 'submitted' | 'graded';

export default function StudentAssignments() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  const filtered = activeTab === 'all' ? ASSIGNMENTS : ASSIGNMENTS.filter(a => a.status === activeTab);
  const pendingCount = ASSIGNMENTS.filter(a => a.status === 'pending').length;
  const selected = ASSIGNMENTS.find(a => a.id === selectedAssignment);

  const getDaysLeft = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <DashboardLayout title="Assignments" subtitle={`${pendingCount} assignments pending submission`}>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(['all', 'pending', 'submitted', 'graded'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedAssignment(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-default capitalize ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab} {tab !== 'all' && `(${ASSIGNMENTS.filter(a => tab === 'all' || a.status === tab).length})`}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Assignment List */}
        <div className={`space-y-2 ${selectedAssignment ? 'w-1/2' : 'w-full'}`}>
          {filtered.map((a) => {
            const daysLeft = getDaysLeft(a.deadline);
            const isUrgent = a.status === 'pending' && daysLeft <= 3 && daysLeft >= 0;
            const isOverdue = a.status === 'pending' && daysLeft < 0;

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAssignment(a.id)}
                className={`surface-card p-4 cursor-pointer transition-default hover:shadow-lg ${
                  selectedAssignment === a.id ? 'ring-2 ring-primary' : ''
                } ${isOverdue ? 'border-l-4 border-l-destructive' : isUrgent ? 'border-l-4 border-l-warning' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium bg-secondary px-1.5 py-0.5 rounded">{a.type}</span>
                      <span className="text-[10px] text-muted-foreground">{a.module}</span>
                    </div>
                    <p className="text-sm font-semibold">{a.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {new Date(a.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      <span>Max: {a.maxMarks} marks</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {a.status === 'graded' && (
                      <p className="text-lg font-bold text-primary">{(a as any).grade}%</p>
                    )}
                    <StatusBadge
                      status={a.status === 'graded' ? 'Graded' : a.status === 'submitted' ? 'Submitted' : isOverdue ? 'Overdue' : `${daysLeft}d left`}
                      variant={a.status === 'graded' ? 'success' : a.status === 'submitted' ? 'info' : isOverdue ? 'danger' : isUrgent ? 'warning' : 'neutral'}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-1/2 surface-card p-6 sticky top-20 self-start">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium bg-secondary px-1.5 py-0.5 rounded">{selected.type}</span>
              <span className="text-[10px] text-muted-foreground">{selected.module}</span>
            </div>
            <h2 className="text-lg font-bold mb-4">{selected.title}</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-medium">{new Date(selected.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Marks</span>
                <span className="font-medium">{selected.maxMarks}</span>
              </div>
              {(selected as any).wordCount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Word Count</span>
                  <span className="font-medium">{(selected as any).wordCount} words</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  status={selected.status}
                  variant={selected.status === 'graded' ? 'success' : selected.status === 'submitted' ? 'info' : 'warning'}
                />
              </div>
            </div>

            {selected.status === 'graded' && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold">Grade: {(selected as any).grade}%</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{(selected as any).feedback}</p>
              </div>
            )}

            {selected.status === 'pending' && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-default cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop files here to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX — Max 25MB</p>
                </div>
                <Button className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> Submit Assignment
                </Button>
              </div>
            )}

            {selected.status === 'submitted' && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Submission received</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Your assignment is being reviewed by your lecturer.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
