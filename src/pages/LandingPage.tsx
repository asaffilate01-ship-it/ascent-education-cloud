import { GraduationCap, BookOpen, Users, Globe, ArrowRight, Shield, Video, Briefcase, CreditCard, FileCheck, UserPlus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">EduPathway</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-default">Features</a>
            <a href="#pathways" className="hover:text-foreground transition-default">Pathways</a>
            <a href="#roles" className="hover:text-foreground transition-default">Portals</a>
            <Link to="/superadmin">
              <Button size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 gradient-subtle text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
            <Shield className="w-3 h-3" /> OTHM · QUALIFI · IAB Accredited Centre
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight max-w-3xl mx-auto leading-tight">
            UK Qualifications,<br />
            <span className="text-primary">Delivered from Pakistan</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
            A complete Education Operating System — from student recruitment to university progression. Study Level 3–5 diplomas 80% online.
          </p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to="/superadmin">
              <Button size="lg">
                Open Platform <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">View Courses</Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mt-16 max-w-2xl mx-auto">
            {[
              { value: '13', label: 'User Roles' },
              { value: '50–70%', label: 'Cost savings' },
              { value: '80%', label: 'Online delivery' },
              { value: '100+', label: 'Partner universities' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Scope */}
      <section className="gradient-subtle py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-3">Not Just an LMS</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">A full Education Operating System covering the entire student lifecycle</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: UserPlus, label: 'Recruitment' },
              { icon: FileCheck, label: 'Admissions' },
              { icon: Shield, label: 'Verification' },
              { icon: BookOpen, label: 'Teaching' },
              { icon: Video, label: 'Virtual Class' },
              { icon: BarChart3, label: 'Attendance' },
              { icon: FileCheck, label: 'Assessment' },
              { icon: Shield, label: 'QA / IQA' },
              { icon: CreditCard, label: 'Finance' },
              { icon: Briefcase, label: 'Agents' },
              { icon: GraduationCap, label: 'Progression' },
              { icon: Users, label: 'Career Portal' },
            ].map((f) => (
              <div key={f.label} className="surface-card p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, title: 'Smart LMS', desc: 'Course management, assignments, quizzes, grading rubrics with full audit trail for OTHM, QUALIFI, and IAB compliance.' },
              { icon: Video, title: 'Virtual Classroom', desc: 'HD live lectures with whiteboard, screen sharing, breakout rooms, student monitoring, and auto-recording.' },
              { icon: Globe, title: 'Multi-Tenant SaaS', desc: 'White-label for colleges with custom branding, domain, theme editor with live preview. License to other centres.' },
              { icon: Shield, title: 'QA & Compliance', desc: 'Mandatory moderation workflow, plagiarism + AI detection, auto-sampling, evidence packs for external verification.' },
              { icon: GraduationCap, title: 'University Progression', desc: 'Partner university database, eligibility rules, application tracking, visa checklists, commission management.' },
              { icon: Briefcase, title: 'Agent CRM', desc: 'Full pipeline from lead to enrolment. Commission tracking, WhatsApp integration, performance analytics.' },
            ].map((f) => (
              <div key={f.title} className="surface-card p-5">
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section id="roles" className="gradient-subtle py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">13 Specialized Portals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              'Super Admin', 'Centre Director', 'Admissions Admin', 'Lecturer',
              'Programme Leader', 'IQA / QA Officer', 'Exams Officer', 'Finance Officer',
              'Marketing Officer', 'Agent', 'Student', 'University Partner', 'Employer Partner',
            ].map((role) => (
              <div key={role} className="surface-card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pathways */}
      <section id="pathways" className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Academic Pathways</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Business Management', body: 'OTHM', levels: ['Level 4 Diploma', 'Level 5 Diploma', 'BA Top-Up (UK University)'] },
              { title: 'Computing & IT', body: 'QUALIFI', levels: ['Level 3 IT', 'Level 4 Computing', 'Level 5 Computing', 'BSc Top-Up'] },
              { title: 'Accounting & Finance', body: 'IAB', levels: ['Level 3 Accounting', 'Level 4 Accounting', 'Level 5 Accounting', 'BSc Top-Up'] },
            ].map((path) => (
              <div key={path.title} className="surface-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{path.title}</h3>
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{path.body}</span>
                </div>
                <div className="space-y-2">
                  {path.levels.map((level, i) => (
                    <div key={level} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm">{level}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Overview */}
      <section className="gradient-subtle py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">System Architecture</h2>
          <div className="surface-card p-6 max-w-3xl mx-auto">
            <div className="space-y-3 text-sm font-mono text-center">
              <div className="surface-data p-3 rounded-lg">Public Website · Student App · Agent App · Admin Portal</div>
              <div className="text-muted-foreground">↓</div>
              <div className="surface-data p-3 rounded-lg">API Gateway Layer</div>
              <div className="text-muted-foreground">↓</div>
              <div className="grid grid-cols-5 gap-1.5">
                {['Admissions', 'LMS', 'Attendance', 'Exams', 'QA', 'Finance', 'Agents', 'Progression', 'Careers', 'Identity'].map((s) => (
                  <div key={s} className="bg-primary/10 text-primary text-[10px] font-medium p-1.5 rounded text-center">{s}</div>
                ))}
              </div>
              <div className="text-muted-foreground">↓</div>
              <div className="surface-data p-3 rounded-lg">Shared Services · Identity · Notifications</div>
              <div className="text-muted-foreground">↓</div>
              <div className="surface-data p-3 rounded-lg">PostgreSQL + Object Storage</div>
              <div className="text-muted-foreground">↓</div>
              <div className="surface-data p-3 rounded-lg">Analytics · Logs · Audit · BI Layer</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background/70 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs">
          <p>© 2026 EduPathway. UK-accredited education platform.</p>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms</span>
            <span>GDPR</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
