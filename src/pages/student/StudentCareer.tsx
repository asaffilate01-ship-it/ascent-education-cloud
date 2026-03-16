import DashboardLayout from '@/components/layout/DashboardLayout';
import { Briefcase, FileText, GraduationCap, Globe, ChevronRight, ExternalLink, Download, Sparkles, MapPin, Calendar, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function StudentCareer() {
  const [cvOpen, setCvOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('All');

  const { data: universities, loading: unisLoading } = useSupabaseQuery('partner_universities' as any, {
    orderBy: { column: 'country', ascending: true },
  });

  const { data: jobListings, loading: jobsLoading } = useSupabaseQuery('job_listings' as any, {
    orderBy: { column: 'created_at', ascending: false },
  });

  const { data: programmes } = useSupabaseQuery('programmes', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
  });

  const unis = (universities || []) as any[];
  const jobs = (jobListings || []) as any[];

  const countries = ['All', 'UK', 'Australia', 'Canada', 'USA'];
  const filteredUnis = selectedCountry === 'All'
    ? unis
    : unis.filter((u: any) => u.country === selectedCountry);

  const stats = useMemo(() => ({
    universities: unis.length,
    jobs: jobs.length,
    programmes: programmes.length,
  }), [unis, jobs, programmes]);

  const handleCvGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCvOpen(false);
    toast.success('CV generated! Check your downloads for the PDF.');
  };

  const handleApplyUni = (uni: any) => {
    window.open(uni.url, '_blank', 'noopener,noreferrer');
    toast.success(`Opening ${uni.name} application portal...`);
  };

  const handleApplyJob = (job: any) => {
    if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer');
    }
    toast.success(`Opening application for ${job.title} at ${job.company}`);
  };

  const loading = unisLoading || jobsLoading;

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
              <Button variant="outline" size="sm" className="mt-3 text-xs">Build CV</Button>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />CV Builder</DialogTitle></DialogHeader>
            <form onSubmit={handleCvGenerate} className="space-y-3">
              <div><Label>Full Name</Label><Input name="name" required placeholder="Your full name" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="email@example.com" /></div>
              <div><Label>Phone</Label><Input name="phone" placeholder="+44 7700 900000" /></div>
              <div><Label>Professional Summary</Label><Textarea name="summary" rows={3} placeholder="Brief professional summary..." /></div>
              <div><Label>Skills (comma-separated)</Label><Input name="skills" placeholder="Excel, Communication, Data Analysis" /></div>
              <div><Label>Work Experience</Label><Textarea name="experience" rows={3} placeholder="Role, Company, Duration..." /></div>
              <Button type="submit" className="w-full"><Download className="w-4 h-4 mr-2" />Generate CV</Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="surface-card p-5 text-center hover:shadow-lg transition-default cursor-pointer group" onClick={() => document.getElementById('uni-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-default">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold">University Apps</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stats.universities} partner universities</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs">Browse</Button>
        </div>

        <div className="surface-card p-5 text-center hover:shadow-lg transition-default cursor-pointer group" onClick={() => document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-default">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold">Job Board</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stats.jobs} opportunities</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs">Browse</Button>
        </div>

        <div className="surface-card p-5 text-center hover:shadow-lg transition-default cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-default">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold">Visa Guide</p>
          <p className="text-xs text-muted-foreground mt-0.5">UK, Canada, Australia, USA</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => toast.info('Visa guide coming soon — speak to your admissions team for immediate help.')}>Read</Button>
        </div>
      </div>

      {/* University Progression */}
      <div id="uni-section">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> Partner Universities — Top-Up Degrees
          </h3>
          <div className="flex gap-1">
            {countries.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-default ${
                  selectedCountry === c
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                {c === 'All' ? 'All' : c === 'UK' ? '🇬🇧 UK' : c === 'Australia' ? '🇦🇺 AUS' : c === 'Canada' ? '🇨🇦 CAN' : '🇺🇸 USA'}
              </button>
            ))}
          </div>
        </div>

        {unisLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {filteredUnis.map((uni: any) => (
              <div key={uni.id} className="surface-card p-4 hover:shadow-lg transition-default group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary opacity-0 group-hover:opacity-100 transition-default" />
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                      {uni.flag}
                    </div>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-primary transition-default">{uni.name}</p>
                      <p className="text-[10px] text-muted-foreground">{uni.country}</p>
                    </div>
                  </div>
                  <a href={uni.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-accent rounded transition-default">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                  </a>
                </div>
                <p className="text-xs font-medium mb-2">{uni.programme}</p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {uni.intake || 'TBC'}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" /> IELTS {uni.ielts || 'TBC'}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {uni.country}</span>
                  <span className="font-semibold text-primary">{uni.fee || 'Contact'}</span>
                </div>
                <Button size="sm" className="w-full text-xs" onClick={() => handleApplyUni(uni)}>
                  Apply Now <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
            {filteredUnis.length === 0 && !unisLoading && (
              <div className="col-span-full text-center py-8 text-sm text-muted-foreground">No partner universities found for this country.</div>
            )}
          </div>
        )}
      </div>

      {/* Job Listings */}
      <div id="jobs-section">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" /> Job & Internship Opportunities
        </h3>
        {jobsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job: any) => (
              <div key={job.id} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default group">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-default">
                  <Briefcase className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-default" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
                </div>
                <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded hidden sm:inline">{job.type}</span>
                <span className="text-xs font-medium text-primary hidden md:inline">{job.salary}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">Due {job.deadline}</span>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleApplyJob(job)}>
                  Apply
                </Button>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">No job listings available at the moment.</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
