import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import Seo from '@/components/Seo';
import TenantNav from '@/components/TenantNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

type Dest = 'germany' | 'uk';
type Step = 0 | 1 | 2 | 3 | 4;

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  study_level: string;
  intake: string;
  prior_qualification: string;
  prior_institution: string;
  prior_year: string;
  prior_grade: string;
  language_status: string;
  language_score: string;
  needs_prep_course: boolean;
  ack_admission_decision: boolean;
  ack_financial: boolean;
  ack_no_guarantee: boolean;
  notes: string;
}

const STEPS = [
  'Personal',
  'Academic history',
  'Language',
  'Destination acknowledgements',
  'Document checklist',
];

const GERMANY_DOCS = [
  'passport', 'transcripts', 'degree_certificates', 'aps_certificate',
  'language_certificate', 'cv', 'motivation_letter', 'financial_evidence',
];
const UK_DOCS = [
  'passport', 'transcripts', 'degree_certificates', 'english_evidence',
  'cv', 'personal_statement', 'financial_evidence', 'tb_test',
];

const DOC_LABELS: Record<string, string> = {
  passport: 'Valid passport',
  transcripts: 'Academic transcripts (attested)',
  degree_certificates: 'Degree certificate(s) (attested)',
  aps_certificate: 'APS certificate (Pakistan applicants)',
  language_certificate: 'German or English language certificate',
  english_evidence: 'Approved English language evidence',
  cv: 'CV / résumé',
  motivation_letter: 'Motivation letter / SOP',
  personal_statement: 'Personal statement',
  financial_evidence: 'Financial evidence (Sperrkonto / bank statements)',
  tb_test: 'TB test certificate (Pakistan)',
};

const EMPTY_FORM: FormState = {
    full_name: '', email: '', phone: '', country: 'Pakistan',
    study_level: '', intake: '', prior_qualification: '', prior_institution: '', prior_year: '', prior_grade: '',
    language_status: '', language_score: '', needs_prep_course: false,
    ack_admission_decision: false, ack_financial: false, ack_no_guarantee: false,
    notes: '',
  };

export default function DestinationApply() {
  const { slug, destination } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [savedNotice, setSavedNotice] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const draftKey = `unipathway-application:${slug}:${destination}`;
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setForm(EMPTY_FORM); setChecklist({}); setStep(0); setSubmitted(false); setSavedNotice('');
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.version !== 1 || !Number.isFinite(draft.savedAt) || Date.now() - draft.savedAt > 7 * 86400000) {localStorage.removeItem(draftKey); return;}
      if (draft.form && typeof draft.form.full_name === 'string') {
        setForm(previous => Object.fromEntries(Object.entries(previous).map(([key,value]) => [key, typeof draft.form[key] === typeof value ? draft.form[key] : value])) as unknown as FormState);
        setChecklist(Object.fromEntries(Object.entries(draft.checklist || {}).filter(([,value])=>typeof value==='boolean')) as Record<string,boolean>);
        setSavedNotice('Your saved draft has been restored. Review each step before submitting.');
      }
    } catch {setSavedNotice('Your saved draft could not be restored. You can start again.');}
  }, [draftKey]);
  const saveDraft = () => {
    try {localStorage.setItem(draftKey, JSON.stringify({version:1,savedAt:Date.now(),form,checklist}));setSavedNotice('Draft saved on this browser for up to 7 days. Do not save personal details on a shared computer.');}
    catch {setSavedNotice('This browser could not save your draft. Please keep this tab open.');}
  };
  if (destination !== 'germany' && destination !== 'uk') {
    return <Navigate to={`/tenant/${slug}`} replace />;
  }
  const dest = destination as Dest;
  const docs = dest === 'germany' ? GERMANY_DOCS : UK_DOCS;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canAdvance = () => {
    if (step === 0) return form.full_name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && /^(?:\+92|0092|0)\d{9,10}$/.test(form.phone.replace(/[\s()-]/g,'')) && form.country === 'Pakistan';
    if (step === 1) return form.study_level && form.intake && form.prior_qualification;
    if (step === 2) return form.language_status;
    if (step === 3) return form.ack_admission_decision && form.ack_financial && form.ack_no_guarantee;
    return true;
  };

  const submit = async () => {
    if (submitting) return;
    if (!form.full_name.trim() || !form.email.trim() || !form.study_level || !form.intake || !form.prior_qualification || !form.language_status || !form.ack_admission_decision || !form.ack_financial || !form.ack_no_guarantee) {setStep(0); toast({title:'Review your application',description:'Complete each step before submitting.',variant:'destructive'}); return;}
    setSubmitting(true);
    try {
      const summary = [
        `Destination: ${dest.toUpperCase()}`,
        `Study level: ${form.study_level}`,
        `Intake: ${form.intake}`,
        `Country: Pakistan`,
        `Prior: ${form.prior_qualification} — ${form.prior_institution} (${form.prior_year}, ${form.prior_grade})`,
        `Language: ${form.language_status} ${form.language_score}; preparation requested: ${form.needs_prep_course ? 'yes' : 'no'}`,
        'Admission, financial and no-guarantee acknowledgements accepted.',
        `Documents available (not uploaded): ${docs.filter(k => checklist[k]).map(k => DOC_LABELS[k]).join(', ') || 'None confirmed'}`,
        form.notes ? `Notes: ${form.notes}` : '',
      ].filter(Boolean).join('\n');
      // Public intake uses the existing server endpoint. Never grant anonymous
      // users direct application-table writes or let them choose an approval stage.
      const {data, error} = await supabase.functions.invoke('contact-form', {
        body: {name: form.full_name.trim(), email: form.email.trim(), phone: form.phone,
          subject: `Study ${dest.toUpperCase()} application review`, message: summary,
          tenant_slug: slug || 'unipathway'},
      });
      if (error || !data?.success || !data?.id) throw new Error('Your application could not be confirmed. Please try again; your draft is still available.');

      toast({ title: 'Application received', description: 'Our counselling team will review your details and contact you.' });
      try {localStorage.removeItem(draftKey);} catch {}
      setSubmitted(true);
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const flag = dest === 'germany' ? '🇩🇪 Germany' : '🇬🇧 United Kingdom';

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Seo
        title={dest === 'germany' ? 'Apply to Study in Germany — UniPathway' : 'Apply to Study in the UK — UniPathway'}
        description="Start your UniPathway application in five short steps. Our counselling team confirms eligibility, documents and next actions."
        canonical={`/apply/${dest}`}
      />
      <TenantNav brandName="UniPathway" />

      {submitted ? <main className="mx-auto max-w-2xl px-5 py-16"><Check className="size-10 text-success"/><h1 className="mt-4 text-3xl font-bold">Application received</h1><p className="mt-4 text-muted-foreground">Your counselling team will review your details and contact you about eligibility and next steps. The document checklist records what you have available; no documents have been uploaded yet.</p><Button className="mt-6" onClick={()=>navigate('/study')}>Explore learning options</Button></main> : <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-28">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">{flag} · Application</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Start your consultancy application</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Five short steps. Our admissions team will review your details and confirm eligibility, documents and next actions.
          </p>
        </div>

        <div className="mb-5 rounded-xl border p-4"><p className="font-semibold">Step {step+1} of {STEPS.length}: {STEPS[step]}</p><progress className="mt-3 h-2 w-full" max={STEPS.length} value={step+1} aria-label="Application progress"/><div className="mt-3 flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={saveDraft}>Save draft on this browser</Button><Button type="button" variant="ghost" onClick={()=>{try{localStorage.removeItem(draftKey);setSavedNotice('Saved copy removed from this browser.');}catch{setSavedNotice('The saved copy could not be removed.');}}}>Remove saved draft</Button></div><p className="mt-2 text-xs text-muted-foreground">Saving is optional. Use your own device because the draft contains your personal details.</p>{savedNotice&&<p role="status" className="mt-2 text-sm">{savedNotice}</p>}</div>
        {/* Stepper */}
        <div className="hidden sm:flex items-center gap-2 mb-6 overflow-x-auto">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary/15 text-primary ring-2 ring-primary' : 'bg-muted text-muted-foreground'}`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              {i < STEPS.length - 1 && <span className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="surface-card border border-border/50 rounded-2xl p-6 space-y-5">
          {step === 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name"><Input aria-label="Full name" autoComplete="name" maxLength={200} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
                <Field label="Email"><Input aria-label="Email" autoComplete="email" maxLength={254} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
                <Field label="Phone / WhatsApp (Pakistan)"><Input aria-label="Phone / WhatsApp (Pakistan)" maxLength={20} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+92 ..." /></Field>
                <Field label="Country of residence">
                  <Input value="Pakistan" readOnly aria-label="Country of residence" />
                  <p className="mt-1 text-xs text-muted-foreground">UniPathway enrols students based in Pakistan.</p>
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Intended study level">
                  <Select value={form.study_level} onValueChange={(v) => set('study_level', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {dest === 'germany' ? (
                        <>
                          <SelectItem value="studienkolleg">Studienkolleg (foundation)</SelectItem>
                          <SelectItem value="bachelors">Bachelor's</SelectItem>
                          <SelectItem value="masters">Master's</SelectItem>
                          <SelectItem value="phd">PhD</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="foundation">Foundation year</SelectItem>
                          <SelectItem value="bachelors">Bachelor's</SelectItem>
                          <SelectItem value="top_up">Top-up (final year)</SelectItem>
                          <SelectItem value="masters">Master's</SelectItem>
                          <SelectItem value="phd">PhD</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Intended intake">
                  <Select value={form.intake} onValueChange={(v) => set('intake', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {dest === 'germany' ? (
                        <>
                          <SelectItem value="winter_2027">Winter 2027</SelectItem>
                          <SelectItem value="summer_2027">Summer 2027</SelectItem>
                          <SelectItem value="winter_2028">Winter 2028</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="september_2027">September 2027</SelectItem>
                          <SelectItem value="january_2027">January 2027</SelectItem>
                          <SelectItem value="september_2028">September 2028</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Highest qualification">
                  <Input value={form.prior_qualification} onChange={(e) => set('prior_qualification', e.target.value)} placeholder="e.g. HSSC / A-Level / BSc" />
                </Field>
                <Field label="Institution"><Input value={form.prior_institution} onChange={(e) => set('prior_institution', e.target.value)} /></Field>
                <Field label="Year of completion"><Input value={form.prior_year} onChange={(e) => set('prior_year', e.target.value)} placeholder="e.g. 2025" /></Field>
                <Field label="Grade / CGPA"><Input value={form.prior_grade} onChange={(e) => set('prior_grade', e.target.value)} placeholder="e.g. 3.2 / 4.0" /></Field>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {dest === 'germany'
                  ? 'Final equivalency is determined by uni-assist / the receiving institution using the Anabin database.'
                  : 'Final equivalency is determined by the UK institution using UK ENIC.'}
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <Field label={dest === 'germany' ? 'German language status' : 'English language status'}>
                <Select value={form.language_status} onValueChange={(v) => set('language_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None yet</SelectItem>
                    <SelectItem value="learning">Currently learning</SelectItem>
                    <SelectItem value="a1">A1</SelectItem>
                    <SelectItem value="a2">A2</SelectItem>
                    <SelectItem value="b1">B1</SelectItem>
                    <SelectItem value="b2">B2 or above</SelectItem>
                    <SelectItem value="certified">Certified (TestDaF / IELTS / PTE / TOEFL)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Score / certificate details (if any)">
                <Input value={form.language_score} onChange={(e) => set('language_score', e.target.value)} placeholder={dest === 'germany' ? 'e.g. TestDaF TDN 4' : 'e.g. IELTS 6.5'} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.needs_prep_course} onCheckedChange={(v) => set('needs_prep_course', v === true)} />
                <span>Enrol me in a language / exam-preparation course at UniPathway.</span>
              </label>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Please read and confirm each statement. These are the launch boundaries of our consultancy service.
              </p>
              {[
                { key: 'ack_admission_decision', text: dest === 'germany'
                    ? 'I understand admission decisions are made by the receiving German institution (or uni-assist) and visa decisions are made by the competent German authority.'
                    : 'I understand admission and CAS decisions are made by the UK institution and visa decisions are made by UK Visas and Immigration.' },
                { key: 'ack_financial', text: dest === 'germany'
                    ? 'I understand I will need to open and fund a Sperrkonto (blocked account) or provide an equivalent scholarship guarantee.'
                    : 'I understand I must demonstrate tuition + 9 months maintenance funds held for 28 consecutive days for the CAS.' },
                { key: 'ack_no_guarantee', text: 'I understand UniPathway does not guarantee admission, scholarship or visa outcomes, and does not provide individual immigration advice unless delivered by a regulated adviser.' },
              ].map((a) => (
                <label key={a.key} className="flex items-start gap-2 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30">
                  <Checkbox
                    checked={(form as any)[a.key]}
                    onCheckedChange={(v) => set(a.key as any, v === true as any)}
                    className="mt-0.5"
                  />
                  <span>{a.text}</span>
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tick the documents you already have available. You can upload them after your counsellor makes contact — we will not lock your application here.
              </p>
              <div className="space-y-2">
                {docs.map((k) => (
                  <label key={k} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer">
                    <Checkbox
                      checked={!!checklist[k]}
                      onCheckedChange={(v) => setChecklist((c) => ({ ...c, [k]: v === true }))}
                    />
                    <span className="text-sm">{DOC_LABELS[k]}</span>
                  </label>
                ))}
              </div>
              <Field label="Anything you'd like your counsellor to know?">
                <Textarea maxLength={2000} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button variant="ghost" onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canAdvance()}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : 'Submit application'}
              </Button>
            )}
          </div>
        </div>
      </div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-1.5">
      <legend className="text-xs font-semibold">{label}</legend>
      {children}
    </fieldset>
  );
}
