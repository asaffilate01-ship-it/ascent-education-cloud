import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import unipathwayLogo from '@/assets/unipathway-logo.png';
import {INSTITUTIONAL_AUTH_ENABLED,INSTITUTIONAL_MIN_PASSWORD,institutionalEmail} from '@/lib/institutionalAuth';
import {demoAccountActionsBlocked} from '@/lib/demoAccess';

export default function ResetPasswordPage(){
 if(demoAccountActionsBlocked(null,window.location.hostname))return <main className="min-h-dvh grid place-items-center p-5"><section className="max-w-md space-y-4 rounded-xl border bg-card p-5"><h1 className="text-xl font-bold">Demo password changes are unavailable</h1><p>Contact the authorised demo administrator for access.</p><Button asChild><Link to="/login">Return to sign-in</Link></Button></section></main>;
 return <AccountPasswordReset/>;
}
function AccountPasswordReset() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active=true;
    void supabase.auth.getUser().then(({data,error})=>{if(active)setIsRecovery(!error&&!!data.user&&!demoAccountActionsBlocked(data.user.email,window.location.hostname)&&(!INSTITUTIONAL_AUTH_ENABLED||!!institutionalEmail(data.user.email)));}).catch(()=>{if(active)setIsRecovery(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(active)setIsRecovery(!!session?.user&&!demoAccountActionsBlocked(session.user.email,window.location.hostname)&&(!INSTITUTIONAL_AUTH_ENABLED||!!institutionalEmail(session.user.email)));});
    return()=>{active=false;subscription.unsubscribe();};
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!isRecovery)return;
    const verified=await supabase.auth.getUser();
    if(verified.error||!verified.data.user||demoAccountActionsBlocked(verified.data.user.email,window.location.hostname)){toast.error('Password change is not available for this account.');return;}
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const minimum=INSTITUTIONAL_AUTH_ENABLED?INSTITUTIONAL_MIN_PASSWORD:8;
    if (password.length < minimum) {
      toast.error('Password must be at least '+minimum+' characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if(INSTITUTIONAL_AUTH_ENABLED){const result=await supabase.auth.signOut({scope:'global'});if(result.error){toast.error('Password updated, but sign-out could not be confirmed. Contact your administrator.');return;}}
    toast.success('Password updated successfully');
    navigate('/login');
  };

  if (!isRecovery) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground text-sm mb-4">This link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-primary hover:underline text-sm">Request a new reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <img src={unipathwayLogo} alt="UniPathway" className="h-10 w-auto" />
        </div>

        <h2 className="text-2xl font-bold mb-1">Set new password</h2>
        <p className="text-muted-foreground text-sm mb-6">Enter your new password below</p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-label mb-1.5 block">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={'Min '+(INSTITUTIONAL_AUTH_ENABLED?INSTITUTIONAL_MIN_PASSWORD:8)+' characters'}
                className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-label mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" className="w-full py-3" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
