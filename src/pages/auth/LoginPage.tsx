import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Cloud, Eye, EyeOff, ArrowRight, Loader2, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_HOME, ROLE_LABELS } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/platform';
import unipathwayLogo from '@/assets/unipathway-logo.png.asset.json';

const DEV_ACCOUNTS: { role: UserRole; email: string; label: string; color: string }[] = [
  { role: 'superadmin', email: 'dev.superadmin@educloud.test', label: 'Super Admin', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { role: 'centre_director', email: 'dev.director@educloud.test', label: 'Centre Director', color: 'bg-primary/10 text-primary border-primary/20' },
  { role: 'admissions_admin', email: 'dev.admissions@educloud.test', label: 'Admissions', color: 'bg-accent/50 text-accent-foreground border-accent' },
  { role: 'lecturer', email: 'dev.lecturer@educloud.test', label: 'Lecturer', color: 'bg-secondary text-secondary-foreground border-border' },
  { role: 'programme_leader', email: 'dev.programme@educloud.test', label: 'Programme Lead', color: 'bg-secondary text-secondary-foreground border-border' },
  { role: 'student', email: 'dev.student@educloud.test', label: 'Student', color: 'bg-success/10 text-success border-success/20' },
  { role: 'finance_officer', email: 'dev.finance@educloud.test', label: 'Finance', color: 'bg-warning/10 text-warning border-warning/20' },
  { role: 'iqa_officer', email: 'dev.qa@educloud.test', label: 'QA Officer', color: 'bg-secondary text-secondary-foreground border-border' },
  { role: 'exams_officer', email: 'dev.exams@educloud.test', label: 'Exams', color: 'bg-secondary text-secondary-foreground border-border' },
  { role: 'marketing_officer', email: 'dev.marketing@educloud.test', label: 'Marketing', color: 'bg-secondary text-secondary-foreground border-border' },
  { role: 'agent', email: 'dev.agent@educloud.test', label: 'Agent', color: 'bg-secondary text-secondary-foreground border-border' },
  { role: 'university_partner', email: 'dev.unipartner@educloud.test', label: 'Uni Partner', color: 'bg-primary/10 text-primary border-primary/20' },
  { role: 'employer_partner', email: 'dev.employer@educloud.test', label: 'Employer', color: 'bg-primary/10 text-primary border-primary/20' },
  { role: 'parent_guardian', email: 'dev.parent@educloud.test', label: 'Parent', color: 'bg-secondary text-secondary-foreground border-border' },
];

const DEV_PASSWORD = 'DevTest123!';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const tapTimestamps = useRef<number[]>([]);
  const navigate = useNavigate();

  const handleLogoTap = useCallback(() => {
    const now = Date.now();
    tapTimestamps.current = [...tapTimestamps.current.filter(t => now - t < 3000), now];
    if (tapTimestamps.current.length >= 5) {
      setDevUnlocked(prev => !prev);
      tapTimestamps.current = [];
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in successfully');

    if (data.user) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);
      const primaryRole = (roles?.[0]?.role as UserRole) || 'student';
      navigate(ROLE_HOME[primaryRole] || '/student');
    } else {
      navigate('/student');
    }
  };

  const handleDevLogin = async (account: typeof DEV_ACCOUNTS[0]) => {
    setDevLoading(account.role);
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: DEV_PASSWORD,
    });
    setDevLoading(null);

    if (error) {
      toast.error(`Dev login failed: ${error.message}`);
      return;
    }

    toast.success(`Signed in as ${account.label}`);
    navigate(ROLE_HOME[account.role] || '/student');
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
    <div className="min-h-dvh bg-background flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16 cursor-pointer select-none" onClick={handleLogoTap}>
            <img src={unipathwayLogo.url} alt="UniPathway" className="h-12 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight max-w-md">
            Your Gateway to Global Qualifications
          </h1>
          <p className="text-primary-foreground/70 mt-4 text-lg max-w-md leading-relaxed">
            Study OTHM, QUALIFI and IAB accredited diplomas online and progress to universities in the UK, Germany and beyond.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { stat: '13', label: 'Specialized Portals' },
            { stat: '20+', label: 'Platform Modules' },
            { stat: 'OTHM · QUALIFI · IAB', label: 'Accreditation Support' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-2xl font-bold text-primary-foreground">{s.stat}</span>
              <span className="text-primary-foreground/60 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 cursor-pointer select-none" onClick={handleLogoTap}>
            <img src={unipathwayLogo.url} alt="UniPathway" className="h-10 w-auto" />
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your account to continue</p>

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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-label mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-label">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account? <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            <Link to="/" className="hover:underline">← Back to UniPathway</Link>
          </p>

          {/* Dev Login Panel - Temporarily available until 30 Apr 2026 for live testing */}
          {devUnlocked && (
            <div className="mt-6 border border-dashed border-destructive/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setDevOpen(!devOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-mono text-destructive/70 hover:bg-destructive/5 transition-default"
              >
                <span className="flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5" />
                  DEV LOGIN — Quick Role Switch
                </span>
                {devOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {devOpen && (
                <div className="px-3 pb-3 pt-1">
                  <p className="text-[10px] text-muted-foreground font-mono mb-2">
                    Dev accounts — credentials managed server-side
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEV_ACCOUNTS.map((account) => (
                      <button
                        key={account.role}
                        onClick={() => handleDevLogin(account)}
                        disabled={!!devLoading}
                        className={`text-left px-2.5 py-2 rounded-md border text-[11px] font-medium transition-default hover:opacity-80 disabled:opacity-50 ${account.color}`}
                      >
                        {devLoading === account.role ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="block truncate">{account.label}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
