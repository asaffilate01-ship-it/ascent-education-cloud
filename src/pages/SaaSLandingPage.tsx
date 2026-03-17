import { 
  GraduationCap, BookOpen, Users, Globe, ArrowRight, Shield, Video, 
  Briefcase, CreditCard, FileCheck, UserPlus, BarChart3, Building2,
  Zap, CheckCircle, Server, Lock, Cloud, Smartphone, Layers, Menu, X,
  Star, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import heroDashboard from '@/assets/hero-dashboard.png';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function SaaSLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">EduCloud</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium ml-1 hidden sm:inline">SaaS</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-default">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-default">Pricing</a>
            <a href="#modules" className="hover:text-foreground transition-default">Modules</a>
            <a href="#security" className="hover:text-foreground transition-default">Security</a>
            <Link to="/tenant/unipathway">
              <Button variant="outline" size="sm">Demo Tenant</Button>
            </Link>
            <Link to="/landlord">
              <Button size="sm">Landlord Panel</Button>
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3"
          >
            <a href="#features" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#modules" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Modules</a>
            <a href="#security" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Security</a>
            <div className="flex gap-2 pt-2">
              <Link to="/tenant/unipathway" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">Demo Tenant</Button>
              </Link>
              <Link to="/landlord" className="flex-1">
                <Button size="sm" className="w-full">Landlord Panel</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-subtle opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Building2 className="w-3 h-3" /> Multi-Tenant Education Operating System
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground tracking-tight max-w-4xl mx-auto leading-[1.1]">
              The Complete SaaS Platform for
              <span className="text-primary block mt-1">Education Centres</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-2xl mx-auto leading-relaxed px-4">
              Launch your accredited college in days, not months. EduCloud gives every centre 
              a white-labelled virtual campus — from student recruitment to university progression — 
              all on one platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8 px-4">
              <Link to="/landlord">
                <Button size="lg" className="px-8 w-full sm:w-auto">
                  Launch Your Centre <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/tenant/unipathway">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">See Live Demo</Button>
              </Link>
            </div>
          </motion.div>

          {/* Trust bar */}
          <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-muted-foreground px-4">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> GDPR Compliant</span>
            <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> AES-256 Encryption</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> OTHM / QUALIFI / IAB Ready</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mt-12 max-w-2xl mx-auto px-4">
            {[
              { value: '5', label: 'Active Centres' },
              { value: '1,433', label: 'Students' },
              { value: '13', label: 'Role Types' },
              { value: '20+', label: 'Modules' },
            ].map((s, i) => (
              <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Hero Dashboard Image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-12 sm:mt-16 max-w-4xl mx-auto"
          >
            <img
              src={heroDashboard}
              alt="EduCloud platform dashboard showing student management, analytics, and course administration"
              className="w-full rounded-xl"
              loading="eager"
            />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">How It Works</h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10">Three steps to your own accredited virtual college</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { step: '01', title: 'Subscribe & Brand', desc: 'Choose your plan, upload your logo, set your colours, connect your domain. Your college is live in minutes.', icon: Layers },
              { step: '02', title: 'Onboard & Teach', desc: 'Add courses, lecturers, and students. Start live classes with HD video, whiteboard, and attendance tracking.', icon: Video },
              { step: '03', title: 'Grow & Progress', desc: 'Recruit via agents, manage fees, ensure QA compliance, and progress students to partner universities globally.', icon: GraduationCap },
            ].map((s, i) => (
              <motion.div key={s.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="surface-card p-6 relative">
                <span className="text-5xl font-black text-primary/10 absolute top-4 right-4">{s.step}</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Not Just an LMS</h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
            A full Education Operating System covering the entire student lifecycle
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { icon: UserPlus, label: 'Recruitment CRM', desc: 'Lead capture & nurture' },
              { icon: FileCheck, label: 'Admissions', desc: 'Applications & offers' },
              { icon: Shield, label: 'ID Verification', desc: 'CNIC, passport, face match' },
              { icon: BookOpen, label: 'LMS', desc: 'Courses, modules, content' },
              { icon: Video, label: 'Virtual Classroom', desc: 'HD live + recording' },
              { icon: BarChart3, label: 'Attendance', desc: 'QR, online, biometric' },
              { icon: FileCheck, label: 'Assessment', desc: 'Assignments & rubrics' },
              { icon: Shield, label: 'QA / IQA', desc: 'Moderation & audit' },
              { icon: CreditCard, label: 'Finance', desc: 'Fees, instalments' },
              { icon: Briefcase, label: 'Agent Portal', desc: 'Pipeline & commissions' },
              { icon: GraduationCap, label: 'Progression', desc: 'University pathway' },
              { icon: Users, label: 'Career Portal', desc: 'CV builder & jobs' },
              { icon: Globe, label: 'Exams', desc: 'Scheduling & proctoring' },
              { icon: Smartphone, label: 'Mobile App', desc: 'Student & teacher' },
              { icon: Server, label: 'Analytics & BI', desc: 'Reports & insights' },
            ].map((f) => (
              <div key={f.label} className="surface-card p-3 sm:p-4 hover:shadow-surface-lg transition-default cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-default">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-semibold">{f.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="gradient-subtle py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">Platform Features</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Building2, title: 'Multi-Tenant Architecture', desc: 'Each centre gets isolated data, custom branding, own domain, and independent user management.' },
              { icon: Video, title: 'Virtual Classroom (AWS IVS)', desc: 'Low-latency HD video lectures, digital whiteboard, screen sharing, breakout rooms.' },
              { icon: Shield, title: 'Audit-Proof Compliance', desc: 'Mandatory moderation workflow, plagiarism + AI detection, auto-sampling, evidence packs.' },
              { icon: Lock, title: 'Exam Proctoring', desc: 'AI-powered face tracking, tab-switch detection, browser lockdown, entry verification.' },
              { icon: Briefcase, title: 'Agent CRM', desc: 'Full recruitment pipeline. WhatsApp integration, commission tracking, payout management.' },
              { icon: GraduationCap, title: 'University Progression', desc: 'Partner university database, eligibility engine, application tracking, visa checklists.' },
            ].map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="surface-card p-5">
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 13 Roles */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">13 Specialized Portals</h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10">Every role gets a purpose-built dashboard</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { role: 'Platform Owner', desc: 'Manages all tenants & billing', level: 'Landlord' },
              { role: 'Centre Director', desc: 'Full college operations', level: 'Tenant' },
              { role: 'Admissions Admin', desc: 'Lead-to-enrolment pipeline', level: 'Tenant' },
              { role: 'Lecturer', desc: 'Teaching & marking', level: 'Tenant' },
              { role: 'Programme Leader', desc: 'Curriculum & moderation', level: 'Tenant' },
              { role: 'IQA / QA Officer', desc: 'Compliance & audit', level: 'Tenant' },
              { role: 'Exams Officer', desc: 'Scheduling & proctoring', level: 'Tenant' },
              { role: 'Finance Officer', desc: 'Fees & commissions', level: 'Tenant' },
              { role: 'Marketing Officer', desc: 'Campaigns & leads', level: 'Tenant' },
              { role: 'Agent', desc: 'Recruitment pipeline', level: 'External' },
              { role: 'Student', desc: 'Learning & progression', level: 'Tenant' },
              { role: 'University Partner', desc: 'Offers & commissions', level: 'External' },
              { role: 'Employer Partner', desc: 'Jobs & internships', level: 'External' },
            ].map((r) => (
              <div key={r.role} className="surface-card p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    r.level === 'Landlord' ? 'bg-primary/20 text-primary' :
                    r.level === 'External' ? 'bg-warning/20 text-warning' :
                    'bg-secondary text-muted-foreground'
                  }`}>{r.level}</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold">{r.role}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="gradient-subtle py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">Pricing for Centres</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '£200', period: '/month', desc: 'For new centres getting started', features: ['Up to 50 students', 'Basic LMS & Classroom', '1 Admin user', 'Email support', 'EduCloud subdomain'], cta: 'Start Free Trial', link: 'https://buy.stripe.com/test_cNieVd5PJag2gk60mL00003' },
              { name: 'Professional', price: '£500', period: '/month', desc: 'For growing accredited centres', features: ['Up to 500 students', 'Full LMS + Video + QA', '5 Admin users', 'Custom branding', 'Agent portal', 'Priority support'], cta: 'Get Started', popular: true, link: 'https://buy.stripe.com/test_7sY5kD91Vdsefg20mL00004' },
              { name: 'Enterprise', price: '£1,000', period: '/month', desc: 'For multi-campus institutions', features: ['Unlimited students', 'Full platform access', 'Unlimited admins', 'Custom domain', 'API access', 'White-label', 'SLA guarantee', 'Dedicated support'], cta: 'Contact Sales', link: 'https://buy.stripe.com/test_00w5kDemfewi6Jw0mL00005' },
            ].map((plan) => (
              <div key={plan.name} className={`surface-card p-5 sm:p-6 relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{plan.desc}</p>
                <div className="mb-4">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.link} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                    {plan.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">Enterprise Security & Compliance</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'GDPR Compliant', desc: 'Consent records, privacy notices, data requests, retention rules, and deletion workflows.' },
              { title: 'AES-256 Encryption', desc: 'Data encrypted at rest and in transit. Passport and ID uploads fully encrypted.' },
              { title: 'Immutable Audit Trail', desc: 'Every grade change, moderation action, and identity check is permanently logged.' },
              { title: 'Role-Based Access (RBAC)', desc: '13 distinct roles with granular permissions. Staff MFA, device trust, and session management.' },
              { title: 'Document Watermarking', desc: 'Downloaded materials are watermarked with Student ID and IP to prevent plagiarism.' },
              { title: 'Exam Proctoring', desc: 'Browser lockdown, face tracking, tab-switch detection, and incident logging.' },
            ].map((s) => (
              <div key={s.title} className="surface-card p-5">
                <Lock className="w-4 h-4 text-primary mb-2" />
                <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Flow */}
      <section className="gradient-subtle py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">The Complete Student Journey</h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
            From first enquiry to university graduation — every step managed on one platform
          </p>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { step: '01', label: 'Lead Capture', desc: 'Website, agents, social media, walk-ins', colour: 'bg-primary/10 text-primary' },
                { step: '02', label: 'Application', desc: 'Online form, documents, ID verification', colour: 'bg-primary/15 text-primary' },
                { step: '03', label: 'Offer & Enrol', desc: 'Eligibility check, offer letter, deposit', colour: 'bg-primary/20 text-primary' },
                { step: '04', label: 'Study', desc: 'LMS, live classes, assignments, exams', colour: 'bg-primary/25 text-primary' },
                { step: '05', label: 'Graduate', desc: 'Certification, university progression', colour: 'bg-primary/30 text-primary' },
              ].map((s) => (
                <div key={s.step} className="surface-card p-4 text-center relative">
                  <span className="text-3xl font-black text-primary/10 absolute top-2 right-2">{s.step}</span>
                  <div className={`w-10 h-10 rounded-xl ${s.colour} flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-sm font-bold">{s.step}</span>
                  </div>
                  <p className="text-xs font-semibold mb-1">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 surface-card p-4 sm:p-5">
              <p className="text-xs font-semibold text-center mb-3 text-muted-foreground uppercase tracking-wider">Supporting Services Throughout</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Finance & Billing', 'Agent Commissions', 'QA & Compliance', 'Attendance Tracking', 'Analytics & Reports', 'Messaging', 'Notifications', 'Document Storage'].map((s) => (
                  <span key={s} className="text-[10px] font-medium bg-secondary text-foreground px-3 py-1.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Trusted by Education Leaders</h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10">See what our centres are saying</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Dr. Sarah Khan', role: 'Centre Director, EduPathway London', quote: 'EduCloud transformed our college operations. We went from spreadsheets to a fully digital campus in 2 weeks. The QA module alone saved us 40 hours per audit cycle.' },
              { name: 'James Okonkwo', role: 'Programme Leader, Manchester Academy', quote: 'The multi-tenant setup means each of our 3 campuses has independent branding but I can oversee everything from one dashboard. Brilliant architecture.' },
              { name: 'Fatima Al-Rashid', role: 'Recruitment Agent, Gulf Region', quote: 'The agent portal is a game-changer. I can track my students from lead to enrolment, see commission breakdowns, and communicate directly with admissions.' },
            ].map((t) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="surface-card p-5">
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-warning text-warning" />)}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-subtle py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Launch Your Education Centre?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join the growing network of accredited centres powered by EduCloud. 
            Your virtual college, live in minutes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="px-8 w-full sm:w-auto">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="mailto:sales@educloud.com?subject=Book%20a%20Demo">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">Book a Demo</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background/60 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="w-5 h-5 text-primary" />
                <span className="font-bold text-background">EduCloud</span>
              </div>
              <p className="text-xs leading-relaxed">The complete Education Operating System for accredited centres worldwide.</p>
            </div>
            <div>
              <p className="font-semibold text-background text-sm mb-2">Platform</p>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#features" className="hover:text-background transition-default">Features</a></li>
                <li><a href="#pricing" className="hover:text-background transition-default">Pricing</a></li>
                <li><a href="#security" className="hover:text-background transition-default">Security</a></li>
                <li><a href="#modules" className="hover:text-background transition-default">Modules</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-background text-sm mb-2">Resources</p>
              <ul className="space-y-1.5 text-xs">
                <li><Link to="/apply" className="hover:text-background transition-default">Apply Now</Link></li>
                <li><Link to="/login" className="hover:text-background transition-default">Login</Link></li>
                <li><Link to="/register" className="hover:text-background transition-default">Register</Link></li>
                <li><a href="mailto:support@educloud.com" className="hover:text-background transition-default">Help Centre</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-background text-sm mb-2">Legal</p>
              <ul className="space-y-1.5 text-xs">
                <li><Link to="/privacy" className="hover:text-background transition-default">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-background transition-default">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-background transition-default">GDPR</Link></li>
                <li><Link to="/privacy#data-processing" className="hover:text-background transition-default">Data Processing</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <p>© 2026 EduCloud. All rights reserved.</p>
            <div className="flex gap-4">
              <span>OTHM Ready</span>
              <span>QUALIFI Ready</span>
              <span>IAB Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
