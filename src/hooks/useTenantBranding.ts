import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TenantBranding {
  brandName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  loading: boolean;
}

export function useTenantBranding(): TenantBranding {
  const { slug } = useParams<{ slug: string }>();
  const [branding, setBranding] = useState<TenantBranding>({
    brandName: 'UniPathway',
    primaryColor: '#8B1538',
    accentColor: '#D4A853',
    logoUrl: '',
    loading: true,
  });

  useEffect(() => {
    async function fetch() {
      if (!slug) { setBranding(b => ({ ...b, loading: false })); return; }
      const { data } = await supabase
        .from('tenants_public')
        .select('name, brand_name, primary_color, accent_color, logo_url')
        .eq('slug', slug)
        .single();
      const t = data as any;
      if (t) {
        setBranding({
          brandName: t.brand_name || t.name || 'UniPathway',
          primaryColor: t.primary_color || '#8B1538',
          accentColor: t.accent_color || '#D4A853',
          logoUrl: t.logo_url || '',
          loading: false,
        });
      } else {
        setBranding(b => ({ ...b, loading: false }));
      }
    }
    fetch();
  }, [slug]);

  return branding;
}
