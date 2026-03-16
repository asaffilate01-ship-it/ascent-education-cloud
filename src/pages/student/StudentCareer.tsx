import DashboardLayout from '@/components/layout/DashboardLayout';
import { Briefcase, FileText, GraduationCap, Globe, Building2, ChevronRight, ExternalLink, Download, Sparkles, MapPin, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const PARTNER_UNIVERSITIES = [
  // UK
  { name: 'University of Sunderland', country: 'UK', flag: '🇬🇧', programme: 'BA (Hons) Business Management Top-Up', intake: 'Sep 2025 / Jan 2026', ielts: '6.0', fee: '£9,250/yr', url: 'https://www.sunderland.ac.uk', commission: '£3,000' },
  { name: 'Anglia Ruskin University', country: 'UK', flag: '🇬🇧', programme: 'BA (Hons) Business & Management Top-Up', intake: 'Jan 2026 / Sep 2026', ielts: '6.0', fee: '£9,250/yr', url: 'https://www.aru.ac.uk', commission: '£2,500' },
  { name: 'University of Bolton', country: 'UK', flag: '🇬🇧', programme: 'BSc (Hons) Computing Top-Up', intake: 'Sep 2025', ielts: '6.0', fee: '£12,450/yr', url: 'https://www.bolton.ac.uk', commission: '£2,000' },
  { name: 'University of Central Lancashire', country: 'UK', flag: '🇬🇧', programme: 'BBA (Hons) Business Administration', intake: 'Sep 2025', ielts: '6.0', fee: '£13,000/yr', url: 'https://www.uclan.ac.uk', commission: '£2,800' },
  { name: 'University of Roehampton', country: 'UK', flag: '🇬🇧', programme: 'BA (Hons) Business Management', intake: 'Sep 2025 / Jan 2026', ielts: '6.0', fee: '£14,000/yr', url: 'https://www.roehampton.ac.uk', commission: '£3,200' },
  { name: 'University of Bedfordshire', country: 'UK', flag: '🇬🇧', programme: 'BSc (Hons) Business Information Systems', intake: 'Sep 2025', ielts: '6.0', fee: '£13,500/yr', url: 'https://www.beds.ac.uk', commission: '£2,200' },
  { name: 'University of Greenwich', country: 'UK', flag: '🇬🇧', programme: 'BA (Hons) Business Studies Top-Up', intake: 'Sep 2025', ielts: '6.0', fee: '£14,500/yr', url: 'https://www.gre.ac.uk', commission: '£3,000' },
  // Australia
  { name: 'Charles Sturt University', country: 'Australia', flag: '🇦🇺', programme: 'Bachelor of Business Top-Up', intake: 'Mar 2026 / Jul 2026', ielts: '6.0', fee: 'A$28,000/yr', url: 'https://www.csu.edu.au', commission: 'A$3,500' },
  { name: 'Southern Cross University', country: 'Australia', flag: '🇦🇺', programme: 'Bachelor of Business & Enterprise', intake: 'Mar 2026', ielts: '6.0', fee: 'A$26,400/yr', url: 'https://www.scu.edu.au', commission: 'A$3,000' },
  { name: 'Western Sydney University', country: 'Australia', flag: '🇦🇺', programme: 'Bachelor of Business (Management)', intake: 'Feb 2026 / Jul 2026', ielts: '6.5', fee: 'A$29,000/yr', url: 'https://www.westernsydney.edu.au', commission: 'A$4,000' },
  // Canada
  { name: 'Conestoga College', country: 'Canada', flag: '🇨🇦', programme: 'BBA Honours Top-Up', intake: 'Sep 2025 / Jan 2026', ielts: '6.5', fee: 'C$18,000/yr', url: 'https://www.conestogac.on.ca', commission: 'C$4,000' },
  { name: 'Cape Breton University', country: 'Canada', flag: '🇨🇦', programme: 'BBA Community Economic Development', intake: 'Sep 2025', ielts: '6.5', fee: 'C$17,440/yr', url: 'https://www.cbu.ca', commission: 'C$3,500' },
  { name: 'University Canada West', country: 'Canada', flag: '🇨🇦', programme: 'Bachelor of Commerce', intake: 'Every Quarter', ielts: '6.5', fee: 'C$21,000/yr', url: 'https://www.ucanwest.ca', commission: 'C$4,500' },
  // USA
  { name: 'University of the Potomac', country: 'USA', flag: '🇺🇸', programme: 'BS Business Administration', intake: 'Rolling', ielts: '6.0', fee: '$12,000/yr', url: 'https://www.potomac.edu', commission: '$3,000' },
  { name: 'Westcliff University', country: 'USA', flag: '🇺🇸', programme: 'BBA Top-Up Program', intake: 'Every 8 weeks', ielts: '6.0', fee: '$14,500/yr', url: 'https://www.westcliff.edu', commission: '$3,500' },
  { name: 'Monroe College', country: 'USA', flag: '🇺🇸', programme: 'BS Business Management', intake: 'Sep 2025 / Jan 2026', ielts: '6.0', fee: '$15,200/yr', url: 'https://www.monroecollege.edu', commission: '$2,800' },
];

const JOB_LISTINGS = [
  { title: 'Business Analyst Intern', company: 'TechCorp', type: 'Internship', location: 'London, UK', deadline: 'Apr 15, 2025', salary: '£25,000/yr', url: '#' },
  { title: 'Marketing Coordinator', company: 'Global Brands Ltd', type: 'Full-time', location: 'Remote', deadline: 'Mar 30, 2025', salary: '£28,000/yr', url: '#' },
  { title: 'Graduate Management Trainee', company: 'Barclays PLC', type: 'Full-time', location: 'London, UK', deadline: 'May 1, 2025', salary: '£32,000/yr', url: '#' },
  { title: 'Data Analyst', company: 'Deloitte', type: 'Full-time', location: 'Manchester, UK', deadline: 'Apr 5, 2025', salary: '£30,000/yr', url: '#' },
  { title: 'IT Support Specialist', company: 'NHS Digital', type: 'Full-time', location: 'Leeds, UK', deadline: 'Apr 20, 2025', salary: '£26,000/yr', url: '#' },
  { title: 'Project Coordinator', company: 'Accenture', type: 'Internship', location: 'Birmingham, UK', deadline: 'Apr 10, 2025', salary: '£24,000/yr', url: '#' },
];

export default function StudentCareer() {
  const [cvOpen, setCvOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const { data: programmes } = useSupabaseQuery('programmes', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
  });

  const countries = ['All', 'UK', 'Australia', 'Canada', 'USA'];
  const filteredUnis = selectedCountry === 'All'
    ? PARTNER_UNIVERSITIES
    : PARTNER_UNIVERSITIES.filter(u => u.country === selectedCountry);

  const stats = useMemo(() => ({
    universities: PARTNER_UNIVERSITIES.length,
    jobs: JOB_LISTINGS.length,
    programmes: programmes.length,
  }), [programmes]);

  const handleCvGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCvOpen(false);
    toast.success('CV generated! Check your downloads for the PDF.');
  };

  const handleApplyUni = (uni: typeof PARTNER_UNIVERSITIES[0]) => {
    window.open(uni.url, '_blank', 'noopener,noreferrer');
    toast.success(`Opening ${uni.name} application portal...`);
  };

  const handleApplyJob = (job: typeof JOB_LISTINGS[0]) => {
    toast.success(`Application submitted for ${job.title} at ${job.company}`);
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {filteredUnis.map((uni) => (
            <div key={uni.name} className="surface-card p-4 hover:shadow-lg transition-default group relative overflow-hidden">
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
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {uni.intake}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3" /> IELTS {uni.ielts}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {uni.country}</span>
                <span className="font-semibold text-primary">{uni.fee}</span>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={() => handleApplyUni(uni)}>
                Apply Now <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Job Listings */}
      <div id="jobs-section">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" /> Job & Internship Opportunities
        </h3>
        <div className="space-y-2">
          {JOB_LISTINGS.map((job) => (
            <div key={job.title + job.company} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default group">
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
        </div>
      </div>
    </DashboardLayout>
  );
}
