import { 
  GraduationCap, BookOpen, Users, Globe, ArrowRight, Shield, Video, 
  Briefcase, CreditCard, FileCheck, UserPlus, BarChart3, Building2,
  Zap, CheckCircle, Server, Lock, Cloud, Smartphone, Layers, Menu, X,
  Star, Quote, ChevronRight, Sparkles, TrendingUp, Award, MessageSquare,
  Clock, Eye, Target, Headphones, Moon, Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import heroDashboard from '@/assets/hero-dashboard.png';

// EduCloud Stripe tiers
const TIERS = {
  starter: { price_id: 'price_1TCMVSFFogsDQVs4vjrxg3YN', product_id: 'prod_UAhvHWQxAi5x6L' },
  professional: { price_id: 'price_1TCMVTFFogsDQVs4Fxtrs4ES', product_id: 'prod_UAhvrU5LFmty22' },
  enterprise: { price_id: 'price_1TCMVUFFogsDQVs47Wd3IbXl', product_id: 'prod_UAhvry0Rs90Wce' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function SaaSLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first to subscribe');
        setCheckoutLoading(null);
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (e: any) {
      toast.error(e.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Nav ─── */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Cloud className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-lg text-foreground tracking-tight">EduCloud</span>
              <span className="text-[9px] bg-gold/15 text-gold-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-widest hidden sm:inline" style={{ color: 'hsl(var(--gold))' }}>Platform</span>
            </div>
          </Link>
          {/* Desktop */}
          <div className="hidden lg:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-all font-medium">Features</a>
            <a href="#modules" className="text-muted-foreground hover:text-foreground transition-all font-medium">Modules</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-all font-medium">Pricing</a>
            <a href="#security" className="text-muted-foreground hover:text-foreground transition-all font-medium">Security</a>
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border/50 bg-background hover:bg-accent transition-all"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
              </button>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground">Sign In</Button>
              </Link>
              <Link to="/tenant/unipathway">
                <Button variant="outline" size="sm">Live Demo</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="shadow-md">
                  Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Mobile */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-secondary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="lg:hidden border-t border-border bg-background px-4 py-5 space-y-3"
          >
            {['Features', 'Modules', 'Pricing', 'Security'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="block text-sm text-muted-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>{l}</a>
            ))}
            <div className="flex gap-2 pt-3 border-t border-border">
              <Link to="/login" className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
              <Link to="/register" className="flex-1"><Button size="sm" className="w-full">Get Started</Button></Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl -z-10" style={{ background: 'hsl(var(--gold) / 0.04)' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-12 sm:pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 text-primary text-xs font-semibold px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant Education Operating System</span>
              <ChevronRight className="w-3 h-3" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-[1.05]">
              The Complete Platform for
              <span className="block mt-2" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--gold)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Education Centres
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Launch your accredited college in days. White-labelled virtual campus — from student recruitment to university progression — on one platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <Link to="/register">
                <Button size="lg" className="px-10 h-13 text-base shadow-lg w-full sm:w-auto">
                  Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/tenant/unipathway">
                <Button variant="outline" size="lg" className="h-13 text-base w-full sm:w-auto">
                  <Eye className="w-4 h-4 mr-2" /> See Live Demo
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs text-muted-foreground"
          >
            {[
              { icon: Shield, text: 'GDPR Compliant' },
              { icon: Lock, text: 'AES-256 Encryption' },
              { icon: Award, text: 'OTHM · QUALIFI · IAB' },
              { icon: Clock, text: 'Setup in 15 Minutes' },
            ].map(t => (
              <span key={t.text} className="flex items-center gap-1.5 font-medium">
                <t.icon className="w-3.5 h-3.5 text-primary/60" /> {t.text}
              </span>
            ))}
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-16 max-w-5xl mx-auto relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="p-1 rounded-2xl bg-gradient-to-b from-border/60 to-border/20 shadow-xl">
              <img
                src={heroDashboard}
                alt="EduCloud platform dashboard"
                className="w-full rounded-xl"
                loading="eager"
              />
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {[
              { value: '5+', label: 'Active Centres', icon: Building2 },
              { value: '1,400+', label: 'Students', icon: Users },
              { value: '14', label: 'User Roles', icon: Shield },
              { value: '25+', label: 'Built-in Modules', icon: Layers },
            ].map((s, i) => (
              <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">How It Works</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Launch in Three Steps</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Your accredited virtual college, live in minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '01', title: 'Subscribe & Brand', desc: 'Choose your plan, upload logo, set colours, connect your domain. Your college goes live instantly.', icon: Layers, accent: 'from-primary/10 to-primary/5' },
              { step: '02', title: 'Onboard & Teach', desc: 'Add courses, lecturers, and students. Start live HD classes with whiteboard and attendance tracking.', icon: Video, accent: 'from-gold/10 to-gold/5' },
              { step: '03', title: 'Grow & Progress', desc: 'Recruit via agents, manage fees, ensure QA compliance, and progress students to global universities.', icon: TrendingUp, accent: 'from-success/10 to-success/5' },
            ].map((s, i) => (
              <motion.div key={s.step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative group">
                <div className={`surface-card p-8 h-full border border-border/50 hover:border-primary/20 transition-all hover:shadow-xl`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.accent} flex items-center justify-center mb-6`}>
                    <s.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-6xl font-black text-primary/5 absolute top-6 right-6">{s.step}</span>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MODULES GRID ─── */}
      <section id="modules" className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Not Just an LMS</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">A Full Education Operating System</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Covering the entire student lifecycle from enquiry to graduation</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { icon: UserPlus, label: 'Recruitment CRM', desc: 'Lead capture & nurture', status: 'live' },
              { icon: FileCheck, label: 'Admissions', desc: 'Applications & offers', status: 'live' },
              { icon: Shield, label: 'ID Verification', desc: 'KYC document checks', status: 'live' },
              { icon: BookOpen, label: 'LMS', desc: 'Courses & content', status: 'live' },
              { icon: Video, label: 'Virtual Classroom', desc: 'HD live + recording', status: 'live' },
              { icon: BarChart3, label: 'Attendance', desc: 'QR, online, manual', status: 'live' },
              { icon: FileCheck, label: 'Assessment', desc: 'Assignments & grading', status: 'live' },
              { icon: Shield, label: 'QA / IQA', desc: 'Moderation & audit', status: 'live' },
              { icon: CreditCard, label: 'Finance', desc: 'Fees & instalments', status: 'live' },
              { icon: Briefcase, label: 'Agent Portal', desc: 'Pipeline & commissions', status: 'live' },
              { icon: GraduationCap, label: 'Progression', desc: 'University pathway', status: 'live' },
              { icon: Users, label: 'Career Portal', desc: 'CV builder & jobs', status: 'live' },
              { icon: Globe, label: 'Exams', desc: 'Scheduling & results', status: 'live' },
              { icon: MessageSquare, label: 'Messaging', desc: 'Real-time chat', status: 'live' },
              { icon: Server, label: 'Analytics & BI', desc: 'Reports & insights', status: 'live' },
              { icon: Smartphone, label: 'Mobile PWA', desc: 'Student & teacher', status: 'live' },
              { icon: Lock, label: 'E-Signatures', desc: 'Digital signing', status: 'live' },
              { icon: FileCheck, label: 'Plagiarism Check', desc: 'AI detection', status: 'live' },
              { icon: Target, label: 'Report Cards', desc: 'Auto generation', status: 'soon' },
              { icon: Zap, label: 'AI Proctoring', desc: 'Exam monitoring', status: 'soon' },
            ].map((f) => (
              <motion.div key={f.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-4 hover:shadow-lg transition-all cursor-pointer group border border-border/50 hover:border-primary/20 relative overflow-hidden"
              >
                {f.status === 'soon' && (
                  <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(var(--gold) / 0.15)', color: 'hsl(var(--gold))' }}>Soon</span>
                )}
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-all">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES DEEP DIVE ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Platform Features</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Built for Scale & Compliance</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Building2, title: 'Multi-Tenant Architecture', desc: 'Each centre gets isolated data, custom branding, own domain, and independent user management. Full white-label capability.' },
              { icon: Video, title: 'HD Live Classroom', desc: 'Low-latency video lectures with digital whiteboard, screen sharing, breakout rooms. All sessions auto-recorded and saved.' },
              { icon: Shield, title: 'Audit-Proof Compliance', desc: 'Mandatory moderation workflow, plagiarism + AI detection, auto-sampling, evidence packs. OTHM, QUALIFI & IAB ready.' },
              { icon: Lock, title: 'Enterprise Security', desc: 'AES-256 encryption, RBAC across 14 roles, immutable audit trail, document watermarking, GDPR data export & deletion.' },
              { icon: Briefcase, title: 'Agent CRM', desc: 'Full recruitment pipeline with lead tracking, commission management, payout reconciliation, and agent performance analytics.' },
              { icon: GraduationCap, title: 'University Progression', desc: 'Partner university database, eligibility engine, application tracking, offer management, and visa support checklists.' },
            ].map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="surface-card p-7 border border-border/50 hover:border-primary/20 hover:shadow-xl transition-all group"
              >
                <div className="p-3 rounded-xl bg-primary/8 w-fit mb-5 group-hover:bg-primary/15 transition-all">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 14 ROLES ─── */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Role-Based Access</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">14 Specialised Portals</h2>
            <p className="text-muted-foreground mt-3">Every role gets a purpose-built dashboard</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[
              { role: 'Platform Owner', desc: 'All tenants & billing', level: 'Landlord' },
              { role: 'Centre Director', desc: 'Full college ops', level: 'Tenant' },
              { role: 'Admissions Admin', desc: 'Lead-to-enrolment', level: 'Tenant' },
              { role: 'Lecturer', desc: 'Teaching & grading', level: 'Tenant' },
              { role: 'Programme Leader', desc: 'Curriculum & QA', level: 'Tenant' },
              { role: 'IQA / QA Officer', desc: 'Compliance & audit', level: 'Tenant' },
              { role: 'Exams Officer', desc: 'Scheduling & results', level: 'Tenant' },
              { role: 'Finance Officer', desc: 'Fees & commissions', level: 'Tenant' },
              { role: 'Marketing Officer', desc: 'Campaigns & leads', level: 'Tenant' },
              { role: 'Agent', desc: 'Student recruitment', level: 'External' },
              { role: 'Student', desc: 'Learning & progress', level: 'Tenant' },
              { role: 'Parent / Guardian', desc: 'Oversight & reports', level: 'External' },
              { role: 'University Partner', desc: 'Offers & intake', level: 'External' },
              { role: 'Employer Partner', desc: 'Jobs & internships', level: 'External' },
            ].map((r) => (
              <div key={r.role} className="surface-card p-4 border border-border/50 hover:border-primary/15 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    r.level === 'Landlord' ? 'bg-primary/15 text-primary' :
                    r.level === 'External' ? 'bg-warning/15 text-warning' :
                    'bg-secondary text-muted-foreground'
                  }`}>{r.level}</span>
                </div>
                <p className="text-sm font-semibold">{r.role}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Simple Pricing</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Plans for Every Centre</h2>
            <p className="text-muted-foreground mt-3">Start free, scale as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: 'Starter', price: 'Rs.80,000', gbp: '£200', period: '/month', desc: 'For new centres getting started', features: ['Up to 50 students', 'Basic LMS & Classroom', '1 Admin user', 'Email support', 'EduCloud subdomain'], cta: 'Start Free Trial', tier: 'starter' as const },
              { name: 'Professional', price: 'Rs.200,000', gbp: '£500', period: '/month', desc: 'For growing accredited centres', features: ['Up to 500 students', 'Full LMS + Video + QA', '5 Admin users', 'Custom branding & domain', 'Agent portal', 'Priority support'], cta: 'Get Started', popular: true, tier: 'professional' as const },
              { name: 'Enterprise', price: 'Rs.400,000', gbp: '£1,000', period: '/month', desc: 'For multi-campus institutions', features: ['Unlimited students', 'Full platform access', 'Unlimited admins', 'Custom domain & white-label', 'API access', 'SLA guarantee', 'Dedicated account manager'], cta: 'Contact Sales', tier: 'enterprise' as const },
            ].map((plan) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className={`surface-card p-7 relative border ${plan.popular ? 'border-primary ring-1 ring-primary/20 shadow-xl' : 'border-border/50'}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-700)))', color: 'white' }}>
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">≈ {plan.gbp}/month</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full h-11" 
                  variant={plan.popular ? 'default' : 'outline'} 
                  size="lg"
                  disabled={checkoutLoading === TIERS[plan.tier].price_id}
                  onClick={() => handleCheckout(TIERS[plan.tier].price_id)}
                >
                  {checkoutLoading === TIERS[plan.tier].price_id ? 'Processing…' : plan.cta} 
                  {checkoutLoading !== TIERS[plan.tier].price_id && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section id="security" className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Trust & Security</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Enterprise-Grade Security</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'GDPR Compliant', desc: 'Full consent management, privacy notices, data export, retention policies, and right-to-deletion workflows.' },
              { title: 'AES-256 Encryption', desc: 'All data encrypted at rest and in transit. Passport, ID uploads, and sensitive documents fully encrypted.' },
              { title: 'Immutable Audit Trail', desc: 'Every grade change, moderation action, and identity verification is permanently logged with timestamps.' },
              { title: 'Role-Based Access', desc: '14 distinct roles with granular permissions. Staff MFA, device trust, and session management.' },
              { title: 'Document Watermarking', desc: 'Downloaded materials are watermarked with Student ID and IP to prevent plagiarism and content leaks.' },
              { title: 'AI Plagiarism Detection', desc: 'Automated similarity checking and AI-generated content detection on all student submissions.' },
            ].map((s) => (
              <div key={s.title} className="surface-card p-6 border border-border/50">
                <Lock className="w-5 h-5 text-primary mb-3" />
                <h3 className="text-sm font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STUDENT JOURNEY ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">End-to-End</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">The Complete Student Journey</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">From first enquiry to university graduation — every step on one platform</p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { step: '01', label: 'Lead Capture', desc: 'Website, agents, social media', gradient: 'from-primary/10 to-primary/5' },
                { step: '02', label: 'Application', desc: 'Online form, docs, ID check', gradient: 'from-primary/15 to-primary/8' },
                { step: '03', label: 'Offer & Enrol', desc: 'Eligibility, offer, deposit', gradient: 'from-primary/20 to-primary/10' },
                { step: '04', label: 'Study', desc: 'LMS, live classes, exams', gradient: 'from-primary/25 to-primary/15' },
                { step: '05', label: 'Graduate', desc: 'Certification, progression', gradient: 'from-primary/30 to-primary/20' },
              ].map((s) => (
                <motion.div key={s.step} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="surface-card p-5 text-center border border-border/50 relative overflow-hidden"
                >
                  <span className="text-4xl font-black text-primary/5 absolute top-2 right-3">{s.step}</span>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-3`}>
                    <span className="text-sm font-bold text-primary">{s.step}</span>
                  </div>
                  <p className="text-sm font-bold mb-1">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 surface-card p-5 border border-border/50">
              <p className="text-xs font-bold text-center mb-4 text-muted-foreground uppercase tracking-widest">Supporting Services</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Finance & Billing', 'Agent Commissions', 'QA & Compliance', 'Attendance', 'Analytics', 'Messaging', 'Notifications', 'Document Storage', 'E-Signatures'].map((s) => (
                  <span key={s} className="text-xs font-medium bg-secondary text-foreground px-4 py-2 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Social Proof</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Trusted by Education Leaders</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Dr. Sarah Khan', role: 'Centre Director, UniPathway London', quote: 'EduCloud transformed our operations. We went from spreadsheets to a fully digital campus in 2 weeks. The QA module alone saved us 40 hours per audit cycle.' },
              { name: 'James Okonkwo', role: 'Programme Leader, Manchester Academy', quote: 'The multi-tenant setup means each of our 3 campuses has independent branding but I can oversee everything from one dashboard. Brilliant architecture.' },
              { name: 'Fatima Al-Rashid', role: 'Recruitment Agent, Gulf Region', quote: 'The agent portal is a game-changer. I track students from lead to enrolment, see commission breakdowns, and communicate directly with admissions.' },
            ].map((t) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50"
              >
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-warning text-warning" />)}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON VS COMPETITORS ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Why EduCloud</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">More Than a School ERP</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">See how we compare to traditional school management systems</p>
          </div>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-bold text-foreground">Feature</th>
                  <th className="py-4 px-4 font-bold text-primary text-center">EduCloud</th>
                  <th className="py-4 px-4 font-medium text-muted-foreground text-center">Traditional ERPs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { feature: 'Multi-Tenant Architecture', us: true, them: false },
                  { feature: 'White-Label Custom Branding', us: true, them: false },
                  { feature: 'HD Live Virtual Classroom', us: true, them: 'Basic' },
                  { feature: 'Session Recording & Playback', us: true, them: false },
                  { feature: 'Agent Recruitment CRM', us: true, them: false },
                  { feature: 'University Progression Engine', us: true, them: false },
                  { feature: 'AI Plagiarism Detection', us: true, them: false },
                  { feature: 'QA/IQA Compliance Workflow', us: true, them: false },
                  { feature: 'E-Signatures', us: true, them: false },
                  { feature: '14 Role-Based Dashboards', us: true, them: '3-5 roles' },
                  { feature: 'GDPR Data Export & Deletion', us: true, them: 'Partial' },
                  { feature: 'Stripe Payment Integration', us: true, them: 'Varies' },
                ].map((row) => (
                  <tr key={row.feature} className="hover:bg-secondary/30 transition-all">
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.us === true ? <CheckCircle className="w-5 h-5 text-success mx-auto" /> : <span className="text-muted-foreground">{row.us}</span>}
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {row.them === true ? <CheckCircle className="w-5 h-5 text-success mx-auto" /> : row.them === false ? <X className="w-5 h-5 text-destructive/50 mx-auto" /> : row.them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-95" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 50%, hsl(var(--gold) / 0.15) 0%, transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-primary-foreground leading-tight">
            Ready to Launch Your<br />Education Centre?
          </h2>
          <p className="text-primary-foreground/80 mt-6 text-lg max-w-xl mx-auto">
            Join the growing network of accredited centres powered by EduCloud. Your virtual college, live in minutes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <Link to="/register">
              <Button size="lg" variant="outline" className="bg-background text-foreground hover:bg-background/90 border-0 h-13 px-10 text-base shadow-lg w-full sm:w-auto">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="mailto:sales@educloud.pk?subject=Book%20a%20Demo">
              <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 h-13 px-10 text-base w-full sm:w-auto">
                <Headphones className="w-4 h-4 mr-2" /> Book a Demo
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-foreground text-background/50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-extrabold text-background text-lg">EduCloud</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">The complete Education Operating System for accredited centres worldwide. Built in Pakistan, trusted globally.</p>
              <div className="flex gap-3 mt-5">
                {['OTHM Ready', 'QUALIFI Ready', 'IAB Ready'].map(b => (
                  <span key={b} className="text-[9px] font-bold uppercase tracking-wider bg-background/5 px-2 py-1 rounded">{b}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Platform</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-background transition-all">Features</a></li>
                <li><a href="#pricing" className="hover:text-background transition-all">Pricing</a></li>
                <li><a href="#modules" className="hover:text-background transition-all">Modules</a></li>
                <li><a href="#security" className="hover:text-background transition-all">Security</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Resources</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/tenant/unipathway" className="hover:text-background transition-all">Live Demo</Link></li>
                <li><Link to="/login" className="hover:text-background transition-all">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-background transition-all">Register</Link></li>
                <li><a href="mailto:support@educloud.pk" className="hover:text-background transition-all">Help Centre</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-background transition-all">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-background transition-all">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-background transition-all">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2026 EduCloud. All rights reserved.</p>
            <p className="text-background/30">Built with ❤️ in Pakistan</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
