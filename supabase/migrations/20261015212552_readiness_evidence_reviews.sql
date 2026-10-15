ALTER TABLE public.production_readiness_checks ADD COLUMN revision integer NOT NULL DEFAULT 0, ADD COLUMN valid_until timestamptz;
CREATE TABLE public.production_readiness_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,check_id uuid NOT NULL REFERENCES public.production_readiness_checks(id),
 revision integer NOT NULL,old_status text NOT NULL,new_status text NOT NULL,evidence_reference text,notes text,valid_until timestamptz,
 reviewed_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(check_id,revision)
);
ALTER TABLE public.production_readiness_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leadership readiness history" ON public.production_readiness_reviews FOR SELECT TO authenticated USING(
 public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role)));
GRANT SELECT ON public.production_readiness_reviews TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.production_readiness_reviews FROM authenticated;
CREATE FUNCTION public.review_production_check(p_check uuid,p_revision integer,p_status text,p_evidence text DEFAULT NULL,p_notes text DEFAULT NULL,p_valid_until timestamptz DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item public.production_readiness_checks;next_revision integer;stamp timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO item FROM public.production_readiness_checks WHERE id=p_check FOR UPDATE;
 IF auth.uid() IS NULL OR item.id IS NULL OR NOT coalesce(public.same_tenant(item.tenant_id),false) OR NOT (
 coalesce(public.has_role(auth.uid(),'superadmin'::app_role),false) OR coalesce(public.has_role(auth.uid(),'centre_director'::app_role),false)) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_revision IS DISTINCT FROM item.revision THEN RAISE EXCEPTION 'Check changed; reload before reviewing'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('pending','pass','fail','blocked','not_applicable') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
 p_evidence=nullif(btrim(p_evidence),'');p_notes=nullif(btrim(p_notes),'');
 IF length(coalesce(p_evidence,''))>500 OR length(coalesce(p_notes,''))>2000 THEN RAISE EXCEPTION 'Review text exceeds limits'; END IF;
 IF p_status IN ('pass','not_applicable') AND p_evidence IS NULL THEN RAISE EXCEPTION 'Evidence reference required'; END IF;
 IF p_status IN ('fail','blocked','not_applicable') AND p_notes IS NULL THEN RAISE EXCEPTION 'A reason is required'; END IF;
 IF p_status='pass' AND (p_valid_until IS NULL OR NOT isfinite(p_valid_until) OR p_valid_until<=stamp) THEN RAISE EXCEPTION 'Pass evidence needs a future review deadline'; END IF;
 IF p_status<>'pass' THEN p_valid_until=NULL; END IF;
 next_revision=item.revision+1;
 UPDATE public.production_readiness_checks SET status=p_status,evidence_reference=p_evidence,notes=p_notes,checked_at=stamp,checked_by=auth.uid(),valid_until=p_valid_until,revision=next_revision WHERE id=item.id;
 INSERT INTO public.production_readiness_reviews(tenant_id,check_id,revision,old_status,new_status,evidence_reference,notes,valid_until,reviewed_by,created_at)
 VALUES(item.tenant_id,item.id,next_revision,item.status,p_status,p_evidence,p_notes,p_valid_until,auth.uid(),stamp);
 RETURN next_revision;
END $$;
REVOKE ALL ON FUNCTION public.review_production_check(uuid,integer,text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_production_check(uuid,integer,text,text,text,timestamptz) TO authenticated;
