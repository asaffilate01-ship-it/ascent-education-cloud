import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Briefcase, Users, GraduationCap, MapPin, Clock, Plus, Eye, Edit, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

export default function EmployerPortal() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
  const [search, setSearch] = useState('');

  // Use programmes as proxy for available talent pool, applications for candidates
  const { data: applications, loading: aLoading } = useSupabaseQuery('applications', {
    orderBy: { column: 'updated_at', ascending: false },
  });
  const { data: programmes, loading: pLoading } = useSupabaseQuery('programmes');

  const loading = aLoading || pLoading;
  if (loading) return <DashboardSkeleton />;

  // Candidates = enrolled applications
  const candidates = applications.filter(a => a.stage === 'enrolled');
  const filteredCandidates = candidates.filter(c =>
    c.student_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.programme_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Employer Partner Portal"
      subtitle="Manage recruitment and connect with qualified graduates"
      actions={<Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Post New Job</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Available Graduates" value={candidates.length} icon={Users} />
        <StatCard label="Programmes" value={programmes.length} icon={GraduationCap} />
        <StatCard label="Active Centres" value={new Set(applications.map(a => a.tenant_id)).size} icon={Briefcase} />
        <StatCard label="Avg Placement" value="85%" change="completion rate" changeType="positive" icon={Clock} />
      </div>

      <div className="flex gap-1 mb-4">
        {(['jobs', 'candidates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-default capitalize ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab === 'jobs' ? 'Programmes' : `Candidates (${candidates.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'jobs' && (
        <div className="space-y-2">
          {programmes.map((prog) => (
            <div key={prog.id} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{prog.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{prog.level}</span>
                  <span>{prog.awarding_body}</span>
                  <span>{prog.duration || 'N/A'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{prog.enrolled || 0}</p>
                <p className="text-[10px] text-muted-foreground">enrolled</p>
              </div>
              <StatusBadge status={prog.status === 'active' ? 'Active' : prog.status} variant={prog.status === 'active' ? 'success' : 'neutral'} />
            </div>
          ))}
          {programmes.length === 0 && (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">No programmes available</div>
          )}
        </div>
      )}

      {activeTab === 'candidates' && (
        <>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates by name or programme..."
              className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            {filteredCandidates.map((c) => (
              <div key={c.id} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">
                    {c.student_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{c.student_name}</p>
                  <p className="text-xs text-muted-foreground">{c.programme_name || 'No programme'} · {c.level || 'N/A'}</p>
                </div>
                <StatusBadge status="Enrolled" variant="success" />
                <Button variant="outline" size="sm" className="text-xs">View Profile</Button>
              </div>
            ))}
            {filteredCandidates.length === 0 && (
              <div className="surface-card p-12 text-center text-muted-foreground text-sm">No candidates found</div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
