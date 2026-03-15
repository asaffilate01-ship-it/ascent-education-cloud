import DashboardLayout from '@/components/layout/DashboardLayout';
import { Building2, CheckCircle, ChevronRight, FileText, Globe, Palette, Users, CreditCard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const STEPS = [
  { id: 1, title: 'Centre Details', icon: Building2 },
  { id: 2, title: 'Plan Selection', icon: CreditCard },
  { id: 3, title: 'Compliance Docs', icon: FileText },
  { id: 4, title: 'Branding', icon: Palette },
  { id: 5, title: 'Admin Account', icon: Users },
  { id: 6, title: 'Review & Launch', icon: CheckCircle },
];

export default function TenantOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    centreName: '',
    slug: '',
    country: 'Pakistan',
    city: '',
    companyReg: '',
    plan: 'professional',
    adminName: '',
    adminEmail: '',
    primaryColor: '#b91c1c',
    brandName: '',
  });

  const updateField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <DashboardLayout title="Onboard New Centre" subtitle="Step-by-step setup for new tenant">
      {/* Progress */}
      <div className="surface-card p-4 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
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
              {i < STEPS.length - 1 && <div className={`w-8 lg:w-16 h-0.5 mx-2 ${step > s.id ? 'bg-success' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="surface-card p-6">
        {step === 1 && (
          <div className="max-w-lg">
            <h3 className="text-lg font-bold mb-4">Centre Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-label mb-1.5 block">Centre Name</label>
                <input value={formData.centreName} onChange={(e) => updateField('centreName', e.target.value)} placeholder="e.g. EduPathway Lahore" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>
              <div>
                <label className="text-label mb-1.5 block">URL Slug</label>
                <div className="flex items-center bg-secondary rounded-lg">
                  <span className="text-xs text-muted-foreground pl-3">educloud.com/</span>
                  <input value={formData.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="edupathway" className="flex-1 bg-transparent text-sm px-1 py-2.5 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label mb-1.5 block">Country</label>
                  <select value={formData.country} onChange={(e) => updateField('country', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none">
                    <option>Pakistan</option>
                    <option>India</option>
                    <option>UAE</option>
                    <option>Nigeria</option>
                    <option>Kenya</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">City</label>
                  <input value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Lahore" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Company Registration Number</label>
                <input value={formData.companyReg} onChange={(e) => updateField('companyReg', e.target.value)} placeholder="Company reg #" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-bold mb-4">Choose a Plan</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { id: 'starter', name: 'Starter', price: '£200/mo', features: ['Up to 50 students', 'Basic LMS', '1 Admin', 'Email support'] },
                { id: 'professional', name: 'Professional', price: '£500/mo', features: ['Up to 500 students', 'Full LMS + Video + QA', '5 Admins', 'Agent portal', 'Custom branding'], popular: true },
                { id: 'enterprise', name: 'Enterprise', price: '£1,000/mo', features: ['Unlimited students', 'Full platform', 'Custom domain', 'API access', 'White-label', 'SLA'] },
              ].map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => updateField('plan', plan.id)}
                  className={`surface-data p-5 rounded-xl cursor-pointer transition-default ${
                    formData.plan === plan.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <h4 className="text-base font-bold">{plan.name}</h4>
                  <p className="text-xl font-bold text-primary mt-1">{plan.price}</p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-success" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-lg">
            <h3 className="text-lg font-bold mb-4">Compliance Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload required documents for centre accreditation verification.</p>
            <div className="space-y-3">
              {['Business Registration Certificate', 'Centre Approval Application', 'Quality Assurance Policy', 'Assessment Policy', 'Complaints Procedure', 'Internal Verification System', 'Staff CVs & Qualifications'].map((doc) => (
                <div key={doc} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{doc}</span>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">Upload</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-lg">
            <h3 className="text-lg font-bold mb-4">Branding</h3>
            <div className="space-y-4">
              <div>
                <label className="text-label mb-1.5 block">Brand Name</label>
                <input value={formData.brandName} onChange={(e) => updateField('brandName', e.target.value)} placeholder="EduPathway" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>
              <div>
                <label className="text-label mb-1.5 block">Primary Colour</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={formData.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer" />
                  <span className="text-sm text-muted-foreground">{formData.primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Logo</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-default cursor-pointer">
                  <p className="text-sm text-muted-foreground">Drop logo here or click to upload</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, SVG — recommended 200×60px</p>
                </div>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Custom Domain (Optional)</label>
                <input placeholder="learn.edupathway.pk" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="max-w-lg">
            <h3 className="text-lg font-bold mb-4">First Admin Account</h3>
            <p className="text-sm text-muted-foreground mb-4">This person will be the Centre Director with full access to the tenant.</p>
            <div className="space-y-4">
              <div>
                <label className="text-label mb-1.5 block">Full Name</label>
                <input value={formData.adminName} onChange={(e) => updateField('adminName', e.target.value)} placeholder="Dr. Imran Shah" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>
              <div>
                <label className="text-label mb-1.5 block">Email Address</label>
                <input type="email" value={formData.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} placeholder="director@edupathway.pk" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none" />
              </div>
              <p className="text-xs text-muted-foreground">An invitation email will be sent to create their password and complete setup.</p>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="text-lg font-bold mb-4">Review & Launch</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Centre Name', value: formData.centreName || 'Not set' },
                { label: 'URL', value: `${formData.slug || '...'}.educloud.com` },
                { label: 'Location', value: `${formData.city || '...'}, ${formData.country}` },
                { label: 'Plan', value: formData.plan.charAt(0).toUpperCase() + formData.plan.slice(1) },
                { label: 'Admin', value: formData.adminName || 'Not set' },
                { label: 'Brand', value: formData.brandName || 'Not set' },
              ].map((item) => (
                <div key={item.label} className="surface-data p-3 rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg mb-4">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm">Data isolation, RBAC, and audit logging will be automatically configured.</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(s => s - 1)}>
            Back
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="px-8">
              <CheckCircle className="w-4 h-4 mr-1.5" /> Launch Centre
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
