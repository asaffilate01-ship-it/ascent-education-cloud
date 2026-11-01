import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TenantTheme } from '@/types/platform';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#3b82f6',
  accentColor: '#22c55e',
  logoUrl: '',
  faviconUrl: '',
  fontFamily: 'Inter',
  heroTitle: 'Your Gateway to UK Qualifications',
  heroSubtitle: 'Explore course preparation, tuition and qualification pathways with UniPathway. External awarding-body approval is confirmed separately for each programme.',
  heroImageUrl: '',
  customDomain: '',
  brandName: 'UniPathway',
};

export default function TenantBranding() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const authorised=!!user?.id&&!!tenantId&&user.role==='centre_director'&&user.roles?.includes('centre_director');
  const brandingRpcEnabled=import.meta.env.VITE_UNIPATHWAY_BRANDING_RPC_ENABLED==='true';
  const [loadError,setLoadError]=useState('');
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof TenantTheme, value: string) =>
    setTheme((t) => ({ ...t, [key]: value }));

  useEffect(() => {
    let active = true;
    async function load() {
      if (!authorised) { setLoading(false); return; }
      setLoading(true);setLoadError('');setTheme(DEFAULT_THEME);
      const { data,error } = await supabase
        .from('tenants')
        .select('name, brand_name, custom_domain, logo_url, primary_color, accent_color')
        .eq('id', tenantId)
        .maybeSingle();
      if(active&&(error||!data)){setLoadError('Centre branding could not be verified. Refresh before editing any fields.');setLoading(false);return;}
      if (active && data) {
        setTheme((t) => ({
          ...t,
          brandName: data.brand_name || data.name || t.brandName,
          customDomain: data.custom_domain || '',
          logoUrl: data.logo_url || '',
          primaryColor: data.primary_color || t.primaryColor,
          accentColor: data.accent_color || t.accentColor,
        }));
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [tenantId,authorised]);

  const handleSave = async () => {
    if (!authorised || !tenantId || !brandingRpcEnabled || loadError || loading) {
      toast.error('Centre branding changes need an authorised director and a deployed, verified UniPathway branding service.');return;
    }
    if(!/^#[0-9A-Fa-f]{6}$/.test(theme.primaryColor)||!/^#[0-9A-Fa-f]{6}$/.test(theme.accentColor)){
      toast.error('Choose valid six-digit brand colours.');return;
    }
    setSaving(true);
    try{
      const {data,error}=await (supabase.rpc as any)('update_unipathway_centre_branding',{
        p_tenant:tenantId,p_brand:theme.brandName.trim(),p_logo:theme.logoUrl.trim()||null,
        p_primary:theme.primaryColor,p_accent:theme.accentColor,
      });
      if(error||data?.id!==tenantId)throw Error(error?.message||'The server did not confirm updated branding.');
      toast.success('Centre name and colours confirmed in the database. Website deployment and DNS remain separate.');
    }catch(e){toast.error(e instanceof Error?e.message:'Centre branding could not be verified.');}
    finally{setSaving(false);}
  };

  return (
    <DashboardLayout title="Centre Branding" subtitle="Centre-owned identity — custom domain and publication remain platform managed">
      <section className="mb-5 rounded-xl border p-4 space-y-2" aria-label="Branding capability">
       <h2 className="font-semibold">Change permissions and publication status</h2>
       {!authorised?<p role="alert">A verified active Centre Director account is required.</p>:
        !brandingRpcEnabled?<p role="status">Branding updates are paused until the reviewed UniPathway centre-branding database function is deployed. The current screen is a read-only preview; use the Platform Owner centre directory for edits.</p>:
        <p className="text-sm text-muted-foreground">Only display name, logo URL and colours are saved by this function. Hero copy, typography, DNS and publication must use their separately verified workflows.</p>}
       {loadError&&<p role="alert">{loadError}</p>}
      </section>
      <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
        {/* Controls */}
        <div className="surface-card p-5 overflow-y-auto space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-3">Brand Identity</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">College Name</Label>
                <Input value={theme.brandName} onChange={(e) => update('brandName', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Custom Domain</Label>
                <Input value={theme.customDomain} disabled placeholder="Domain verification is managed separately" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Logo URL</Label>
                <Input value={theme.logoUrl} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Colours</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Primary Colour</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={theme.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
                  <Input value={theme.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Accent Colour</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={theme.accentColor} onChange={(e) => update('accentColor', e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
                  <Input value={theme.accentColor} onChange={(e) => update('accentColor', e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Typography</h3>
            <div>
              <Label className="text-xs">Font Family</Label>
              <select
                value={theme.fontFamily}
                onChange={(e) => update('fontFamily', e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Inter">Inter</option>
                <option value="Georgia">Georgia</option>
                <option value="system-ui">System UI</option>
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Hero Section</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Hero Title</Label>
                <Input value={theme.heroTitle} onChange={(e) => update('heroTitle', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Hero Subtitle</Label>
                <Input value={theme.heroSubtitle} onChange={(e) => update('heroSubtitle', e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || loading || !authorised || !brandingRpcEnabled || !!loadError}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? 'Saving…' : 'Save verified brand fields'}
          </Button>
        </div>

        {/* Live Preview */}
        <div className="surface-card overflow-hidden rounded-xl">
          <div className="bg-secondary px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
            </div>
            <p className="text-xs text-muted-foreground ml-2 font-mono">
              {theme.customDomain || 'your-centre.unipathway.pk'}
            </p>
          </div>
          <div className="h-full overflow-y-auto" style={{ fontFamily: theme.fontFamily }}>
            {/* Preview Nav */}
            <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div className="flex items-center gap-2">
                {theme.logoUrl ? (
                  <img src={theme.logoUrl} alt="Logo" className="h-6" />
                ) : (
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.primaryColor }} />
                )}
                <span className="text-sm font-semibold">{theme.brandName}</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Courses</span>
                <span>About</span>
                <span>Apply</span>
              </div>
            </div>

            {/* Preview Hero */}
            <div className="px-6 py-16 text-center" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}10, ${theme.accentColor}10)` }}>
              <h1 className="text-2xl font-bold mb-3" style={{ color: theme.primaryColor }}>
                {theme.heroTitle}
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{theme.heroSubtitle}</p>
              <div className="flex justify-center gap-3">
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground" style={{ backgroundColor: theme.primaryColor }}>
                  Apply Now
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}>
                  View Courses
                </button>
              </div>
            </div>

            {/* Preview Course Cards */}
            <div className="px-6 py-8">
              <h2 className="text-base font-semibold mb-4">Our Programmes</h2>
              <div className="grid grid-cols-2 gap-3">
                {['Level 4 Business Management (OTHM)', 'Level 5 Computing (QUALIFI)', 'Level 3 Accounting (IAB)', 'Level 4 Health & Social Care'].map((course) => (
                  <div key={course} className="p-4 rounded-lg border border-border/50 hover:shadow-surface-md transition-default">
                    <div className="w-full h-2 rounded-full mb-3" style={{ backgroundColor: theme.primaryColor + '30' }} />
                    <p className="text-xs font-medium">{course}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">12 months · Hybrid delivery</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Accreditation badges */}
            <div className="px-6 py-6 bg-secondary/50">
              <p className="text-xs text-center text-muted-foreground mb-3">Accredited by</p>
              <div className="flex justify-center gap-6 text-xs font-medium text-muted-foreground">
                <span>OTHM</span>
                <span>QUALIFI</span>
                <span>IAB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
