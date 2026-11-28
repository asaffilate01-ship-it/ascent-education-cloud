import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import unipathwayLogo from '@/assets/unipathway-logo.png';
import WorkspaceRolePicker from '@/components/auth/WorkspaceRolePicker';
import InstitutionalLogin from '@/components/auth/InstitutionalLogin';
import {INSTITUTIONAL_AUTH_ENABLED} from '@/lib/institutionalAuth';



export default function LoginPage(){return INSTITUTIONAL_AUTH_ENABLED?<InstitutionalLogin/>:<LegacyLogin/>;}
function LegacyLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const submitLock=useRef(false);
  const { user: authUser, loading: authLoading, session, logout } = useAuth();
  const [loginError,setLoginError]=useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current||signedIn)return;
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    submitLock.current=true;
    setLoading(true);setLoginError('');
    try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in successfully');

    if (data.user&&data.session) {
      setSignedIn(true);setPassword('');
    } else setLoginError('A verified sign-in session was not returned.');
    } catch { setLoginError('Sign-in could not be completed. Check your connection and secure device storage.'); } finally { submitLock.current=false;setLoading(false); }
  };

  if(authUser&&!authLoading)return <WorkspaceRolePicker/>;
  return (
    <div className="min-h-dvh bg-background flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="inline-flex items-center rounded-2xl bg-white/95 px-5 py-3 shadow-lg ring-1 ring-white/20">
              <img src={unipathwayLogo} alt="UniPathway" className="h-11 w-auto" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gradient-foreground leading-tight max-w-md">
            Your Gateway to Global Qualifications
          </h1>
          <p className="text-gradient-foreground/90 mt-4 text-lg max-w-md leading-relaxed">
            Explore tuition, skills, languages and qualification pathways. Progression depends on confirmed entry requirements and programme approval.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { stat: '21', label: 'Role-specific workspaces' },
            { stat: '20+', label: 'Platform Modules' },
            { stat: 'UK diplomas', label: 'Accreditation Support' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gradient-foreground">{s.stat}</span>
              <span className="text-gradient-foreground/90 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src={unipathwayLogo} alt="UniPathway" className="h-10 w-auto" />
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your account to continue</p>

          {loginError&&<p role="alert" className="mb-4 text-sm text-destructive">{loginError}</p>}
          {(signedIn||session)?<section className="space-y-3 rounded-xl border p-4"><p role="status">{authLoading?'Verifying your assigned roles…':'Your assigned access is not confirmed. No dashboard has been opened.'}</p><Button variant="outline" onClick={()=>{void logout().then(()=>setSignedIn(false)).catch(()=>setLoginError('Sign-out could not be confirmed.'));}}>Sign out and retry</Button></section>:<form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-label mb-1.5 block">Email</label>
              <input
                id="login-email" name="email" autoComplete="username" type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-label">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  id="login-password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" style={{paddingRight: '3.5rem'}}
                  className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-1 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>}

          <p className="mt-5 text-center text-sm"><Link to="/demo" className="font-semibold text-primary underline underline-offset-4">Explore the role-based demo</Link></p>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account? <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            <Link to="/" className="hover:underline">← Back to UniPathway</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
