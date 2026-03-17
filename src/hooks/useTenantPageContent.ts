import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PageSection {
  id?: string;
  section_key: string;
  content: Record<string, any>;
  sort_order: number;
  is_visible: boolean;
}

const DEFAULT_SECTIONS: PageSection[] = [
  {
    section_key: 'promo_banner',
    content: {
      enabled: true,
      text: '30% OFF ALL COURSES',
      subtext: 'Enrol by 1st June 2026 to claim your discount!',
      cta_text: 'Claim Offer',
      cta_link: '/apply',
    },
    sort_order: 0,
    is_visible: true,
  },
  {
    section_key: 'hero',
    content: {
      title: 'Your Gateway to Global Qualifications',
      subtitle: 'Study internationally recognised diplomas from Pakistan. 80% online, 20% in-centre. Progress to UK, USA, Australia & Canada.',
      cta_primary_text: 'Apply Now',
      cta_primary_link: '/apply',
      cta_secondary_text: 'View Courses',
      image_url: '',
      stats: [
        { value: '342+', label: 'Students' },
        { value: '50–70%', label: 'Cost Savings' },
        { value: '80%', label: 'Online' },
        { value: '95%', label: 'Pass Rate' },
      ],
    },
    sort_order: 1,
    is_visible: true,
  },
  {
    section_key: 'why_us',
    content: {
      heading: 'Why Study With Us?',
      features: [
        { title: 'Globally Recognised Qualifications', description: 'Study OTHM, QUALIFI, and IAB accredited courses — recognised by universities across the UK, USA, Canada, Australia, and beyond.' },
        { title: '80% Online Learning', description: 'Join HD live lectures from home. Interactive whiteboard, breakout rooms, and all sessions recorded for 24/7 playback.' },
        { title: '20% In-Centre Experience', description: 'Attend 2 residential weeks per year for workshops, presentations, tutor meetings, and formal examinations.' },
        { title: 'Global University Progression', description: "Clear academic pathways to top-up your diploma to a full bachelor's degree at partner universities." },
        { title: 'Full QA Compliance', description: 'Every assignment is moderated, plagiarism-checked, and verified to meet awarding body standards.' },
        { title: 'Career Support', description: 'Access job listings, CV builder, and employer partner internships through our integrated career portal.' },
      ],
    },
    sort_order: 2,
    is_visible: true,
  },
  {
    section_key: 'testimonials',
    content: {
      heading: 'What Our Students Say',
      items: [
        { name: 'Ahmed Khan', programme: 'Level 5 Business Management', quote: 'I completed my Level 4 and 5 from Pakistan and am now finishing my final year at the University of Sunderland.' },
        { name: 'Ayesha Malik', programme: 'Level 4 Computing', quote: 'The live online classes are brilliant. The lecturers are engaging, and I can access all recordings anytime.' },
        { name: 'Hassan Ali', programme: 'Level 3 Accounting', quote: 'The residential week experience was fantastic. Meeting my classmates and lecturers in person really strengthened my understanding.' },
      ],
    },
    sort_order: 5,
    is_visible: true,
  },
  {
    section_key: 'contact',
    content: {
      heading: 'Contact Us',
      address: 'Main Boulevard, Gulberg III, Lahore, Pakistan',
      phone: '+92 42 1234 5678',
      email: 'admissions@unipathway.pk',
      enquiry_link: '/contact',
    },
    sort_order: 6,
    is_visible: true,
  },
  {
    section_key: 'cta',
    content: {
      heading: 'Start Your UK Qualification Journey Today',
      subtitle: 'Applications are now open for the next intake. Secure your place and save 50–70% compared to studying abroad.',
      cta_primary_text: 'Apply Now',
      cta_secondary_text: 'Request a Callback',
    },
    sort_order: 7,
    is_visible: true,
  },
  {
    section_key: 'footer',
    content: {
      tagline: 'UK-accredited education centre in Pakistan. OTHM, QUALIFI & IAB approved.',
      badges: ['OTHM', 'QUALIFI', 'IAB'],
      copyright: '© 2026 {brandName}. Powered by EduCloud.',
    },
    sort_order: 8,
    is_visible: true,
  },
];

// For fetching by tenant_id (admin editing)
export function useTenantPageContent(tenantId?: string) {
  const [sections, setSections] = useState<PageSection[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const fetchContent = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('tenant_page_content' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order');

    if (data && (data as any[]).length > 0) {
      setSections((data as any[]).map(d => ({
        id: d.id,
        section_key: d.section_key,
        content: d.content,
        sort_order: d.sort_order,
        is_visible: d.is_visible,
      })));
    } else {
      setSections(DEFAULT_SECTIONS);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const updateSection = (sectionKey: string, content: Record<string, any>) => {
    setSections(prev => prev.map(s => s.section_key === sectionKey ? { ...s, content } : s));
  };

  const toggleVisibility = (sectionKey: string) => {
    setSections(prev => prev.map(s => s.section_key === sectionKey ? { ...s, is_visible: !s.is_visible } : s));
  };

  const saveAll = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      for (const section of sections) {
        await supabase
          .from('tenant_page_content' as any)
          .upsert({
            tenant_id: tenantId,
            section_key: section.section_key,
            content: section.content,
            sort_order: section.sort_order,
            is_visible: section.is_visible,
          } as any, { onConflict: 'tenant_id,section_key' });
      }
      toast.success('Page content saved & published');
    } catch {
      toast.error('Failed to save content');
    }
    setSaving(false);
  };

  return { sections, loading, saving, updateSection, toggleVisibility, saveAll, refetch: fetchContent };
}

// For fetching by slug (public landing page rendering)
export function useTenantPageContentBySlug(slug?: string) {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!slug) { setLoading(false); return; }
      // First get tenant_id from slug
      const { data: tenant } = await supabase
        .from('tenants_public' as any)
        .select('id')
        .eq('slug', slug)
        .single();
      if (!tenant) { setLoading(false); return; }

      const { data } = await supabase
        .from('tenant_page_content' as any)
        .select('*')
        .eq('tenant_id', (tenant as any).id)
        .eq('is_visible', true)
        .order('sort_order');

      if (data && (data as any[]).length > 0) {
        setSections((data as any[]).map(d => ({
          id: d.id,
          section_key: d.section_key,
          content: d.content,
          sort_order: d.sort_order,
          is_visible: d.is_visible,
        })));
      }
      setLoading(false);
    }
    fetch();
  }, [slug]);

  const getSection = (key: string) => sections.find(s => s.section_key === key)?.content;

  return { sections, loading, getSection };
}

export { DEFAULT_SECTIONS };
