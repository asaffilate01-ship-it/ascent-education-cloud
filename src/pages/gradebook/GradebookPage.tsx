import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Plus, Search, Download, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';

interface GradebookEntry {
  id: string;
  student_id: string;
  module_id: string;
  programme_id: string;
  assessment_title: string;
  assessment_type: string;
  grade: number | null;
  max_grade: number;
  weight: number;
  status: string;
  graded_by: string | null;
  graded_at: string | null;
  feedback: string | null;
}

export default function GradebookPage() {
  const { user } = useAuth();
  const isStaff = ['lecturer', 'centre_director', 'programme_leader', 'iqa_officer', 'superadmin'].includes(user?.role || '');
  const isStudent = user?.role === 'student';

  const [entries, setEntries] = useState<GradebookEntry[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showGrade, setShowGrade] = useState<GradebookEntry | null>(null);
  const [filterModule, setFilterModule] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    student_id: '', module_id: '', programme_id: '', assessment_title: '',
    assessment_type: 'assignment', max_grade: 100, weight: 1.0,
  });
  const [gradeForm, setGradeForm] = useState({ grade: 0, feedback: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const queries = [
      supabase.from('gradebook_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('modules').select('*').order('title'),
      supabase.from('programmes').select('*'),
    ];
    if (isStaff) {
      queries.push(supabase.from('profiles').select('user_id, full_name, email').limit(500));
    }
    const results = await Promise.all(queries);
    if (results[0].data) setEntries(results[0].data as any);
    if (results[1].data) setModules(results[1].data);
    if (results[2].data) setProgrammes(results[2].data);
    if (results[3]?.data) setProfiles(results[3].data);
    setLoading(false);
  };

  const modMap: Record<string, any> = {};
  modules.forEach(m => { modMap[m.id] = m; });
  const progMap: Record<string, any> = {};
  programmes.forEach(p => { progMap[p.id] = p; });
  const profileMap: Record<string, any> = {};
  profiles.forEach(p => { profileMap[p.user_id] = p; });

  const addEntry = async () => {
    if (!form.student_id || !form.module_id || !form.assessment_title) {
      toast.error('Fill required fields'); return;
    }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const mod = modMap[form.module_id];
    const { error } = await supabase.from('gradebook_entries').insert({
      ...form,
      programme_id: mod?.programme_id || form.programme_id,
      tenant_id: profile.data?.tenant_id,
      status: 'pending',
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Entry added');
    setShowAdd(false);
    setForm({ student_id: '', module_id: '', programme_id: '', assessment_title: '', assessment_type: 'assignment', max_grade: 100, weight: 1.0 });
    fetchData();
  };

  const gradeEntry = async () => {
    if (!showGrade) return;
    const { error } = await supabase.from('gradebook_entries').update({
      grade: gradeForm.grade,
      feedback: gradeForm.feedback,
      status: 'graded',
      graded_by: user!.id,
      graded_at: new Date().toISOString(),
    } as any).eq('id', showGrade.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Grade saved');
    setShowGrade(null);
    fetchData();
  };

  // Calculate module averages for student view
  const moduleAverages = useMemo(() => {
    const byModule: Record<string, { total: number; weighted: number; count: number }> = {};
    entries.filter(e => e.grade !== null && e.status === 'graded').forEach(e => {
      if (!byModule[e.module_id]) byModule[e.module_id] = { total: 0, weighted: 0, count: 0 };
      const pct = (e.grade! / e.max_grade) * 100;
      byModule[e.module_id].total += pct * e.weight;
      byModule[e.module_id].weighted += e.weight;
      byModule[e.module_id].count++;
    });
    return Object.entries(byModule).map(([modId, data]) => ({
      moduleId: modId,
      average: data.weighted > 0 ? Math.round(data.total / data.weighted) : 0,
      count: data.count,
    }));
  }, [entries]);

  const filtered = entries.filter(e => {
    if (filterModule !== 'all' && e.module_id !== filterModule) return false;
    if (search) {
      const q = search.toLowerCase();
      const studentName = profileMap[e.student_id]?.full_name || '';
      return e.assessment_title.toLowerCase().includes(q) || studentName.toLowerCase().includes(q);
    }
    return true;
  });

  const getGradeColor = (pct: number) => {
    if (pct >= 70) return 'text-success';
    if (pct >= 50) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <DashboardLayout title="Gradebook" subtitle={isStaff ? 'Manage student grades and assessments' : 'View your grades and progress'}>
      <div className="space-y-4">
        {/* Student: Module average cards */}
        {isStudent && moduleAverages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moduleAverages.map(ma => (
              <div key={ma.moduleId} className="surface-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{modMap[ma.moduleId]?.title || 'Module'}</p>
                <p className={`text-2xl font-bold ${getGradeColor(ma.average)}`}>{ma.average}%</p>
                <p className="text-xs text-muted-foreground">{ma.count} assessments</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isStaff && <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>}
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">No gradebook entries</p>
            <p className="text-xs text-muted-foreground">{isStaff ? 'Add assessment entries to start grading' : 'No grades recorded yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => {
              const pct = entry.grade !== null ? Math.round((entry.grade / entry.max_grade) * 100) : null;
              const student = profileMap[entry.student_id];
              return (
                <div key={entry.id} className="surface-card p-4 flex items-center gap-4"
                  onClick={() => isStaff && entry.status === 'pending' ? (setShowGrade(entry), setGradeForm({ grade: 0, feedback: '' })) : null}
                  style={{ cursor: isStaff && entry.status === 'pending' ? 'pointer' : 'default' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{entry.assessment_title}</h3>
                      <StatusBadge status={entry.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isStaff && student && <span>{student.full_name}</span>}
                      {isStaff && student && <span>·</span>}
                      <span>{modMap[entry.module_id]?.title || '—'}</span>
                      <span>·</span>
                      <span className="capitalize">{entry.assessment_type}</span>
                      {entry.weight !== 1 && <span>· ×{entry.weight}</span>}
                    </div>
                    {entry.feedback && <p className="text-xs text-muted-foreground mt-1 italic">💬 {entry.feedback}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {pct !== null ? (
                      <>
                        <p className={`text-lg font-bold ${getGradeColor(pct)}`}>{pct}%</p>
                        <p className="text-xs text-muted-foreground">{entry.grade}/{entry.max_grade}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add entry dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Gradebook Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Module *</Label>
              <Select value={form.module_id} onValueChange={v => setForm(p => ({ ...p, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assessment Title *</Label><Input value={form.assessment_title} onChange={e => setForm(p => ({ ...p, assessment_title: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.assessment_type} onValueChange={v => setForm(p => ({ ...p, assessment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Grade</Label><Input type="number" value={form.max_grade} onChange={e => setForm(p => ({ ...p, max_grade: +e.target.value }))} /></div>
              <div><Label>Weight</Label><Input type="number" step="0.1" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grade entry dialog */}
      <Dialog open={!!showGrade} onOpenChange={() => setShowGrade(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grade: {showGrade?.assessment_title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grade (out of {showGrade?.max_grade})</Label>
              <Input type="number" value={gradeForm.grade} onChange={e => setGradeForm(p => ({ ...p, grade: +e.target.value }))} max={showGrade?.max_grade} />
            </div>
            <div><Label>Feedback</Label><Textarea value={gradeForm.feedback} onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrade(null)}>Cancel</Button>
            <Button onClick={gradeEntry}>Save Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
