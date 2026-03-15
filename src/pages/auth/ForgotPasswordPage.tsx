import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Cloud, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Cloud className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">EduCloud</span>
        </div>

        {!sent ? (
          <>
            <h2 className="text-2xl font-bold mb-1">Reset your password</h2>
            <p className="text-muted-foreground text-sm mb-6">Enter your email and we'll send you a reset link</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-label mb-1.5 block">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-secondary text-sm px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm mb-6">We've sent a password reset link to <span className="font-medium text-foreground">{email}</span></p>
            <Button variant="outline" onClick={() => setSent(false)}>Try another email</Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/login" className="hover:underline flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
