-- Create the canonical progression case and consent request in one transaction.
CREATE FUNCTION public.create_pathway_application(p_route uuid,p_student uuid,p_intake text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.international_pathway_routes; organisation uuid; application uuid; referral uuid;
BEGIN
 SELECT * INTO r FROM public.international_pathway_routes WHERE id=p_route;
 IF r.id IS NULL OR NOT public.same_tenant(r.tenant_id) OR NOT (
 public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)
 OR public.has_role(auth.uid(),'admissions_admin'::app_role)) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF r.review_status<>'verified' OR NOT r.student_visible OR NOT public.global_partner_authorised(r.partner_id,r.tenant_id) THEN
 RAISE EXCEPTION 'A current verified pathway is required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles u ON u.user_id=p.user_id AND u.tenant_id=p.tenant_id
 WHERE p.user_id=p_student AND p.tenant_id=r.tenant_id AND u.role='student'::app_role) THEN RAISE EXCEPTION 'Student unavailable in this centre'; END IF;
 IF length(coalesce(p_intake,''))>100 THEN RAISE EXCEPTION 'Intake is too long'; END IF;
 -- Serialise repeated requests for this student and route. Reuse a pending referral on retries.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_route::text||p_student::text,0));
 SELECT id INTO referral FROM public.international_partner_referrals WHERE route_id=p_route AND tenant_id=r.tenant_id AND student_id=p_student
 AND status NOT IN ('withdrawn','rejected') ORDER BY created_at DESC LIMIT 1;
 IF referral IS NOT NULL THEN RETURN referral; END IF;
 SELECT id INTO organisation FROM public.career_organisations WHERE tenant_id=r.tenant_id AND organisation_type='university'
 AND name=r.destination_institution AND country=r.destination_country ORDER BY created_at LIMIT 1;
 IF organisation IS NULL THEN
 INSERT INTO public.career_organisations(tenant_id,name,organisation_type,country,verified,partner_status)
 VALUES(r.tenant_id,r.destination_institution,'university',r.destination_country,false,'pending') RETURNING id INTO organisation;
 END IF;
 INSERT INTO public.international_university_applications(tenant_id,student_id,university_organisation_id,destination_country,programme,intake,status,counsellor_id)
 VALUES(r.tenant_id,p_student,organisation,r.destination_country,r.destination_programme,nullif(btrim(p_intake),''),'planning',auth.uid()) RETURNING id INTO application;
 INSERT INTO public.international_partner_referrals(tenant_id,partner_id,route_id,student_id,international_application_id)
 VALUES(r.tenant_id,r.partner_id,r.id,p_student,application) RETURNING id INTO referral;
 RETURN referral;
END $$;
REVOKE ALL ON FUNCTION public.create_pathway_application(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pathway_application(uuid,uuid,text) TO authenticated;

CREATE FUNCTION public.sync_global_referral_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
 UPDATE public.international_university_applications SET status=CASE NEW.status
 WHEN 'submitted' THEN 'application' WHEN 'acknowledged' THEN 'application'
 WHEN 'offer' THEN 'offer' WHEN 'enrolled' THEN 'enrolled'
 WHEN 'withdrawn' THEN 'withdrawn' WHEN 'rejected' THEN 'rejected' ELSE status END,updated_at=now()
 WHERE id=NEW.international_application_id AND tenant_id=NEW.tenant_id AND student_id=NEW.student_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_global_referral_application AFTER UPDATE OF status ON public.international_partner_referrals
 FOR EACH ROW EXECUTE FUNCTION public.sync_global_referral_application();
