import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Cloud, Eye, EyeOff, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [accountType, setAccountType] = useState<'student' | 'agent' | 'centre'>('student');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const updateField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the Terms of Service');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name,
          phone: formData.phone,
          account_type: accountType,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Account created! Please check your email to verify your account.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">EduCloud</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight max-w-md">
            {accountType === 'student' ? 'Start Your UK Pathway' :
             accountType === 'agent' ? 'Become a Recruitment Partner' :
             'Launch Your Virtual College'}
          </h1>
          <p className="text-white/70 mt-4 text-lg max-w-md">
            {accountType === 'student' ? 'Study OTHM, QUALIFI, and IAB qualifications from Pakistan and progress to top UK, Canadian, and Australian universities.' :
             accountType === 'agent' ? 'Recruit students, earn commissions, and grow your education business with our agent tools.' :
             'Get your accredited centre online in days. Full LMS, video classroom, QA compliance — everything included.'}
          </p>
        </div>
        <div className="space-y-2">
          {(accountType === 'student' ? [
            'Save 50-70% vs studying abroad full-time',
            '80% online, 20% centre-based',
            'Progress to final-year degrees at UK universities',
          ] : accountType === 'agent' ? [
            'Commission tracking and automated payouts',
            'Full recruitment pipeline and CRM',
            'Marketing resources and webinar access',
          ] : [
            'White-label platform with your branding',
            'Built-in compliance for OTHM/QUALIFI/IAB',
            'From £200/month — launch in days',
          ]).map((f) => (
            <div key={f} className="flex items-center gap-2 text-white/80 text-sm">
              <CheckCircle className="w-4 h-4 text-white/60 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">EduCloud</span>
          </div>

          {step === 'type' ? (
            <>
              <h2 className="text-2xl font-bold mb-1">Create an account</h2>
              <p className="text-muted-foreground text-sm mb-6">Choose how you'd like to join the platform</p>
              <div className="space-y-3 mb-6">
                {[
                  { type: 'student' as const, title: 'Student', desc: 'Apply for a programme and start learning', tag: 'Most Common' },
                  { type: 'agent' as const, title: 'Recruitment Agent', desc: 'Recruit students and earn commissions' },
                  { type: 'centre' as const, title: 'Education Centre', desc: 'Launch a new accredited virtual college' },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => { setAccountType(opt.type); setStep('form'); }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-default hover:border-primary/50 hover:bg-primary/5 ${
                      accountType === opt.type ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{opt.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                      {opt.tag && <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{opt.tag}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setStep('type')} className="text-xs text-muted-foreground hover:text-foreground mb-4 inline-block">← Change account type</button>
              <h2 className="text-2xl font-bold mb-1">
                {accountType === 'student' ? 'Student Registration' : accountType === 'agent' ? 'Agent Registration' : 'Centre Registration'}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Fill in your details to get started</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Full Name</label>
                  <input value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Enter your full name" className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="you@example.com" className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone / WhatsApp</label>
                  <input value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+92 300 1234567" className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Min 6 characters" className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
                  <span className="text-xs text-muted-foreground">I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a></span>
                </div>
                <Button type="submit" className="w-full py-3" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            <Link to="/" className="hover:underline">← Back to EduCloud</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
