-- UniPathway / Centre Director: allow only limited branding updates from a centre-bound director.
-- REVIEWED STAGING FORWARD PATCH ONLY; NOT applied to Lovable production.
-- Do not replay the entire repository migration history.
BEGIN;
CREATE OR REPLACE FUNCTION public.update_unipathway_centre_branding(
 p_tenant uuid,p_brand text,p_logo text,p_primary text,p_accent text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v public.tenants%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_tenant IS NULL
  OR p_tenant IS DISTINCT FROM public.get_user_tenant_id(auth.uid())
  OR NOT public.has_role(auth.uid(),'centre_director'::public.app_role)
 THEN RAISE EXCEPTION 'Centre Director access required' USING ERRCODE='42501';END IF;
 IF p_brand IS NULL OR length(btrim(p_brand)) NOT BETWEEN 2 AND 120
  OR p_primary !~ '^#[0-9A-Fa-f]{6}$' OR p_accent !~ '^#[0-9A-Fa-f]{6}$'
  OR (p_logo IS NOT NULL AND (length(p_logo)>1000 OR p_logo !~ '^https://[^[:space:]]+$'))
 THEN RAISE EXCEPTION 'Invalid branding fields' USING ERRCODE='22023';END IF;
 UPDATE public.tenants SET brand_name=btrim(p_brand),
  logo_url=NULLIF(p_logo,''),primary_color=p_primary,accent_color=p_accent
 WHERE id=p_tenant AND status IN ('active','onboarding')
 RETURNING * INTO v;
 IF NOT FOUND THEN RAISE EXCEPTION 'Centre not available for branding' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('id',v.id,'brand_name',v.brand_name,
  'primary_color',v.primary_color,'accent_color',v.accent_color,
  'logo_url',v.logo_url,'updated_at',v.updated_at);
END $$;
REVOKE ALL ON FUNCTION public.update_unipathway_centre_branding(uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_unipathway_centre_branding(uuid,text,text,text,text) TO authenticated;
COMMIT;
