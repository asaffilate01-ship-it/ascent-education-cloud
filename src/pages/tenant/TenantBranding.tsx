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
  heroSubtitle: 'Study OTHM & QUALIFI accredited courses from Pakistan. 80% online, globally recognised.',
  heroImageUrl: '',
  customDomain: '',
  brandName: 'Lahore College of Business',
};

export default function TenantBranding() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof TenantTheme, value: string) =>
    setTheme((t) => ({ ...t, [key]: value }));

  useEffect(() => {
    let active = true;
    async function load() {
      if (!tenantId) { setLoading(false); return; }
      const { data } = await supabase
        .from('tenants')
        .select('name, brand_name, custom_domain, logo_url, primary_color, accent_color')
        .eq('id', tenantId)
        .maybeSingle();
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
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) { toast.error('No centre linked to your account.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        brand_name: theme.brandName,
        custom_domain: theme.customDomain || null,
        logo_url: theme.logoUrl || null,
        primary_color: theme.primaryColor,
        accent_color: theme.accentColor,
      })
      .eq('id', tenantId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Theme saved and published.');
  };

  return (
    <DashboardLayout title="Branding & Theme" subtitle="Customise your tenant landing page with live preview">
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
                <Input value={theme.customDomain} onChange={(e) => update('customDomain', e.target.value)} placeholder="college.example.com" className="mt-1" />
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

          <Button className="w-full" onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? 'Saving…' : 'Save & Publish Theme'}
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
