import DashboardLayout from '@/components/layout/DashboardLayout';
import { Briefcase, FileText, GraduationCap, Globe, Building2, ChevronRight, ExternalLink, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const PARTNER_UNIVERSITIES = [
  { name: 'University of Sunderland', country: 'UK', programme: 'BA (Hons) Business Management', intake: 'Sep 2025', ielts: '6.0' },
  { name: 'Anglia Ruskin University', country: 'UK', programme: 'BA (Hons) Business & Management', intake: 'Jan 2026', ielts: '6.0' },
  { name: 'University of Bolton', country: 'UK', programme: 'BSc Computing Top-Up', intake: 'Sep 2025', ielts: '6.0' },
  { name: 'University of Central Lancashire', country: 'Canada', programme: 'BBA Top-Up', intake: 'Sep 2025', ielts: '6.5' },
];

const JOB_LISTINGS = [
  { title: 'Business Analyst Intern', company: 'TechCorp Pakistan', type: 'Internship', location: 'Lahore', deadline: 'Apr 15', salary: '₨40,000/mo' },
  { title: 'Marketing Assistant', company: 'Global Brands Ltd', type: 'Part-time', location: 'Remote', deadline: 'Mar 30', salary: '₨25,000/mo' },
  { title: 'Graduate Trainee', company: 'Allied Bank', type: 'Full-time', location: 'Islamabad', deadline: 'May 1', salary: '₨80,000/mo' },
  { title: 'Data Entry Specialist', company: 'Systems Ltd', type: 'Part-time', location: 'Karachi', deadline: 'Apr 5', salary: '₨20,000/mo' },
];

export default function StudentCareer() {
  const [cvOpen, setCvOpen] = useState(false);
  const { data: programmes } = useSupabaseQuery('programmes', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
  });

  const stats = useMemo(() => ({
    universities: PARTNER_UNIVERSITIES.length,
    jobs: JOB_LISTINGS.length,
    programmes: programmes.length,
  }), [programmes]);

  const handleCvGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCvOpen(false);
    toast.success('CV generated! You can download it from the Career section.');
  };

  return (
    <DashboardLayout title="Career & Progression" subtitle="University pathways, CV builder, and job opportunities">
      {/* Career Tools */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Dialog open={cvOpen} onOpenChange={setCvOpen}>
          <DialogTrigger asChild>
            <div className="surface-card p-5 text-center hover:shadow-lg transition-default cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-default">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">CV Builder</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create professional CV</p>
              <Button variant="outline" size="sm" className="mt-3 text-xs">Start</Button>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />CV Builder</DialogTitle></DialogHeader>
            <form onSubmit={handleCvGenerate} className="space-y-3">
              <div><Label>Full Name</Label><Input name="name" required placeholder="Your full name" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="email@example.com" /></div>
              <div><Label>Phone</Label><Input name="phone" placeholder="+92 300 1234567" /></div>
              <div><Label>Professional Summary</Label><Textarea name="summary" rows={3} placeholder="Brief professional summary..." /></div>
              <div><Label>Skills (comma-separated)</Label><Input name="skills" placeholder="Excel, Communication, Data Analysis" /></div>
              <div><Label>Work Experience</Label><Textarea name="experience" rows={3} placeholder="Role, Company, Duration..." /></div>
              <Button type="submit" className="w-full"><Download className="w-4 h-4 mr-2" />Generate CV</Button>
            </form>
          </DialogContent>
        </Dialog>

        {[
          { icon: GraduationCap, label: 'University Apps', desc: `${stats.universities} partner universities`, action: 'Apply', count: String(stats.universities) },
          { icon: Briefcase, label: 'Job Board', desc: `${stats.jobs} opportunities`, action: 'Browse', count: String(stats.jobs) },
          { icon: Globe, label: 'Visa Guide', desc: 'UK, Canada, Australia', action: 'Read', count: '' },
        ].map((tool) => (
          <div key={tool.label} className="surface-card p-5 text-center hover:shadow-lg transition-default cursor-pointer group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-default">
              <tool.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-semibold">{tool.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
            <Button variant="outline" size="sm" className="mt-3 text-xs">{tool.action}</Button>
          </div>
        ))}
      </div>

      {/* University Progression */}
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-primary" /> Partner Universities — Top-Up Degrees
      </h3>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {PARTNER_UNIVERSITIES.map((uni) => (
          <div key={uni.name} className="surface-card p-4 hover:shadow-lg transition-default cursor-pointer group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold group-hover:text-primary transition-default">{uni.name}</p>
                  <p className="text-xs text-muted-foreground">{uni.country}</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium mb-2">{uni.programme}</p>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>Intake: {uni.intake}</span>
              <span>IELTS: {uni.ielts}</span>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
              View Requirements <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>

      {/* Job Listings */}
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-primary" /> Job & Internship Opportunities
      </h3>
      <div className="space-y-2">
        {JOB_LISTINGS.map((job) => (
          <div key={job.title} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
            </div>
            <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded hidden sm:inline">{job.type}</span>
            <span className="text-xs font-medium text-primary hidden md:inline">{job.salary}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Due {job.deadline}</span>
            <Button variant="outline" size="sm" className="text-xs">Apply</Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
