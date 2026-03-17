
-- Table to store tenant page content sections (editable from the app)
CREATE TABLE public.tenant_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  section_key text NOT NULL, -- e.g. 'hero', 'promo_banner', 'why_us', 'courses', 'pathways', 'accreditation', 'testimonials', 'contact', 'cta', 'footer'
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, section_key)
);

ALTER TABLE public.tenant_page_content ENABLE ROW LEVEL SECURITY;

-- Centre directors and admissions admins can manage their tenant's page content
CREATE POLICY "Staff manage tenant page content"
  ON public.tenant_page_content FOR ALL
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) 
    AND (has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'marketing_officer'))
  );

-- Public read for rendering landing pages
CREATE POLICY "Public read tenant page content"
  ON public.tenant_page_content FOR SELECT
  USING (is_visible = true);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_page_content_updated_at
  BEFORE UPDATE ON public.tenant_page_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for tenant custom domain & email DNS configuration
CREATE TABLE public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain_type text NOT NULL CHECK (domain_type IN ('website', 'email')),
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'active', 'failed')),
  dns_records jsonb DEFAULT '[]'::jsonb, -- stores required DNS records for user reference
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, domain_type, domain)
);

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors manage tenant domains"
  ON public.tenant_domains FOR ALL
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'superadmin'))
  );

CREATE POLICY "Staff view tenant domains"
  ON public.tenant_domains FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
