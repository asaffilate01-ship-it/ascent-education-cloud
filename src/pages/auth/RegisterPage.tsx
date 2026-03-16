import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Cloud, Eye, EyeOff, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCOUNT_TYPES = [
  { key: 'student', label: 'Student', desc: 'I want to study', role: 'student' },
  { key: 'agent', label: 'Agent', desc: 'I recruit students', role: 'agent' },
] as const;

export default function RegisterPage() {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [accountType, setAccountType] = useState<'student' | 'agent'>('student');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const navigate = useNavigate();

  const updateField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const getRoleForType = () => {
    return ACCOUNT_TYPES.find(t => t.key === accountType)?.role || 'student';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the Terms of Service');
      return;
    }
    if (!gdprConsent) {
      toast.error('Please consent to data processing under GDPR');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
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

    // Assign role after signup
    if (data.user) {
      const role = getRoleForType();
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: role as any,
      });
    }

    toast.success('Account created! Please check your email to verify your account.');
    navigate('/login');
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    setGoogleLoading(false);
    if (error) {
      toast.error('Google sign-in failed. Please try again.');
    }
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
            Join EduCloud
          </h1>
          <p className="text-white/70 mt-4 text-lg max-w-md leading-relaxed">
            {accountType === 'student' && 'Start your journey to UK qualifications today.'}
            {accountType === 'agent' && 'Recruit students and earn commissions with EduCloud.'}
            
          </p>
        </div>
        <div className="space-y-3">
          {[
            { icon: CheckCircle, text: 'OTHM, QUALIFI & IAB accredited' },
            { icon: CheckCircle, text: 'University progression pathways' },
            { icon: CheckCircle, text: 'Virtual campus with live classes' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2">
              <f.icon className="w-4 h-4 text-white/80" />
              <span className="text-white/80 text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
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
              <h2 className="text-2xl font-bold mb-1">Create your account</h2>
              <p className="text-muted-foreground text-sm mb-6">Select your account type</p>

              <div className="space-y-3 mb-6">
                {ACCOUNT_TYPES.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setAccountType(type.key as any)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-default ${
                      accountType === type.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <p className="text-sm font-semibold">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                  </button>
                ))}
              </div>

              <Button className="w-full" onClick={() => setStep('form')}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('type')} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                ← Change account type
              </button>
              <h2 className="text-2xl font-bold mb-1">
                Register as {ACCOUNT_TYPES.find(t => t.key === accountType)?.label}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Enter your details below</p>

              {/* Google Sign-In */}
              <Button
                variant="outline"
                className="w-full py-3 mb-4"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* GDPR Consent */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    className="mt-1 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    I consent to the processing of my personal data in accordance with the{' '}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and GDPR regulations.
                  </span>
                </label>

                {/* Terms */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </span>
                </label>

                <Button type="submit" className="w-full py-3" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
              </p>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link to="/" className="hover:underline">← Back to EduCloud</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
