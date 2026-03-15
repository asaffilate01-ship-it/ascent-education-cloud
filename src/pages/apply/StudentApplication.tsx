import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronRight, Upload, User, BookOpen, FileText, CreditCard, Shield, GraduationCap, Globe } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Qualifications', icon: GraduationCap },
  { id: 3, title: 'Programme Selection', icon: BookOpen },
  { id: 4, title: 'Documents', icon: FileText },
  { id: 5, title: 'Declaration', icon: Shield },
  { id: 6, title: 'Payment', icon: CreditCard },
];

const PROGRAMMES = [
  { id: '1', title: 'Level 5 Diploma in Business Management', body: 'OTHM', fee: '£1,200', duration: '12 months' },
  { id: '2', title: 'Level 4 Diploma in Business Management', body: 'OTHM', fee: '£1,200', duration: '12 months' },
  { id: '3', title: 'Level 5 Diploma in Computing', body: 'QUALIFI', fee: '£1,200', duration: '12 months' },
  { id: '4', title: 'Level 4 Diploma in Computing', body: 'QUALIFI', fee: '£1,200', duration: '12 months' },
  { id: '5', title: 'Level 3 Diploma in Accounting', body: 'IAB', fee: '£800', duration: '6 months' },
];

const REQUIRED_DOCS = [
  { id: 'cnic', label: 'CNIC / NICOP / National ID', required: true, uploaded: false },
  { id: 'passport', label: 'Passport (if applying for progression)', required: false, uploaded: false },
  { id: 'photo', label: 'Passport-size Photograph', required: true, uploaded: false },
  { id: 'matric', label: 'Matric / O-Level Certificate', required: true, uploaded: false },
  { id: 'inter', label: 'Intermediate / A-Level / FSC Certificate', required: false, uploaded: false },
  { id: 'transcript', label: 'Academic Transcript', required: true, uploaded: false },
  { id: 'english', label: 'English Proficiency (IELTS/PTE) — if available', required: false, uploaded: false },
];

export default function StudentApplication() {
  const [step, setStep] = useState(1);
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
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

  const updatePersonal = (k: string, v: string) => setPersonal(p => ({ ...p, [k]: v }));
  const updateQual = (k: string, v: string) => setQualifications(p => ({ ...p, [k]: v }));

  const toggleDoc = (id: string) => {
    setUploadedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  return (
    <DashboardLayout title="Apply Now" subtitle="Student Application Form">
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
            <p className="text-sm text-muted-foreground mb-4">Enter your highest qualification. This helps us determine your eligibility.</p>
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
                  <input value={qualifications.grade} onChange={(e) => updateQual('grade', e.target.value)} placeholder="e.g. A*, 85%, 1st Division" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Key Subjects</label>
                <input value={qualifications.subjects} onChange={(e) => updateQual('subjects', e.target.value)} placeholder="e.g. Business, Accounting, Mathematics" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>

              {/* Eligibility indicator */}
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
                  <p className="text-xs text-muted-foreground mt-1">Eligibility is subject to verification of your documents.</p>
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{prog.body}</span>
                      </div>
                      <p className="text-sm font-semibold">{prog.title}</p>
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

            {/* Progression pathway */}
            <div className="mt-6 p-4 surface-data rounded-lg">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Your Pathway to a UK Degree
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">Level 4 (Year 1)</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">Level 5 (Year 2)</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="bg-success/10 text-success px-2 py-1 rounded font-medium">Top-Up Degree (UK/Canada/Aus)</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Study in Pakistan, save 50-70%, then complete your degree abroad</p>
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold mb-2">Upload Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload scans or photos of your documents. Accepted formats: PDF, JPG, PNG (max 10MB each)</p>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-success font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Uploaded
                      </span>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toggleDoc(doc.id)}>Remove</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => toggleDoc(doc.id)}>
                      <Upload className="w-3 h-3 mr-1" /> Upload
                    </Button>
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
                'I confirm that the information provided in this application is true and accurate to the best of my knowledge.',
                'I understand that providing false information may result in the withdrawal of any offer made.',
                'I consent to the processing of my personal data in accordance with the Privacy Policy and GDPR regulations.',
                'I understand the hybrid delivery model (80% online, 20% centre-based) and agree to attend required in-person sessions.',
                'I acknowledge that exam assessments must be taken at an approved centre under invigilated conditions.',
                'I understand the fee structure and payment terms for my chosen programme.',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 accent-[hsl(0,72%,45%)]" />
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Payment */}
        {step === 6 && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold mb-4">Application Fee & Deposit</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="surface-data p-4 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Application Fee</p>
                <p className="text-xl font-bold text-primary">£50</p>
                <p className="text-xs text-muted-foreground mt-1">Non-refundable</p>
              </div>
              <div className="surface-data p-4 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Deposit (Secures your place)</p>
                <p className="text-xl font-bold text-primary">£200</p>
                <p className="text-xs text-muted-foreground mt-1">Deducted from tuition</p>
              </div>
            </div>

            <h4 className="text-sm font-semibold mb-3">Payment Method</h4>
            <div className="space-y-2 mb-6">
              {[
                { method: 'Bank Transfer', desc: 'HBL / Meezan / Allied Bank' },
                { method: 'JazzCash / Easypaisa', desc: 'Mobile wallet payment' },
                { method: 'Credit / Debit Card', desc: 'Visa, Mastercard (via Stripe)' },
                { method: 'International Transfer', desc: 'Wise / Western Union' },
              ].map((pm) => (
                <div key={pm.method} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-primary/30 cursor-pointer transition-default">
                  <div className="w-4 h-4 rounded-full border-2 border-border" />
                  <div>
                    <p className="text-sm font-medium">{pm.method}</p>
                    <p className="text-xs text-muted-foreground">{pm.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium">Instalment plans available</p>
              <p className="text-xs text-muted-foreground mt-1">Split your tuition into 3 or 6 monthly payments. Details will be shared after acceptance.</p>
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
            <Button className="px-8" onClick={() => navigate('/student')}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> Submit Application & Pay
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
