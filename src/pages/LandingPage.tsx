import { GraduationCap, BookOpen, Users, Globe, ArrowRight, Shield } from 'lucide-react';
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
            <a href="#pricing" className="hover:text-foreground transition-default">Pricing</a>
            <Link to="/superadmin">
              <Button size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
          <Shield className="w-3 h-3" /> OTHM · QUALIFI · IAB Accredited
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight max-w-3xl mx-auto leading-tight">
          UK Qualifications, Delivered from Pakistan
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
          Study Level 3–5 diplomas 80% online, then progress to top UK, Canadian and Australian universities for your final year.
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
        <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
          {[
            { value: '50–70%', label: 'Cost savings vs studying abroad' },
            { value: '80%', label: 'Online delivery' },
            { value: '100+', label: 'Partner universities' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary/50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, title: 'Smart LMS', desc: 'Course management, assignments, quizzes, and grading with full audit trail for awarding body compliance.' },
              { icon: Users, title: 'Virtual Classroom', desc: 'HD live lectures with whiteboard, screen sharing, breakout rooms and student monitoring via AWS IVS.' },
              { icon: Globe, title: 'Multi-Tenant SaaS', desc: 'White-label your college with custom branding, domain, and theme. License to other centres.' },
              { icon: Shield, title: 'Exam Proctoring', desc: 'AI-powered face tracking, tab-switch detection, and browser lockdown for secure assessments.' },
              { icon: GraduationCap, title: 'University Progression', desc: 'Built-in career guidance, CV builder, and university application tracking with commission management.' },
              { icon: ArrowRight, title: 'Agent Portal', desc: 'Full CRM for recruitment agents with pipeline, lead tracking, WhatsApp integration, and commission payouts.' },
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

      {/* Pathways */}
      <section id="pathways" className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Academic Pathways</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Business Management', levels: ['Level 4 Diploma (OTHM)', 'Level 5 Diploma (OTHM)', 'BA Top-Up (UK University)'] },
              { title: 'Computing & IT', levels: ['Level 3 IT (QUALIFI)', 'Level 4 Computing', 'Level 5 Computing', 'BSc Top-Up'] },
              { title: 'Accounting & Finance', levels: ['Level 3 Accounting (IAB)', 'Level 4 Accounting', 'Level 5 Accounting', 'BSc Top-Up'] },
            ].map((path) => (
              <div key={path.title} className="surface-card p-5">
                <h3 className="text-sm font-semibold mb-3">{path.title}</h3>
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
