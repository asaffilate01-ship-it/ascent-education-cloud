import { useState } from 'react';
import { Search, ShieldCheck, ShieldX, Award, Calendar, GraduationCap, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

type CertResult = {
  certificate_number: string;
  student_name: string;
  programme_title: string;
  awarding_body: string;
  level: string;
  grade: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: string;
};

export default function CertificateVerification() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertResult | null>(null);
  const [searched, setSearched] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setSearched(true);

    const { data } = await supabase
      .from('certificate_verifications' as any)
      .select('certificate_number, student_name, programme_title, awarding_body, level, grade, issue_date, expiry_date, status')
      .eq('certificate_number', query.trim().toUpperCase())
      .maybeSingle();

    setResult((data as unknown as CertResult) || null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Certificate Verification</span>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm" className="text-xs">Staff Login</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Verify a Certificate</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter the certificate number to verify the authenticity of a qualification issued by our accredited centres.
          </p>
        </motion.div>

        {/* Search */}
        <form onSubmit={handleVerify} className="flex gap-2 mb-8">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="e.g. CERT-2026-001234"
            className="text-center font-mono tracking-wider"
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {/* Result */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </motion.div>
          )}

          {!loading && searched && result && (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="surface-card p-6 rounded-xl border-2 border-green-500/30 bg-green-50/5"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-600">Certificate Verified</p>
                  <p className="text-xs text-muted-foreground">This certificate is authentic and {result.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><Award className="w-3 h-3" /> Certificate No.</p>
                  <p className="font-mono font-semibold">{result.certificate_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Student Name</p>
                  <p className="font-semibold">{result.student_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><Building2 className="w-3 h-3" /> Programme</p>
                  <p className="font-medium">{result.programme_title}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Level</p>
                  <p className="font-medium">{result.level}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Awarding Body</p>
                  <p className="font-medium">{result.awarding_body}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Issue Date</p>
                  <p className="font-medium">{new Date(result.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                {result.grade && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Grade</p>
                    <p className="font-semibold text-primary">{result.grade}</p>
                  </div>
                )}
                {result.expiry_date && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Valid Until</p>
                    <p className="font-medium">{new Date(result.expiry_date).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {!loading && searched && !result && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="surface-card p-6 rounded-xl border-2 border-red-500/20 text-center"
            >
              <ShieldX className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-red-600 mb-1">Certificate Not Found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No certificate matches this number. Please double-check the certificate number or contact the issuing institution.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        <div className="mt-12 text-center text-xs text-muted-foreground space-y-2">
          <p>This verification portal confirms certificates issued by accredited centres registered on our platform.</p>
          <p>For further enquiries, please <Link to="/apply" className="text-primary hover:underline">contact admissions</Link>.</p>
        </div>
      </main>
    </div>
  );
}
