import DashboardLayout from '@/components/layout/DashboardLayout';
import { Briefcase, FileText, GraduationCap, Globe, Building2, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PARTNER_UNIVERSITIES = [
  { name: 'University of Sunderland', country: 'UK', programme: 'BA (Hons) Business Management', commission: '£3,000', intake: 'Sep 2025' },
  { name: 'Anglia Ruskin University', country: 'UK', programme: 'BA (Hons) Business & Management', commission: '£2,500', intake: 'Jan 2026' },
  { name: 'University of Bolton', country: 'UK', programme: 'BSc Computing Top-Up', commission: '£2,800', intake: 'Sep 2025' },
  { name: 'University of Central Lancashire', country: 'Canada', programme: 'BBA Top-Up', commission: '$4,000', intake: 'Sep 2025' },
];

const JOB_LISTINGS = [
  { title: 'Business Analyst Intern', company: 'TechCorp Pakistan', type: 'Internship', location: 'Lahore', deadline: 'Apr 15' },
  { title: 'Marketing Assistant', company: 'Global Brands Ltd', type: 'Part-time', location: 'Remote', deadline: 'Mar 30' },
  { title: 'Graduate Trainee', company: 'Allied Bank', type: 'Full-time', location: 'Islamabad', deadline: 'May 1' },
];

export default function StudentCareer() {
  return (
    <DashboardLayout title="Career & Progression" subtitle="University pathways, CV builder, and job opportunities">
      {/* Career Tools */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileText, label: 'CV Builder', desc: 'Create professional CV', action: 'Start' },
          { icon: GraduationCap, label: 'University Apps', desc: '4 partner universities', action: 'Apply' },
          { icon: Briefcase, label: 'Job Board', desc: '3 opportunities', action: 'Browse' },
          { icon: Globe, label: 'Visa Guide', desc: 'UK, Canada, Australia', action: 'Read' },
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
            <div className="flex-1">
              <p className="text-sm font-medium">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
            </div>
            <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded">{job.type}</span>
            <span className="text-xs text-muted-foreground">Due {job.deadline}</span>
            <Button variant="outline" size="sm" className="text-xs">Apply</Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
