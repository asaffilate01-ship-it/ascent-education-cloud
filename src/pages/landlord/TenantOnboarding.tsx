import { db } from '@/lib/db';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Building2, CheckCircle, ChevronRight, FileText, Globe, Palette, Users, CreditCard, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STEPS = [
  { id: 1, title: 'Centre Details', icon: Building2 },
  { id: 2, title: 'Plan Selection', icon: CreditCard },
  { id: 3, title: 'Compliance Docs', icon: FileText },
  { id: 4, title: 'Branding', icon: Palette },
  { id: 5, title: 'Admin Account', icon: Users },
  { id: 6, title: 'Review & Save', icon: CheckCircle },
];

export default function TenantOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [launching, setLaunching] = useState(false);
  const [params,setParams]=useSearchParams();
  const [draftTenantId] = useState(()=>params.get('draft')||crypto.randomUUID());
  const [revision,setRevision]=useState(0),[saving,setSaving]=useState(false),[restoreError,setRestoreError]=useState(''),[restoring,setRestoring]=useState(!!params.get('draft'));
  const [savedDrafts,setSavedDrafts]=useState<Array<{id:string;form_data:{centreName?:string};updated_at:string}>>([]);
  const [documentPaths,setDocumentPaths] = useState<Record<string,{path:string;fileName:string}>>({});
  const [createdTenantId,setCreatedTenantId]=useState<string|null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    centreName: '',
    slug: '',
    country: 'Pakistan',
    city: '',
    companyReg: '',
    plan: 'professional' as 'starter' | 'professional' | 'enterprise',
    adminName: '',
    adminEmail: '',
    primaryColor: '#b91c1c',
    accentColor: '#D4A853',
    brandName: '',
  });

  useEffect(()=>{let active=true;
    void Promise.resolve(db.from('unipathway_onboarding_drafts').select('id,form_data,updated_at').order('updated_at',{ascending:false}).limit(50)).then(r=>{if(active){if(r.error)setRestoreError('Saved drafts could not be loaded. Please reload before creating a duplicate centre.');else setSavedDrafts(r.data||[]);}}).catch(()=>{if(active)setRestoreError('Saved drafts unavailable. Please reload.');});
    if(params.get('draft'))void Promise.resolve(db.from('unipathway_onboarding_drafts').select('*').eq('id',draftTenantId).single()).then(r=>{if(!active)return;if(r.error||!r.data)throw Error('Draft unavailable');const d=r.data;setFormData(old=>({...old,...d.form_data}));setDocumentPaths(d.documents||{});setUploadedDocs(Object.fromEntries(Object.entries(d.documents||{}).map(([k,v])=>[k,(v as {fileName:string}).fileName])));setStep(d.step);setRevision(d.revision);setCreatedTenantId(d.tenant_id);}).catch(()=>{if(active)setRestoreError('Draft could not be restored. Reload or return to saved drafts; no new centre was created.');}).finally(()=>{if(active)setRestoring(false);});
    return()=>{active=false;};
  // Draft identity is fixed for this mounted workspace; resume links load another workspace.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[draftTenantId]);
  async function saveDraft(documents=documentPaths){
    setSaving(true);
    try{const r=await db.rpc('save_unipathway_onboarding_draft',{p_id:draftTenantId,p_form:formData,p_documents:documents,p_step:step,p_revision:revision});if(r.error)throw Error(r.error.message||'Draft not saved');setRevision(r.data.revision);setParams({draft:draftTenantId},{replace:true});return r.data;}
    finally{setSaving(false);}
  }

  const updateField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleDocUpload = async (docName: string, file: File | undefined) => {
    if (!file) return;
    if(file.size>10*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(file.type)){toast.error('Choose a PDF, JPG or PNG under 10 MB.');return;}
    setUploadingDoc(docName);
    try {
      const safeName = docName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const ext = file.name.split('.').pop();
      const path = `${draftTenantId}/${crypto.randomUUID()}-${safeName}.${ext}`;

      const { error } = await supabase.storage.from('unipathway-centre-documents').upload(path, file, { upsert: false });
      if (error) throw error;

      const previous=documentPaths[docName]?.path;
      const nextDocuments={...documentPaths,[docName]:{path,fileName:file.name}};
      await saveDraft(nextDocuments);
      setDocumentPaths(nextDocuments);
      if(previous){const removed=await supabase.storage.from('unipathway-centre-documents').remove([previous]);if(removed.error)toast.error('New document uploaded; the earlier file still needs removal.');}
      setUploadedDocs(prev => ({ ...prev, [docName]: file.name }));
      toast.success(`${docName} uploaded`);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleLaunch = async () => {
    if (!formData.centreName || !formData.slug || !formData.adminName || !formData.adminEmail || !formData.city.trim() || !formData.country.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      toast.error('Enter centre name, city, country, a lowercase hyphenated slug and administrator name/email');
      return;
    }
    setLaunching(true);
    try {
      const saved=await saveDraft();
      const centre=await db.rpc('create_unipathway_centre_from_draft',{p_id:draftTenantId,p_revision:saved.revision});
      if(centre.error)throw new Error(centre.error.message||'Centre setup could not be confirmed. Resume the saved draft to retry.');
      const tenantId=centre.data;setCreatedTenantId(tenantId);
      const invitation=await supabase.functions.invoke('invite-staff',{body:{tenantId,email:formData.adminEmail,fullName:formData.adminName,role:'centre_director'}});
      if(invitation.error||invitation.data?.error||!invitation.data?.success)throw new Error('Centre saved in onboarding; administrator access is incomplete. '+(invitation.data?.error||'Retry administrator setup.'));
      toast.success('Centre saved in onboarding. Administrator access assigned'+(invitation.data?.emailSent?' and invitation email issued.':'.'));
      navigate('/landlord');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create centre');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <DashboardLayout title="Onboard New Centre" subtitle="Step-by-step setup for new tenant">
      <section className="mb-5 space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Save and resume setup</h2><p className="text-sm text-muted-foreground">Save your draft before leaving. Uploaded document details are saved with the draft. Centre creation and setup details are saved together; retrying administrator setup reuses the same centre.</p>
      {restoring&&<p role="status">Restoring saved setup…</p>}{restoreError&&<p role="alert">{restoreError}</p>}
      <Button variant="outline" disabled={saving||launching||restoring||!!uploadingDoc||!!restoreError} onClick={()=>void saveDraft().then(()=>toast.success('Draft saved. You can resume it from this page.')).catch(e=>toast.error(e.message))}>{saving?'Saving…':'Save draft'}</Button>
      {createdTenantId&&<p className="text-sm">Centre saved in onboarding. Administrator setup can be retried.</p>}
      {!!savedDrafts.length&&<details><summary className="cursor-pointer text-sm font-semibold">Resume a saved setup</summary><ul className="mt-2 space-y-2">{savedDrafts.map(d=><li key={d.id}><a className="text-sm underline" href={`?draft=${encodeURIComponent(d.id)}`}>{d.form_data.centreName||'Unnamed centre'} · {new Date(d.updated_at).toLocaleString()}</a></li>)}</ul></details>}
      </section>
      <fieldset disabled={restoring||!!restoreError||saving||launching||!!uploadingDoc}>
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
                <input value={formData.centreName} onChange={(e) => updateField('centreName', e.target.value)} placeholder="e.g. UniPathway Lahore" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground" />
              </div>
              <div>
                <label className="text-label mb-1.5 block">URL Slug</label>
                <div className="flex items-center bg-secondary rounded-lg">
                  <span className="text-xs text-muted-foreground pl-3">Centre reference: </span>
                  <input value={formData.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="unipathway" className="flex-1 bg-transparent text-sm px-1 py-2.5 outline-none text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label mb-1.5 block">Country</label>
                  <select value={formData.country} onChange={(e) => updateField('country', e.target.value)} className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground">
                    <option>Pakistan</option>
                    <option>India</option>
                    <option>UAE</option>
                    <option>Nigeria</option>
                    <option>Kenya</option>
                  </select>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">City</label>
                  <input value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Lahore" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground" />
                </div>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Company Registration Number</label>
                <input value={formData.companyReg} onChange={(e) => updateField('companyReg', e.target.value)} placeholder="Company reg #" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-bold mb-4">Choose a Plan</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { id: 'starter' as const, name: 'Starter', price: 'Rs.80,000/mo', features: ['Up to 50 students', 'Basic LMS', '1 Admin', 'Email support'] },
                { id: 'professional' as const, name: 'Professional', price: 'Rs.200,000/mo', features: ['Up to 500 students', 'Full LMS + Video + QA', '5 Admins', 'Agent portal', 'Custom branding'], popular: true },
                { id: 'enterprise' as const, name: 'Enterprise', price: 'Rs.400,000/mo', features: ['Unlimited students', 'Full platform', 'Custom domain', 'API access', 'White-label', 'SLA'] },
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
            <p className="text-sm text-muted-foreground mb-4">Upload PDFs or images under 10 MB. Files remain private to the platform owner; uploading does not confirm accreditation.</p>
            <div className="space-y-3">
              {['Business Registration Certificate', 'Centre Approval Application', 'Quality Assurance Policy', 'Assessment Policy', 'Complaints Procedure', 'Internal Verification System', 'Staff CVs & Qualifications'].map((doc) => (
                <div key={doc} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm">{doc}</span>
                      {uploadedDocs[doc] && (
                        <p className="text-[10px] text-success font-medium">✓ {uploadedDocs[doc]}</p>
                      )}
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={!!uploadingDoc||launching}
                      onChange={(e) => handleDocUpload(doc, e.target.files?.[0])}
                    />
                    <Button variant="outline" size="sm" className="text-xs pointer-events-none" asChild={false}>
                      {uploadingDoc === doc ? <Loader2 className="w-3 h-3 animate-spin" /> : uploadedDocs[doc] ? 'Replace' : 'Upload'}
                    </Button>
                  </label>
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
                <input value={formData.brandName} onChange={(e) => updateField('brandName', e.target.value)} placeholder="UniPathway" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label mb-1.5 block">Primary Colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={formData.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer" />
                    <span className="text-sm text-muted-foreground">{formData.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-label mb-1.5 block">Accent Colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={formData.accentColor} onChange={(e) => updateField('accentColor', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer" />
                    <span className="text-sm text-muted-foreground">{formData.accentColor}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-label mb-1.5 block">Logo</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-default cursor-pointer">
                  <p className="text-sm text-muted-foreground">Drop logo here or click to upload</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, SVG — recommended 200×60px</p>
                </div>
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
                <input value={formData.adminName} onChange={(e) => updateField('adminName', e.target.value)} placeholder="Dr. Imran Shah" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground" />
              </div>
              <div>
                <label className="text-label mb-1.5 block">Email Address</label>
                <input type="email" value={formData.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} placeholder="director@unipathway.pk" className="w-full bg-secondary text-sm px-3 py-2.5 rounded-lg outline-none text-foreground" />
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
                { label: 'URL', value: `${formData.slug || '...'}.educloud.pk` },
                { label: 'Location', value: `${formData.city || '...'}, ${formData.country}` },
                { label: 'Plan', value: formData.plan.charAt(0).toUpperCase() + formData.plan.slice(1) },
                { label: 'Admin', value: formData.adminName || 'Not set' },
                { label: 'Brand', value: formData.brandName || formData.centreName || 'Not set' },
              ].map((item) => (
                <div key={item.label} className="surface-data p-3 rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg mb-4">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm">The centre remains in onboarding. Administrator access, accreditation and provider activation must be checked before launch.</span>
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
            <Button className="px-8" onClick={handleLaunch} disabled={launching||!!uploadingDoc}>
              {launching ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
              Save centre and invite administrator
            </Button>
          )}
        </div>
      </div>
      </fieldset>
    </DashboardLayout>
  );
}
