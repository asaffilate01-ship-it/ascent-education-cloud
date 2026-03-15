import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Briefcase, Users, GraduationCap, MapPin, Clock, Plus, Eye, Edit, ExternalLink, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const JOB_POSTS = [
  { id: '1', title: 'Business Analyst Intern', type: 'Internship', location: 'Lahore', applications: 12, status: 'active', posted: '2025-03-01', deadline: 'Apr 15' },
  { id: '2', title: 'Junior Accountant', type: 'Full-time', location: 'Karachi', applications: 8, status: 'active', posted: '2025-03-05', deadline: 'Apr 30' },
  { id: '3', title: 'Marketing Assistant', type: 'Part-time', location: 'Remote', applications: 22, status: 'active', posted: '2025-02-20', deadline: 'Mar 30' },
  { id: '4', title: 'IT Support Technician', type: 'Full-time', location: 'Islamabad', applications: 5, status: 'active', posted: '2025-03-10', deadline: 'May 15' },
  { id: '5', title: 'Data Entry Clerk', type: 'Contract', location: 'Remote', applications: 15, status: 'closed', posted: '2025-01-15', deadline: 'Feb 28' },
];

const CANDIDATES = [
  { id: '1', name: 'Sara Ali', programme: 'Level 5 Business Mgmt', grade: '72%', skills: 'Strategy, Finance, Research', appliedFor: 'Business Analyst Intern', status: 'shortlisted' },
  { id: '2', name: 'Zara Sheikh', programme: 'Level 5 Business Mgmt', grade: '78%', skills: 'Marketing, Analysis, Presentations', appliedFor: 'Marketing Assistant', status: 'interview' },
  { id: '3', name: 'Usman Raza', programme: 'Level 5 Computing', grade: '68%', skills: 'Python, SQL, Cloud', appliedFor: 'IT Support Technician', status: 'applied' },
  { id: '4', name: 'Fatima Khan', programme: 'Level 3 Accounting', grade: '82%', skills: 'Accounting, Excel, QuickBooks', appliedFor: 'Junior Accountant', status: 'shortlisted' },
  { id: '5', name: 'Ali Hussain', programme: 'Level 4 Computing', grade: '62%', skills: 'Networking, Linux, Security', appliedFor: 'IT Support Technician', status: 'applied' },
];

export default function EmployerPortal() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
  const [search, setSearch] = useState('');

  return (
    <DashboardLayout
      title="Employer Partner Portal"
      subtitle="TechCorp Pakistan — Manage job listings and candidates"
      actions={<Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Post New Job</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Listings" value={JOB_POSTS.filter(j => j.status === 'active').length} icon={Briefcase} />
        <StatCard label="Total Applications" value={JOB_POSTS.reduce((s, j) => s + j.applications, 0)} change="+8 this week" changeType="positive" icon={Users} />
        <StatCard label="Shortlisted" value={CANDIDATES.filter(c => c.status === 'shortlisted').length} icon={GraduationCap} />
        <StatCard label="Interviews Scheduled" value={CANDIDATES.filter(c => c.status === 'interview').length} icon={Clock} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['jobs', 'candidates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-default capitalize ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab === 'jobs' ? 'Job Listings' : 'Candidates'}
          </button>
        ))}
      </div>

      {activeTab === 'jobs' && (
        <div className="space-y-2">
          {JOB_POSTS.map((job) => (
            <div key={job.id} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                job.status === 'active' ? 'bg-primary/10' : 'bg-secondary'
              }`}>
                <Briefcase className={`w-4 h-4 ${job.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{job.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                  <span>{job.type}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {job.deadline}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{job.applications}</p>
                <p className="text-[10px] text-muted-foreground">applications</p>
              </div>
              <StatusBadge status={job.status === 'active' ? 'Active' : 'Closed'} variant={job.status === 'active' ? 'success' : 'neutral'} />
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0"><Edit className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'candidates' && (
        <>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates by name, skills, or programme..."
              className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            {CANDIDATES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.skills.toLowerCase().includes(search.toLowerCase())).map((c) => (
              <div key={c.id} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{c.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.programme} · Grade: {c.grade}</p>
                  <div className="flex gap-1 mt-1.5">
                    {c.skills.split(', ').map((s) => (
                      <span key={s} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded font-medium">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Applied for</p>
                  <p className="text-xs font-medium">{c.appliedFor}</p>
                </div>
                <StatusBadge
                  status={c.status === 'shortlisted' ? 'Shortlisted' : c.status === 'interview' ? 'Interview' : 'Applied'}
                  variant={c.status === 'shortlisted' ? 'success' : c.status === 'interview' ? 'info' : 'neutral'}
                />
                <Button variant="outline" size="sm" className="text-xs">View Profile</Button>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
