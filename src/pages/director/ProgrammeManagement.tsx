import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { BookOpen, Plus, ChevronRight, Users, Award, Clock, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Programme } from '@/types/platform';

const MOCK_PROGRAMMES: (Programme & { awardingBody: string })[] = [
  { id: '1', title: 'Level 5 Diploma in Business Management', level: 'Level 5', awardingBody: 'OTHM', credits: 120, duration: '12 months', modules: 6, status: 'active', enrolled: 42 },
  { id: '2', title: 'Level 4 Diploma in Business Management', level: 'Level 4', awardingBody: 'OTHM', credits: 120, duration: '12 months', modules: 6, status: 'active', enrolled: 58 },
  { id: '3', title: 'Level 5 Diploma in Computing', level: 'Level 5', awardingBody: 'QUALIFI', credits: 120, duration: '12 months', modules: 6, status: 'active', enrolled: 35 },
  { id: '4', title: 'Level 4 Diploma in Computing', level: 'Level 4', awardingBody: 'QUALIFI', credits: 120, duration: '12 months', modules: 6, status: 'active', enrolled: 48 },
  { id: '5', title: 'Level 3 Diploma in Accounting', level: 'Level 3', awardingBody: 'IAB', credits: 60, duration: '6 months', modules: 4, status: 'active', enrolled: 22 },
  { id: '6', title: 'Level 5 Diploma in Marketing', level: 'Level 5', awardingBody: 'OTHM', credits: 120, duration: '12 months', modules: 6, status: 'draft', enrolled: 0 },
  { id: '7', title: 'Level 3 Diploma in IT', level: 'Level 3', awardingBody: 'QUALIFI', credits: 60, duration: '6 months', modules: 4, status: 'archived', enrolled: 0 },
];

const MODULES_FOR_PROGRAMME = [
  { id: 'm1', name: 'Strategic Management', credits: 20, semester: 1, lecturer: 'Dr. Khan', status: 'active' },
  { id: 'm2', name: 'Financial Analysis', credits: 20, semester: 1, lecturer: 'Mr. Rashid', status: 'active' },
  { id: 'm3', name: 'Business Environment', credits: 20, semester: 1, lecturer: 'Ms. Ahmed', status: 'active' },
  { id: 'm4', name: 'Marketing Strategy', credits: 20, semester: 2, lecturer: 'Dr. Farooq', status: 'active' },
  { id: 'm5', name: 'Research Methods', credits: 20, semester: 2, lecturer: 'TBC', status: 'draft' },
  { id: 'm6', name: 'Operations Management', credits: 20, semester: 2, lecturer: 'TBC', status: 'draft' },
];

export default function ProgrammeManagement() {
  const [selectedProgramme, setSelectedProgramme] = useState<string | null>(null);
  const selected = MOCK_PROGRAMMES.find(p => p.id === selectedProgramme);

  return (
    <DashboardLayout
      title="Programme Management"
      subtitle="Manage courses, modules, and curriculum"
      actions={<Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Programme</Button>}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{MOCK_PROGRAMMES.filter(p => p.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Programmes</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold">{MOCK_PROGRAMMES.reduce((s, p) => s + p.enrolled, 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Enrolled</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold">3</p>
          <p className="text-xs text-muted-foreground mt-1">Awarding Bodies</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-bold">{MOCK_PROGRAMMES.reduce((s, p) => s + p.modules, 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Modules</p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Programme List */}
        <div className={`space-y-2 ${selectedProgramme ? 'w-1/2' : 'w-full'}`}>
          {MOCK_PROGRAMMES.map((prog) => (
            <div
              key={prog.id}
              onClick={() => setSelectedProgramme(prog.id)}
              className={`surface-card p-4 cursor-pointer transition-default hover:shadow-lg ${
                selectedProgramme === prog.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    prog.status === 'active' ? 'bg-primary/10' : prog.status === 'draft' ? 'bg-warning/10' : 'bg-secondary'
                  }`}>
                    <BookOpen className={`w-4 h-4 ${
                      prog.status === 'active' ? 'text-primary' : prog.status === 'draft' ? 'text-warning' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{prog.awardingBody}</span>
                      <span className="text-[10px] text-muted-foreground">{prog.level}</span>
                    </div>
                    <p className="text-sm font-semibold">{prog.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {prog.credits} credits</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {prog.duration}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {prog.enrolled}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge
                  status={prog.status}
                  variant={prog.status === 'active' ? 'success' : prog.status === 'draft' ? 'warning' : 'neutral'}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-1/2 surface-card p-6 sticky top-20 self-start">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{selected.awardingBody}</span>
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
                <p className="text-lg font-bold text-primary">{selected.enrolled}</p>
                <p className="text-[10px] text-muted-foreground">Enrolled</p>
              </div>
              <div className="surface-data p-3 rounded-lg text-center">
                <p className="text-lg font-bold">{selected.modules}</p>
                <p className="text-[10px] text-muted-foreground">Modules</p>
              </div>
              <div className="surface-data p-3 rounded-lg text-center">
                <p className="text-lg font-bold">{selected.credits}</p>
                <p className="text-[10px] text-muted-foreground">Credits</p>
              </div>
            </div>

            {/* Modules */}
            <h3 className="text-sm font-semibold mb-2">Modules</h3>
            <div className="space-y-1.5">
              {MODULES_FOR_PROGRAMME.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between p-2.5 surface-data rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{mod.name}</span>
                    <span className="text-[9px] text-muted-foreground">({mod.credits} credits)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">S{mod.semester} · {mod.lecturer}</span>
                    <StatusBadge status={mod.status} variant={mod.status === 'active' ? 'success' : 'warning'} />
                  </div>
                </div>
              ))}
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
