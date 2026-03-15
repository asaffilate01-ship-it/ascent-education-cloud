import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Cloud, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in successfully');
    // Auth state change in context will load user and roles
    // For now navigate to a default; the app can redirect based on role
    navigate('/student');
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
            The Complete Education Operating System
          </h1>
          <p className="text-white/70 mt-4 text-lg max-w-md leading-relaxed">
            From student recruitment to university progression — manage your accredited college on one platform.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { stat: '13', label: 'Specialized Portals' },
            { stat: '20+', label: 'Platform Modules' },
            { stat: 'OTHM · QUALIFI · IAB', label: 'Accreditation Support' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{s.stat}</span>
              <span className="text-white/60 text-sm">{s.label}</span>
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

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your account to continue</p>

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
            <Link to="/" className="hover:underline">← Back to EduCloud</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
