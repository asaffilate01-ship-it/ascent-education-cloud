import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { BookOpen, Plus, Users, Award, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import type { Tables } from '@/integrations/supabase/types';

export default function ProgrammeManagement() {
  const [selectedProgramme, setSelectedProgramme] = useState<string | null>(null);
  const { data: programmes, loading } = useSupabaseQuery('programmes', {
    orderBy: { column: 'title', ascending: true },
  });
  const { data: modules } = useSupabaseQuery('modules', {
    orderBy: { column: 'title', ascending: true },
  });

  if (loading) return <DashboardSkeleton />;

  const selected = programmes.find((p) => p.id === selectedProgramme);
  const selectedModules = modules.filter((m) => m.programme_id === selectedProgramme);

  return (
    <DashboardLayout
      title="Programme Management"
      subtitle="Manage courses, modules, and curriculum"
      actions={<Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Programme</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{programmes.filter((p) => p.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Programmes</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold">{programmes.reduce((s, p) => s + (p.enrolled || 0), 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Enrolled</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold">{new Set(programmes.map((p) => p.awarding_body)).size}</p>
          <p className="text-xs text-muted-foreground mt-1">Awarding Bodies</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold">{modules.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Modules</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className={`space-y-2 ${selectedProgramme ? 'w-1/2' : 'w-full'}`}>
          {programmes.map((prog) => (
            <div
              key={prog.id}
              onClick={() => setSelectedProgramme(prog.id)}
              className={`surface-card p-4 cursor-pointer transition-default hover:shadow-lg ${selectedProgramme === prog.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${prog.status === 'active' ? 'bg-primary/10' : prog.status === 'draft' ? 'bg-warning/10' : 'bg-secondary'}`}>
                    <BookOpen className={`w-4 h-4 ${prog.status === 'active' ? 'text-primary' : prog.status === 'draft' ? 'text-warning' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{prog.awarding_body}</span>
                      <span className="text-[10px] text-muted-foreground">{prog.level}</span>
                    </div>
                    <p className="text-sm font-semibold">{prog.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {prog.credits || 0} credits</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {prog.duration || '—'}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {prog.enrolled || 0}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={prog.status} variant={prog.status === 'active' ? 'success' : prog.status === 'draft' ? 'warning' : 'neutral'} />
              </div>
            </div>
          ))}
          {programmes.length === 0 && (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">No programmes found</div>
          )}
        </div>

        {selected && (
          <div className="w-1/2 surface-card p-6 sticky top-20 self-start">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{selected.awarding_body}</span>
                  <span className="text-[10px] text-muted-foreground">{selected.level}</span>
                </div>
                <h2 className="text-lg font-bold">{selected.title}</h2>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="surface-data p-3 rounded-lg text-center">
                <p className="text-lg font-bold text-primary">{selected.enrolled || 0}</p>
                <p className="text-[10px] text-muted-foreground">Enrolled</p>
              </div>
              <div className="surface-data p-3 rounded-lg text-center">
                <p className="text-lg font-bold">{selectedModules.length}</p>
                <p className="text-[10px] text-muted-foreground">Modules</p>
              </div>
              <div className="surface-data p-3 rounded-lg text-center">
                <p className="text-lg font-bold">{selected.credits || 0}</p>
                <p className="text-[10px] text-muted-foreground">Credits</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold mb-2">Modules</h3>
            <div className="space-y-1.5">
              {selectedModules.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between p-2.5 surface-data rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{mod.title}</span>
                    <span className="text-[9px] text-muted-foreground">({mod.credits || 0} credits)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{mod.code || ''}</span>
                    <StatusBadge status={mod.status} variant={mod.status === 'active' ? 'success' : 'warning'} />
                  </div>
                </div>
              ))}
              {selectedModules.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No modules assigned</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Module
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
