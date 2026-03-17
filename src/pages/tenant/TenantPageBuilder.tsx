import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantPageContent, type PageSection } from '@/hooks/useTenantPageContent';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Eye, EyeOff, Save, ExternalLink, Loader2, Plus, Trash2,
  Palette, Type, Image, Layout, Globe, Mail, Shield, ChevronDown, ChevronUp,
  GraduationCap, Sparkles, Megaphone, MessageSquare, Phone, MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const SECTION_META: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  promo_banner: { label: 'Promo Banner', icon: Megaphone, description: 'Top announcement bar with offer text' },
  hero: { label: 'Hero Section', icon: Layout, description: 'Main headline, subtitle, CTA buttons & stats' },
  why_us: { label: 'Why Choose Us', icon: Sparkles, description: 'Feature cards highlighting your strengths' },
  testimonials: { label: 'Testimonials', icon: MessageSquare, description: 'Student reviews and success stories' },
  contact: { label: 'Contact Info', icon: Phone, description: 'Address, phone, email details' },
  cta: { label: 'Call to Action', icon: GraduationCap, description: 'Final conversion banner' },
  footer: { label: 'Footer', icon: Layout, description: 'Bottom links, badges & copyright' },
};

export default function TenantPageBuilder() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { sections, loading, saving, updateSection, toggleVisibility, saveAll } = useTenantPageContent(tenantId);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [tenantSlug, setTenantSlug] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    supabase.from('tenants_public' as any).select('slug').eq('id', tenantId).single()
      .then(({ data }) => { if (data) setTenantSlug((data as any).slug); });
  }, [tenantId]);

  if (loading) {
    return (
      <DashboardLayout title="Page Builder" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const currentSection = sections.find(s => s.section_key === activeSection);

  return (
    <DashboardLayout
      title="Landing Page Builder"
      subtitle="Edit your public landing page content with live preview"
      actions={
        <div className="flex items-center gap-2">
          {tenantSlug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/tenant/${tenantSlug}`, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-1" /> View Live
            </Button>
          )}
          <Button size="sm" onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save & Publish
          </Button>
        </div>
      }
    >
      <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="edit">✏️ Edit Sections</TabsTrigger>
          <TabsTrigger value="preview">👁️ Full Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-12rem)]">
            {/* Section List */}
            <div className="surface-card p-3 overflow-y-auto space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Page Sections</p>
              {sections.map((section) => {
                const meta = SECTION_META[section.section_key];
                if (!meta) return null;
                const isActive = activeSection === section.section_key;
                return (
                  <button
                    key={section.section_key}
                    onClick={() => setActiveSection(section.section_key)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${
                      isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary border border-transparent'
                    }`}
                  >
                    <meta.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{meta.description}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(section.section_key); }}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      {section.is_visible ? (
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </button>
                );
              })}
            </div>

            {/* Section Editor */}
            <div className="surface-card p-5 overflow-y-auto">
              {currentSection && (
                <SectionEditor
                  section={currentSection}
                  onUpdate={(content) => updateSection(activeSection, content)}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="surface-card overflow-hidden rounded-xl h-[calc(100vh-12rem)]">
            {/* Browser chrome */}
            <div className="bg-secondary px-4 py-2 flex items-center gap-2 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
              </div>
              <p className="text-xs text-muted-foreground ml-2 font-mono flex-1">
                {tenantSlug ? `/tenant/${tenantSlug}` : 'your-college.educloud.pk'}
              </p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => window.open(`/tenant/${tenantSlug}`, '_blank')}>
                <ExternalLink className="w-3 h-3 mr-1" /> Open
              </Button>
            </div>
            {/* iframe preview */}
            <iframe
              src={tenantSlug ? `/tenant/${tenantSlug}?preview=true` : ''}
              className="w-full h-full border-0"
              title="Landing Page Preview"
            />
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function SectionEditor({ section, onUpdate }: { section: PageSection; onUpdate: (content: Record<string, any>) => void }) {
  const c = section.content;
  const set = (key: string, value: any) => onUpdate({ ...c, [key]: value });

  switch (section.section_key) {
    case 'promo_banner':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Promo Banner</h3>
          <div>
            <Label className="text-xs">Banner Text</Label>
            <Input value={c.text || ''} onChange={e => set('text', e.target.value)} className="mt-1" placeholder="e.g. 30% OFF ALL COURSES" />
          </div>
          <div>
            <Label className="text-xs">Sub Text</Label>
            <Input value={c.subtext || ''} onChange={e => set('subtext', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">CTA Button Text</Label>
              <Input value={c.cta_text || ''} onChange={e => set('cta_text', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CTA Link</Label>
              <Input value={c.cta_link || ''} onChange={e => set('cta_link', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      );

    case 'hero':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><Layout className="w-4 h-4 text-primary" /> Hero Section</h3>
          <div>
            <Label className="text-xs">Headline</Label>
            <Input value={c.title || ''} onChange={e => set('title', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Textarea value={c.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className="mt-1" rows={3} />
          </div>
          <div>
            <Label className="text-xs">Hero Image URL</Label>
            <Input value={c.image_url || ''} onChange={e => set('image_url', e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Primary CTA Text</Label>
              <Input value={c.cta_primary_text || ''} onChange={e => set('cta_primary_text', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Secondary CTA Text</Label>
              <Input value={c.cta_secondary_text || ''} onChange={e => set('cta_secondary_text', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Stats (shown below hero)</Label>
            <div className="space-y-2 mt-2">
              {(c.stats || []).map((stat: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input
                    value={stat.value}
                    onChange={e => {
                      const updated = [...(c.stats || [])];
                      updated[i] = { ...updated[i], value: e.target.value };
                      set('stats', updated);
                    }}
                    placeholder="Value"
                    className="text-sm"
                  />
                  <Input
                    value={stat.label}
                    onChange={e => {
                      const updated = [...(c.stats || [])];
                      updated[i] = { ...updated[i], label: e.target.value };
                      set('stats', updated);
                    }}
                    placeholder="Label"
                    className="text-sm"
                  />
                  <Button variant="ghost" size="sm" onClick={() => {
                    const updated = (c.stats || []).filter((_: any, idx: number) => idx !== i);
                    set('stats', updated);
                  }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set('stats', [...(c.stats || []), { value: '', label: '' }])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Stat
              </Button>
            </div>
          </div>
        </div>
      );

    case 'why_us':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Why Choose Us</h3>
          <div>
            <Label className="text-xs">Section Heading</Label>
            <Input value={c.heading || ''} onChange={e => set('heading', e.target.value)} className="mt-1" />
          </div>
          <div className="space-y-3">
            {(c.features || []).map((f: any, i: number) => (
              <div key={i} className="surface-data p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Feature {i + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const updated = (c.features || []).filter((_: any, idx: number) => idx !== i);
                    set('features', updated);
                  }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <Input
                  value={f.title}
                  onChange={e => {
                    const updated = [...(c.features || [])];
                    updated[i] = { ...updated[i], title: e.target.value };
                    set('features', updated);
                  }}
                  placeholder="Feature title"
                  className="text-sm"
                />
                <Textarea
                  value={f.description}
                  onChange={e => {
                    const updated = [...(c.features || [])];
                    updated[i] = { ...updated[i], description: e.target.value };
                    set('features', updated);
                  }}
                  placeholder="Feature description"
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set('features', [...(c.features || []), { title: '', description: '' }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Feature
            </Button>
          </div>
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Testimonials</h3>
          <div>
            <Label className="text-xs">Section Heading</Label>
            <Input value={c.heading || ''} onChange={e => set('heading', e.target.value)} className="mt-1" />
          </div>
          <div className="space-y-3">
            {(c.items || []).map((t: any, i: number) => (
              <div key={i} className="surface-data p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Testimonial {i + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const updated = (c.items || []).filter((_: any, idx: number) => idx !== i);
                    set('items', updated);
                  }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={t.name} onChange={e => {
                    const updated = [...(c.items || [])];
                    updated[i] = { ...updated[i], name: e.target.value };
                    set('items', updated);
                  }} placeholder="Student name" className="text-sm" />
                  <Input value={t.programme} onChange={e => {
                    const updated = [...(c.items || [])];
                    updated[i] = { ...updated[i], programme: e.target.value };
                    set('items', updated);
                  }} placeholder="Programme" className="text-sm" />
                </div>
                <Textarea value={t.quote} onChange={e => {
                  const updated = [...(c.items || [])];
                  updated[i] = { ...updated[i], quote: e.target.value };
                  set('items', updated);
                }} placeholder="Quote" rows={2} className="text-sm" />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set('items', [...(c.items || []), { name: '', programme: '', quote: '' }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Testimonial
            </Button>
          </div>
        </div>
      );

    case 'contact':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contact Information</h3>
          <div>
            <Label className="text-xs">Section Heading</Label>
            <Input value={c.heading || ''} onChange={e => set('heading', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Textarea value={c.address || ''} onChange={e => set('address', e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={c.phone || ''} onChange={e => set('phone', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={c.email || ''} onChange={e => set('email', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> Call to Action</h3>
          <div>
            <Label className="text-xs">Heading</Label>
            <Input value={c.heading || ''} onChange={e => set('heading', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Textarea value={c.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Primary Button Text</Label>
              <Input value={c.cta_primary_text || ''} onChange={e => set('cta_primary_text', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Secondary Button Text</Label>
              <Input value={c.cta_secondary_text || ''} onChange={e => set('cta_secondary_text', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><Layout className="w-4 h-4 text-primary" /> Footer</h3>
          <div>
            <Label className="text-xs">Tagline</Label>
            <Textarea value={c.tagline || ''} onChange={e => set('tagline', e.target.value)} className="mt-1" rows={2} />
          </div>
          <div>
            <Label className="text-xs">Copyright Text</Label>
            <Input value={c.copyright || ''} onChange={e => set('copyright', e.target.value)} className="mt-1" placeholder="Use {brandName} as placeholder" />
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">Select a section to edit</p>;
  }
}
