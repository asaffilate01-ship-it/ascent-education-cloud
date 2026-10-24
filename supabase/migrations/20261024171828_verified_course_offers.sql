CREATE TABLE public.unipathway_public_course_offers (
 course_key text PRIMARY KEY CHECK(length(course_key) BETWEEN 5 AND 300),
 availability text NOT NULL CHECK(availability IN ('open','upcoming','closed')),
 fees text NOT NULL CHECK(length(btrim(fees)) BETWEEN 3 AND 2000),
 entry_requirements text NOT NULL CHECK(length(btrim(entry_requirements)) BETWEEN 20 AND 4000),
 intake_date date NOT NULL, valid_until timestamptz NOT NULL,
 published boolean NOT NULL DEFAULT false, revision int NOT NULL DEFAULT 1,
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.unipathway_course_offer_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),course_key text NOT NULL REFERENCES public.unipathway_public_course_offers(course_key),
 revision int NOT NULL, reviewed_by uuid NOT NULL REFERENCES auth.users(id),
 evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 10 AND 1000),
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(course_key,revision)
);
ALTER TABLE public.unipathway_public_course_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unipathway_course_offer_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_public_course_offers,public.unipathway_course_offer_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_public_course_offers TO anon,authenticated;
GRANT SELECT ON public.unipathway_course_offer_reviews TO authenticated;
CREATE POLICY "Current confirmed public offers" ON public.unipathway_public_course_offers FOR SELECT TO anon,authenticated USING(published AND valid_until>now() AND intake_date>=current_date);
CREATE POLICY "Platform reviews all course offers" ON public.unipathway_public_course_offers FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Platform course offer audit" ON public.unipathway_course_offer_reviews FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'superadmin'));
CREATE FUNCTION public.review_unipathway_course_offer(p_key text,p_availability text,p_fees text,p_entry text,p_intake date,p_until timestamptz,p_publish boolean,p_evidence text,p_revision int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r int; snapshot public.unipathway_public_course_offers%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'superadmin') THEN RAISE EXCEPTION 'Platform content reviewer required' USING ERRCODE='42501'; END IF;
 IF p_revision IS NULL OR p_publish IS NULL OR p_until<=now() OR p_until>now()+interval '180 days' OR p_intake<current_date THEN RAISE EXCEPTION 'Future intake and review deadline within 180 days required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key,7));
 SELECT revision INTO r FROM public.unipathway_public_course_offers WHERE course_key=p_key FOR UPDATE;
 IF coalesce(r,0)<>p_revision THEN RAISE EXCEPTION 'Offer changed. Reload before reviewing'; END IF;
 INSERT INTO public.unipathway_public_course_offers(course_key,availability,fees,entry_requirements,intake_date,valid_until,published)
 VALUES(p_key,p_availability,btrim(p_fees),btrim(p_entry),p_intake,p_until,p_publish)
 ON CONFLICT(course_key) DO UPDATE SET availability=excluded.availability,fees=excluded.fees,entry_requirements=excluded.entry_requirements,intake_date=excluded.intake_date,valid_until=excluded.valid_until,published=excluded.published,revision=unipathway_public_course_offers.revision+1,verified_at=now()
 RETURNING * INTO snapshot;
 INSERT INTO public.unipathway_course_offer_reviews(course_key,revision,reviewed_by,evidence_reference,snapshot) VALUES(p_key,snapshot.revision,auth.uid(),btrim(p_evidence),to_jsonb(snapshot));
 RETURN snapshot.revision;
END $$;
CREATE FUNCTION public.withdraw_unipathway_course_offer(p_key text,p_evidence text,p_revision int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE snapshot public.unipathway_public_course_offers%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'superadmin') THEN RAISE EXCEPTION 'Platform content reviewer required' USING ERRCODE='42501'; END IF;
 UPDATE public.unipathway_public_course_offers SET published=false,revision=revision+1 WHERE course_key=p_key AND revision=p_revision RETURNING * INTO snapshot;
 IF NOT FOUND THEN RAISE EXCEPTION 'Offer changed. Reload before withdrawing'; END IF;
 INSERT INTO public.unipathway_course_offer_reviews(course_key,revision,reviewed_by,evidence_reference,snapshot) VALUES(p_key,snapshot.revision,auth.uid(),btrim(p_evidence),to_jsonb(snapshot));
END $$;
REVOKE ALL ON FUNCTION public.review_unipathway_course_offer(text,text,text,text,date,timestamptz,boolean,text,int),public.withdraw_unipathway_course_offer(text,text,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_unipathway_course_offer(text,text,text,text,date,timestamptz,boolean,text,int),public.withdraw_unipathway_course_offer(text,text,int) TO authenticated;
