import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { Upload, Clock, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { toast } from 'sonner';

interface Assignment {
  id: string;
  title: string;
  type: string;
  max_marks: number;
  word_count: string | null;
  deadline: string;
  module_title?: string;
  submission_status?: 'pending' | 'submitted' | 'graded';
  grade?: number | null;
  feedback?: string | null;
  file_url?: string | null;
}

type TabType = 'all' | 'pending' | 'submitted' | 'graded';

export default function StudentAssignments() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    setLoading(true);
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, modules(title)')
      .order('deadline', { ascending: true });

    const { data: { user } } = await supabase.auth.getUser();
    let submissionsMap: Record<string, any> = {};
    if (user) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', user.id);
      for (const s of subs || []) {
        submissionsMap[s.assignment_id] = s;
      }
    }

    const mapped: Assignment[] = (assignmentsData || []).map((a: any) => {
      const sub = submissionsMap[a.id];
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        max_marks: a.max_marks,
        word_count: a.word_count,
        deadline: a.deadline,
        module_title: a.modules?.title || 'Unknown Module',
        submission_status: sub ? sub.status : 'pending',
        grade: sub?.grade || null,
        feedback: sub?.feedback || null,
        file_url: sub?.file_url || null,
      };
    });
    setAssignments(mapped);
    setLoading(false);
  }

  const handleFileUpload = async (assignmentId: string, file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in first'); return; }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 25MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${assignmentId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('submissions')
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Get the assignment's tenant_id
      const assignment = assignments.find(a => a.id === assignmentId);
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('user_id', user.id)
        .single();

      const { error: subErr } = await supabase.from('submissions').insert({
        assignment_id: assignmentId,
        student_id: user.id,
        student_name: profile?.full_name || user.email || 'Student',
        tenant_id: profile?.tenant_id || '',
        file_url: path,
        status: 'submitted',
        word_count: null,
      });

      if (subErr) throw subErr;

      toast.success('Assignment submitted successfully!');
      await fetchAssignments();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to submit assignment');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent, assignmentId: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(assignmentId, file);
  };

  if (loading) return <DashboardSkeleton />;

  const filtered = activeTab === 'all' ? assignments : assignments.filter((a) => a.submission_status === activeTab);
  const pendingCount = assignments.filter((a) => a.submission_status === 'pending').length;
  const selected = assignments.find((a) => a.id === selectedAssignment);

  const getDaysLeft = (deadline: string) => {
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
            {tab} {tab !== 'all' && `(${assignments.filter((a) => a.submission_status === tab).length})`}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className={`space-y-2 ${selectedAssignment ? 'w-1/2' : 'w-full'}`}>
          {filtered.map((a) => {
            const daysLeft = getDaysLeft(a.deadline);
            const isUrgent = a.submission_status === 'pending' && daysLeft <= 3 && daysLeft >= 0;
            const isOverdue = a.submission_status === 'pending' && daysLeft < 0;

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
                      <span className="text-[10px] text-muted-foreground">{a.module_title}</span>
                    </div>
                    <p className="text-sm font-semibold">{a.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {new Date(a.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      <span>Max: {a.max_marks} marks</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {a.submission_status === 'graded' && a.grade && (
                      <p className="text-lg font-bold text-primary">{a.grade}%</p>
                    )}
                    <StatusBadge
                      status={a.submission_status === 'graded' ? 'Graded' : a.submission_status === 'submitted' ? 'Submitted' : isOverdue ? 'Overdue' : `${daysLeft}d left`}
                      variant={a.submission_status === 'graded' ? 'success' : a.submission_status === 'submitted' ? 'info' : isOverdue ? 'danger' : isUrgent ? 'warning' : 'neutral'}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">No assignments found</div>
          )}
        </div>

        {selected && (
          <div className="w-1/2 surface-card p-6 sticky top-20 self-start">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium bg-secondary px-1.5 py-0.5 rounded">{selected.type}</span>
              <span className="text-[10px] text-muted-foreground">{selected.module_title}</span>
            </div>
            <h2 className="text-lg font-bold mb-4">{selected.title}</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-medium">{new Date(selected.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Marks</span>
                <span className="font-medium">{selected.max_marks}</span>
              </div>
              {selected.word_count && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Word Count</span>
                  <span className="font-medium">{selected.word_count} words</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  status={selected.submission_status || 'pending'}
                  variant={selected.submission_status === 'graded' ? 'success' : selected.submission_status === 'submitted' ? 'info' : 'warning'}
                />
              </div>
            </div>

            {selected.submission_status === 'graded' && selected.grade && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Grade: {selected.grade}%</span>
                </div>
                {selected.feedback && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{selected.feedback}</p>
                )}
              </div>
            )}

            {selected.submission_status === 'pending' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.doc,.ppt,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(selected.id, file);
                  }}
                />
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-default cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, selected.id)}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                      <p className="text-sm font-medium">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Drop files here or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX — Max 25MB</p>
                    </>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? 'Submitting...' : 'Submit Assignment'}
                </Button>
              </div>
            )}

            {selected.submission_status === 'submitted' && (
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
