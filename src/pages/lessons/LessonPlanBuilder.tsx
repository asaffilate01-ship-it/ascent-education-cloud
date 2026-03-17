import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BookOpen, Calendar, Clock, Target, CheckCircle, Edit, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';

const EMPTY_FORM = { title: '', module_id: '', session_date: '', duration_minutes: 60, objectives: '', topics: '', activities: '', resources: '', assessment_method: '', homework: '', notes: '', status: 'draft' };

export default function LessonPlanBuilder() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [filterModule, setFilterModule] = useState('all');

  const { data: plans, refetch } = useSupabaseQuery('lesson_plans' as any);
  const { data: modules } = useSupabaseQuery('modules');

  const isLecturer = user?.role === 'lecturer' || user?.role === 'centre_director' || user?.role === 'programme_leader';

  const modMap = useMemo(() => {
    const m: Record<string, any> = {};
    modules.forEach((mod: any) => { m[mod.id] = mod; });
    return m;
  }, [modules]);

  const filtered = useMemo(() => {
    if (!plans) return [];
    let list = plans as any[];
    if (filterModule !== 'all') list = list.filter(p => p.module_id === filterModule);
    return list.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }, [plans, filterModule]);

  const handleSubmit = async () => {
    if (!form.title || !form.session_date) { toast.error('Title and date required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const payload = {
      ...form,
      tenant_id: (profile.data as any)?.tenant_id,
      lecturer_id: user!.id,
      duration_minutes: Number(form.duration_minutes),
      objectives: form.objectives ? form.objectives.split('\n').filter(Boolean) : [],
      topics: form.topics ? form.topics.split('\n').filter(Boolean) : [],
      module_id: form.module_id || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('lesson_plans' as any).update(payload as any).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('lesson_plans' as any).insert(payload as any));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? 'Plan updated' : 'Lesson plan created');
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    refetch();
  };

  const handleEdit = (plan: any) => {
    setForm({
      title: plan.title,
      module_id: plan.module_id || '',
      session_date: plan.session_date,
      duration_minutes: plan.duration_minutes,
      objectives: (plan.objectives || []).join('\n'),
      topics: (plan.topics || []).join('\n'),
      activities: plan.activities || '',
      resources: plan.resources || '',
      assessment_method: plan.assessment_method || '',
      homework: plan.homework || '',
      notes: plan.notes || '',
      status: plan.status,
    });
    setEditingId(plan.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('lesson_plans' as any).delete().eq('id', id);
    toast.success('Deleted');
    refetch();
  };

  return (
    <DashboardLayout
      title="Lesson Plan Builder"
      subtitle="Create and manage structured lesson plans"
      actions={
        isLecturer && (
          <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditingId(null); setForm(EMPTY_FORM); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'New'} Lesson Plan</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div><Label>Module</Label>
                    <Select value={form.module_id} onValueChange={v => setForm(f => ({ ...f, module_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select module..." /></SelectTrigger>
                      <SelectContent>{modules.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Session Date *</Label><Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} /></div>
                  <div><Label>Duration (mins)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} /></div>
                </div>
                <div><Label>Learning Objectives (one per line)</Label><Textarea rows={3} value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} placeholder="Students will be able to..." /></div>
                <div><Label>Topics Covered (one per line)</Label><Textarea rows={3} value={form.topics} onChange={e => setForm(f => ({ ...f, topics: e.target.value }))} /></div>
                <div><Label>Activities & Methods</Label><Textarea rows={3} value={form.activities} onChange={e => setForm(f => ({ ...f, activities: e.target.value }))} placeholder="Lecture, discussion, group work..." /></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Resources / Materials</Label><Textarea rows={2} value={form.resources} onChange={e => setForm(f => ({ ...f, resources: e.target.value }))} /></div>
                  <div><Label>Assessment Method</Label><Textarea rows={2} value={form.assessment_method} onChange={e => setForm(f => ({ ...f, assessment_method: e.target.value }))} /></div>
                </div>
                <div><Label>Homework / Follow-up</Label><Input value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSubmit}>{editingId ? 'Update' : 'Create'} Lesson Plan</Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="flex items-center gap-3 mb-4">
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filter by module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {modules.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">No lesson plans yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create structured plans for your sessions with objectives, activities, and assessment methods.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan: any) => {
            const mod = plan.module_id ? modMap[plan.module_id] : null;
            return (
              <div key={plan.id} className="surface-card p-5 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={plan.status} variant={plan.status === 'published' ? 'success' : plan.status === 'completed' ? 'default' : 'warning'} />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setViewPlan(plan)} className="p-1 rounded hover:bg-secondary"><Eye className="w-3.5 h-3.5" /></button>
                    {isLecturer && <button onClick={() => handleEdit(plan)} className="p-1 rounded hover:bg-secondary"><Edit className="w-3.5 h-3.5" /></button>}
                    {isLecturer && <button onClick={() => handleDelete(plan.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>}
                  </div>
                </div>
                <h3 className="text-sm font-bold mb-1">{plan.title}</h3>
                {mod && <p className="text-xs text-muted-foreground mb-2">{mod.title}</p>}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(plan.session_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {plan.duration_minutes}m</span>
                </div>
                {plan.objectives?.length > 0 && (
                  <div className="space-y-1">
                    {plan.objectives.slice(0, 2).map((obj: string, i: number) => (
                      <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><Target className="w-2.5 h-2.5 mt-0.5 text-primary shrink-0" /> {obj}</p>
                    ))}
                    {plan.objectives.length > 2 && <p className="text-[10px] text-muted-foreground">+{plan.objectives.length - 2} more</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Plan Modal */}
      <Dialog open={!!viewPlan} onOpenChange={() => setViewPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewPlan && (
            <>
              <DialogHeader><DialogTitle>{viewPlan.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(viewPlan.session_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {viewPlan.duration_minutes} minutes</span>
                  <StatusBadge status={viewPlan.status} />
                </div>
                {viewPlan.objectives?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Learning Objectives</h4>
                    <ul className="space-y-1">{viewPlan.objectives.map((o: string, i: number) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" /> {o}</li>)}</ul>
                  </div>
                )}
                {viewPlan.topics?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Topics</h4>
                    <div className="flex flex-wrap gap-2">{viewPlan.topics.map((t: string, i: number) => <span key={i} className="text-xs bg-secondary px-2 py-1 rounded">{t}</span>)}</div>
                  </div>
                )}
                {viewPlan.activities && <div><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Activities</h4><p className="text-sm">{viewPlan.activities}</p></div>}
                {viewPlan.resources && <div><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Resources</h4><p className="text-sm">{viewPlan.resources}</p></div>}
                {viewPlan.assessment_method && <div><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Assessment</h4><p className="text-sm">{viewPlan.assessment_method}</p></div>}
                {viewPlan.homework && <div><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Homework</h4><p className="text-sm">{viewPlan.homework}</p></div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
