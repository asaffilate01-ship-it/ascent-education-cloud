ALTER TABLE public.invoices ADD COLUMN sponsor_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(sponsor_amount>=0),
 ADD COLUMN sponsor_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK(sponsor_paid>=0 AND sponsor_paid<=sponsor_amount),
 ADD COLUMN sponsor_name text NOT NULL DEFAULT '',ADD COLUMN sponsor_reference text NOT NULL DEFAULT '',
 ADD COLUMN sponsor_due_on date,ADD COLUMN funding_note text NOT NULL DEFAULT '';
ALTER TABLE public.invoices ADD CONSTRAINT invoice_funding_total CHECK(sponsor_amount=0 OR (sponsor_amount+coalesce(paid,0)<=amount AND length(btrim(sponsor_name)) BETWEEN 2 AND 200 AND length(btrim(sponsor_reference)) BETWEEN 3 AND 200));
CREATE FUNCTION unipathway_acl.funding_manager(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND t=public.get_user_tenant_id(auth.uid()) AND
 (public.has_role(auth.uid(),'centre_director') OR public.has_role(auth.uid(),'finance_officer') OR public.has_role(auth.uid(),'superadmin'))
$$;
REVOKE ALL ON FUNCTION unipathway_acl.funding_manager(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_acl.funding_manager(uuid) TO authenticated;
-- Legacy checkout reads raw invoices through the learner JWT. Hide funded invoices
-- from that path until an explicitly funding-aware payment workflow is activated.
CREATE POLICY funding_legacy_checkout_guard ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated
 USING(sponsor_amount=0 OR unipathway_acl.funding_manager(tenant_id));
CREATE TABLE public.unipathway_funding_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL REFERENCES public.invoices(id),tenant_id uuid NOT NULL,
 changed_by uuid NOT NULL,previous jsonb,current jsonb NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_funding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY funding_event_read ON public.unipathway_funding_events FOR SELECT TO authenticated USING(unipathway_acl.funding_manager(tenant_id));
REVOKE ALL ON public.unipathway_funding_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_funding_events TO authenticated;
CREATE FUNCTION unipathway_acl.guard_invoice_funding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.sponsor_amount>0 AND (NEW.tenant_id,NEW.student_id,NEW.id) IS DISTINCT FROM (OLD.tenant_id,OLD.student_id,OLD.id) THEN RAISE EXCEPTION 'Funded invoice identity cannot change';END IF;
 IF (TG_OP='INSERT' AND (NEW.sponsor_amount<>0 OR NEW.sponsor_paid<>0)) OR (TG_OP='UPDATE' AND
 (NEW.sponsor_amount,NEW.sponsor_paid,NEW.sponsor_name,NEW.sponsor_reference,NEW.sponsor_due_on,NEW.funding_note) IS DISTINCT FROM
 (OLD.sponsor_amount,OLD.sponsor_paid,OLD.sponsor_name,OLD.sponsor_reference,OLD.sponsor_due_on,OLD.funding_note)) THEN
  IF NOT unipathway_acl.funding_manager(NEW.tenant_id) THEN RAISE EXCEPTION 'Finance approval required' USING ERRCODE='42501';END IF;
  IF NEW.student_id IS NULL OR NEW.status::text='refunded' THEN RAISE EXCEPTION 'Choose an active learner invoice';END IF;
  IF length(btrim(NEW.funding_note)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Record the agreement or receipt evidence reference';END IF;
  IF TG_OP='UPDATE' AND (NEW.sponsor_amount<OLD.sponsor_amount OR NEW.sponsor_paid<OLD.sponsor_paid OR NEW.amount>OLD.amount) THEN
   RAISE EXCEPTION 'Reducing approved cover or receipts requires a separate reviewed adjustment; it cannot become student debt';END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.sponsor_amount>0 AND NEW.amount>OLD.amount THEN RAISE EXCEPTION 'Use a separately agreed invoice for additional fees';END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION unipathway_acl.record_invoice_funding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (TG_OP='INSERT' AND NEW.sponsor_amount>0) OR (TG_OP='UPDATE' AND
 (NEW.sponsor_amount,NEW.sponsor_paid,NEW.sponsor_name,NEW.sponsor_reference,NEW.sponsor_due_on,NEW.funding_note) IS DISTINCT FROM
 (OLD.sponsor_amount,OLD.sponsor_paid,OLD.sponsor_name,OLD.sponsor_reference,OLD.sponsor_due_on,OLD.funding_note)) THEN
 INSERT INTO public.unipathway_funding_events(invoice_id,tenant_id,changed_by,previous,current,note)
 VALUES(NEW.id,NEW.tenant_id,auth.uid(),CASE WHEN TG_OP='UPDATE' THEN jsonb_build_object('cover',OLD.sponsor_amount,'received',OLD.sponsor_paid) ELSE NULL END,
 jsonb_build_object('cover',NEW.sponsor_amount,'received',NEW.sponsor_paid,'sponsor',NEW.sponsor_name,'reference',NEW.sponsor_reference,'due',NEW.sponsor_due_on),NEW.funding_note);
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.guard_invoice_funding(),unipathway_acl.record_invoice_funding() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_invoice_funding BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION unipathway_acl.guard_invoice_funding();
CREATE TRIGGER record_invoice_funding AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION unipathway_acl.record_invoice_funding();
CREATE FUNCTION public.get_unipathway_my_fee_invoices() RETURNS TABLE(id uuid,type text,amount numeric,paid numeric,status text,due_date date,created_at timestamptz,sponsor_amount numeric,sponsor_paid numeric,sponsor_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT i.id,i.type::text,i.amount::numeric,i.paid::numeric,i.status::text,i.due_date,i.created_at,i.sponsor_amount,i.sponsor_paid,i.sponsor_name
 FROM public.invoices i WHERE auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'student') AND i.student_id=auth.uid() AND i.tenant_id=public.get_user_tenant_id(auth.uid()) ORDER BY i.created_at DESC,i.id
$$;
REVOKE ALL ON FUNCTION public.get_unipathway_my_fee_invoices() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_my_fee_invoices() TO authenticated;

-- Upgrade only the existing consent-filtered service; legacy tenants stay unavailable.
DO $upgrade$ BEGIN
 IF to_regprocedure('public.get_unipathway_guardian_learning()') IS NOT NULL THEN
 EXECUTE $definition$CREATE OR REPLACE FUNCTION public.get_unipathway_guardian_learning() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'link_id',l.id,'student_name',pr.full_name,'module_title',m.title,'goal',p.goal,'skills',coalesce((SELECT jsonb_agg(jsonb_build_object('skill',t.skill,'baseline',t.baseline,'outcome',(SELECT a.outcome FROM public.unipathway_learning_attempts a WHERE a.task_id=t.id AND a.outcome IS NOT NULL ORDER BY a.submitted_at DESC LIMIT 1),'reviewed_at',(SELECT max(a.reviewed_at) FROM public.unipathway_learning_attempts a WHERE a.task_id=t.id))) FROM public.unipathway_learning_tasks t WHERE t.plan_id=p.id),'[]'::jsonb))),'[]'::jsonb)
 FROM public.unipathway_learning_shares s JOIN public.parent_student_links l ON l.id=s.link_id JOIN public.unipathway_learning_plans p ON p.id=s.plan_id AND p.student_id=l.student_id JOIN public.modules m ON m.id=p.module_id AND m.tenant_id=l.tenant_id JOIN public.profiles pr ON pr.user_id=p.student_id AND pr.tenant_id=m.tenant_id
 WHERE auth.uid() IS NOT NULL AND l.parent_id=auth.uid() AND l.verified AND public.has_role(p.student_id,'student') AND public.has_role(auth.uid(),'parent_guardian') AND l.tenant_id=public.get_user_tenant_id(auth.uid()) AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.student_id=p.student_id AND e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id AND e.status='active')
$$;$definition$;
 END IF;
END $upgrade$;
