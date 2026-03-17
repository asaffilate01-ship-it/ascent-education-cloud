import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Upload, User, BookOpen, FileText, CreditCard, Shield, GraduationCap, Globe, Cloud, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Qualifications', icon: GraduationCap },
  { id: 3, title: 'Programme Selection', icon: BookOpen },
  { id: 4, title: 'Documents', icon: FileText },
  { id: 5, title: 'Declaration', icon: Shield },
  { id: 6, title: 'Review & Submit', icon: CreditCard },
];

const PROGRAMMES = [
  { id: '1', title: 'Level 5 Diploma in Business Management', body: 'OTHM', fee: 'Rs.880,000', duration: '12 months', level: 'Level 5' },
  { id: '2', title: 'Level 4 Diploma in Business Management', body: 'OTHM', fee: 'Rs.720,000', duration: '12 months', level: 'Level 4' },
  { id: '3', title: 'Level 5 Diploma in Computing', body: 'QUALIFI', fee: 'Rs.880,000', duration: '12 months', level: 'Level 5' },
  { id: '4', title: 'Level 4 Diploma in Computing', body: 'QUALIFI', fee: 'Rs.720,000', duration: '12 months', level: 'Level 4' },
  { id: '5', title: 'Level 3 Diploma in Accounting', body: 'IAB', fee: 'Rs.560,000', duration: '6 months', level: 'Level 3' },
];

const REQUIRED_DOCS = [
  { id: 'cnic', label: 'CNIC / NICOP / National ID', required: true },
  { id: 'passport', label: 'Passport (if applying for progression)', required: false },
  { id: 'photo', label: 'Passport-size Photograph', required: true },
  { id: 'matric', label: 'Matric / O-Level Certificate', required: true },
  { id: 'inter', label: 'Intermediate / A-Level / FSC Certificate', required: false },
  { id: 'transcript', label: 'Academic Transcript', required: true },
  { id: 'english', label: 'English Proficiency (IELTS/PTE) — if available', required: false },
];

export default function StudentApplication() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const [personal, setPersonal] = useState({
    firstName: '', lastName: '', dob: '', gender: '',
    email: '', phone: '', whatsapp: '',
    address: '', city: '', country: 'Pakistan',
    cnic: '', emergencyName: '', emergencyPhone: '',
  });

  const [qualifications, setQualifications] = useState({
    highestQual: '', institution: '', year: '', grade: '', subjects: '',
  });

  const [declarations, setDeclarations] = useState<boolean[]>([false, false, false, false, false, false]);

  const updatePersonal = (k: string, v: string) => setPersonal(p => ({ ...p, [k]: v }));
  const updateQual = (k: string, v: string) => setQualifications(p => ({ ...p, [k]: v }));

  const handleFileUpload = async (docId: string, file: File) => {
    const filePath = `${user?.id || 'anon'}/${docId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('submissions').upload(filePath, file);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    setUploadedDocs(prev => [...prev, docId]);
    toast.success(`${docId} uploaded successfully`);
  };

  const handleSubmit = async () => {
    if (!personal.firstName || !personal.email) {
      toast.error('Please complete all required fields');
      return;
    }
    if (!selectedProgramme) {
      toast.error('Please select a programme');
      return;
    }
    if (!declarations.every(Boolean)) {
      toast.error('Please accept all declarations');
      return;
    }

    setSubmitting(true);
    const prog = PROGRAMMES.find(p => p.id === selectedProgramme);
    
    const { error } = await supabase.from('applications').insert({
      student_name: `${personal.firstName} ${personal.lastName}`,
      email: personal.email,
      phone: personal.phone || null,
      programme_name: prog?.title || '',
      level: prog?.level || '',
      source: 'direct_application',
      stage: 'applied' as const,
      notes: JSON.stringify({
        dob: personal.dob,
        gender: personal.gender,
        cnic: personal.cnic,
        address: personal.address,
        city: personal.city,
        country: personal.country,
        whatsapp: personal.whatsapp,
        emergency: { name: personal.emergencyName, phone: personal.emergencyPhone },
        qualifications,
        uploadedDocs,
      }),
      user_id: user?.id || null,
    });

    setSubmitting(false);

    if (error) {
      toast.error(`Submission failed: ${error.message}`);
      return;
    }

    setSubmitted(true);
    toast.success('Application submitted successfully!');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for applying. We'll review your application and contact you within 48 hours.
            Check your email ({personal.email}) for confirmation.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/"><Button variant="outline">Back to Home</Button></Link>
            <Link to="/login"><Button>Sign In</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple nav for public apply page */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">EduCloud</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-default">Login</Link>
            <Link to="/register"><Button size="sm">Register</Button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to EduCloud
          </Link>
          <h1 className="text-2xl font-bold">Apply Now</h1>
          <p className="text-sm text-muted-foreground">Student Application Form</p>
        </div>

        {/* Progress Bar */}
        <div className="surface-card p-4 mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-default ${
                    step > s.id ? 'bg-success text-success-foreground' :
                    step === s.id ? 'bg-primary text-primary-foreground' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-xs font-medium hidden lg:block ${step === s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 lg:w-12 h-0.5 mx-2 ${step > s.id ? 'bg-success' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Personal Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label mb-1.5 block">First Name *</label>
                  <input value={personal.firstName} onChange={(e) => updatePersonal('firstName', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Last Name *</label>
                  <input value={personal.lastName} onChange={(e) => updatePersonal('lastName', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Date of Birth *</label>
                  <input type="date" value={personal.dob} onChange={(e) => updatePersonal('dob', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Gender</label>
                  <select value={personal.gender} onChange={(e) => updatePersonal('gender', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Email *</label>
                  <input type="email" value={personal.email} onChange={(e) => updatePersonal('email', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Phone *</label>
                  <input value={personal.phone} onChange={(e) => updatePersonal('phone', e.target.value)} placeholder="+92" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">WhatsApp</label>
                  <input value={personal.whatsapp} onChange={(e) => updatePersonal('whatsapp', e.target.value)} placeholder="+92" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">CNIC / NICOP Number *</label>
                  <input value={personal.cnic} onChange={(e) => updatePersonal('cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-label mb-1.5 block">Address</label>
                  <input value={personal.address} onChange={(e) => updatePersonal('address', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">City</label>
                  <input value={personal.city} onChange={(e) => updatePersonal('city', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Country</label>
                  <select value={personal.country} onChange={(e) => updatePersonal('country', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
                    <option>Pakistan</option>
                    <option>India</option>
                    <option>UAE</option>
                    <option>Saudi Arabia</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <h4 className="text-sm font-semibold mt-6 mb-3">Emergency Contact</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label mb-1.5 block">Contact Name</label>
                  <input value={personal.emergencyName} onChange={(e) => updatePersonal('emergencyName', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Contact Phone</label>
                  <input value={personal.emergencyPhone} onChange={(e) => updatePersonal('emergencyPhone', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Qualifications */}
          {step === 2 && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Academic Qualifications</h3>
              <p className="text-sm text-muted-foreground mb-4">Enter your highest qualification to determine eligibility.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-label mb-1.5 block">Highest Qualification *</label>
                  <select value={qualifications.highestQual} onChange={(e) => updateQual('highestQual', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
                    <option value="">Select</option>
                    <option>Matric / SSC</option>
                    <option>O-Levels</option>
                    <option>Intermediate / FSC / ICS / ICOM</option>
                    <option>A-Levels</option>
                    <option>Level 3 Diploma</option>
                    <option>Level 4 Diploma</option>
                    <option>Bachelor's Degree</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Institution Name</label>
                  <input value={qualifications.institution} onChange={(e) => updateQual('institution', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label mb-1.5 block">Year Completed</label>
                    <input value={qualifications.year} onChange={(e) => updateQual('year', e.target.value)} placeholder="2024" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="text-label mb-1.5 block">Grade / Marks</label>
                    <input value={qualifications.grade} onChange={(e) => updateQual('grade', e.target.value)} placeholder="e.g. A*, 85%" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Key Subjects</label>
                  <input value={qualifications.subjects} onChange={(e) => updateQual('subjects', e.target.value)} placeholder="e.g. Business, Accounting" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
                {qualifications.highestQual && (
                  <div className={`p-4 rounded-lg ${
                    ['Intermediate / FSC / ICS / ICOM', 'A-Levels', 'Level 3 Diploma'].includes(qualifications.highestQual)
                      ? 'bg-success/10 border border-success/20'
                      : qualifications.highestQual === 'Matric / SSC' || qualifications.highestQual === 'O-Levels'
                      ? 'bg-warning/10 border border-warning/20'
                      : 'bg-primary/10 border border-primary/20'
                  }`}>
                    <p className="text-sm font-medium">
                      {['Intermediate / FSC / ICS / ICOM', 'A-Levels', 'Level 3 Diploma'].includes(qualifications.highestQual)
                        ? '✓ Eligible for Level 4 programmes'
                        : qualifications.highestQual === 'Matric / SSC' || qualifications.highestQual === 'O-Levels'
                        ? '⚠ Eligible for Level 3 programmes only'
                        : '✓ Eligible for Level 4 and Level 5 programmes'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Eligibility is subject to verification.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Programme */}
          {step === 3 && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Choose Your Programme</h3>
              <div className="space-y-2">
                {PROGRAMMES.map((prog) => (
                  <div
                    key={prog.id}
                    onClick={() => setSelectedProgramme(prog.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-default ${
                      selectedProgramme === prog.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{prog.body}</span>
                        <p className="text-sm font-semibold mt-1">{prog.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{prog.duration} · {prog.fee}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedProgramme === prog.id ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {selectedProgramme === prog.id && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 surface-data rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Your Pathway to a UK Degree
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">Level 4</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">Level 5</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="bg-success/10 text-success px-2 py-1 rounded font-medium">Top-Up Degree</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold mb-2">Upload Documents</h3>
              <p className="text-sm text-muted-foreground mb-4">Accepted formats: PDF, JPG, PNG (max 10MB each)</p>
              <div className="space-y-2">
                {REQUIRED_DOCS.map((doc) => (
                  <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    uploadedDocs.includes(doc.id) ? 'border-success/30 bg-success/5' : 'border-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      <FileText className={`w-4 h-4 ${uploadedDocs.includes(doc.id) ? 'text-success' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium">{doc.label}</p>
                        {doc.required && <span className="text-[9px] text-destructive font-medium">Required</span>}
                      </div>
                    </div>
                    {uploadedDocs.includes(doc.id) ? (
                      <span className="text-xs text-success font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Uploaded
                      </span>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error('File must be under 10MB');
                                return;
                              }
                              handleFileUpload(doc.id, file);
                            }
                          }}
                        />
                        <Button variant="outline" size="sm" className="text-xs pointer-events-none">
                          <Upload className="w-3 h-3 mr-1" /> Upload
                        </Button>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Declaration */}
          {step === 5 && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Declaration</h3>
              <div className="space-y-4">
                {[
                  'I confirm that the information provided is true and accurate.',
                  'I understand that false information may result in withdrawal of any offer.',
                  'I consent to data processing in accordance with the Privacy Policy and GDPR.',
                  'I understand the hybrid delivery model (80% online, 20% centre-based).',
                  'I acknowledge exams must be taken at an approved centre.',
                  'I understand the fee structure and payment terms.',
                ].map((text, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarations[i]}
                      onChange={() => setDeclarations(prev => prev.map((v, j) => j === i ? !v : v))}
                      className="mt-1 accent-primary"
                    />
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Review Your Application</h3>
              <div className="space-y-4">
                <div className="surface-data p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Applicant</p>
                  <p className="text-sm font-semibold">{personal.firstName} {personal.lastName}</p>
                  <p className="text-xs text-muted-foreground">{personal.email} · {personal.phone}</p>
                </div>
                <div className="surface-data p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Programme</p>
                  <p className="text-sm font-semibold">{PROGRAMMES.find(p => p.id === selectedProgramme)?.title || 'Not selected'}</p>
                  <p className="text-xs text-muted-foreground">{PROGRAMMES.find(p => p.id === selectedProgramme)?.body} · {PROGRAMMES.find(p => p.id === selectedProgramme)?.fee}</p>
                </div>
                <div className="surface-data p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Qualifications</p>
                  <p className="text-sm font-semibold">{qualifications.highestQual || 'Not provided'}</p>
                  <p className="text-xs text-muted-foreground">{qualifications.institution} · {qualifications.year}</p>
                </div>
                <div className="surface-data p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Documents</p>
                  <p className="text-sm font-semibold">{uploadedDocs.length} / {REQUIRED_DOCS.filter(d => d.required).length} required uploaded</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="surface-data p-4 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase">Application Fee</p>
                    <p className="text-xl font-bold text-primary">Rs.20,000</p>
                    <p className="text-xs text-muted-foreground mt-1">Non-refundable</p>
                  </div>
                  <div className="surface-data p-4 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase">Deposit</p>
                    <p className="text-xl font-bold text-primary">Rs.80,000</p>
                    <p className="text-xs text-muted-foreground mt-1">Deducted from tuition</p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-medium">Instalment plans available</p>
                  <p className="text-xs text-muted-foreground mt-1">Split into 3 or 6 monthly payments. Details provided after acceptance.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)}>Back</Button>
            {step < 6 ? (
              <Button onClick={() => setStep(s => s + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="px-8" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                Submit Application
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
