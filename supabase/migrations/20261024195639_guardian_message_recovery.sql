-- Preserve old clients; new clients supply a stable request UUID for safe retries.
ALTER TABLE public.unipathway_guardian_messages ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX guardian_message_request ON public.unipathway_guardian_messages(author_id,request_id) WHERE request_id IS NOT NULL;
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_guardian_messages FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.send_unipathway_guardian_message_once(p_link uuid,p_body text,p_request uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing public.unipathway_guardian_messages; saved uuid;
BEGIN
 IF auth.uid() IS NULL OR p_request IS NULL THEN RAISE EXCEPTION 'Signed-in author and request ID required' USING ERRCODE='42501';END IF;
 IF p_body IS NULL OR length(trim(p_body)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4000 characters';END IF;
 -- Same author lock as the legacy sender: retries and new messages share the rate limit.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,31));
 -- Consent changes and guardian reverification take an exclusive lock on this link.
 PERFORM 1 FROM public.parent_student_links WHERE id=p_link FOR SHARE;
 IF NOT(public.guardian_scope_allowed(p_link,'communication') OR public.guardian_staff_allowed(p_link)) THEN RAISE EXCEPTION 'Communication access required' USING ERRCODE='42501';END IF;
 SELECT * INTO existing FROM public.unipathway_guardian_messages WHERE author_id=auth.uid() AND request_id=p_request;
 IF FOUND THEN
  IF (existing.link_id,existing.body) IS DISTINCT FROM (p_link,trim(p_body)) THEN RAISE EXCEPTION 'Request ID already used for a different message';END IF;
  RETURN existing.id;
 END IF;
 IF (SELECT count(*) FROM public.unipathway_guardian_messages WHERE author_id=auth.uid() AND created_at>now()-interval '1 minute')>=10 THEN RAISE EXCEPTION 'Please wait before sending another message';END IF;
 INSERT INTO public.unipathway_guardian_messages(link_id,author_id,body,request_id) VALUES(p_link,auth.uid(),trim(p_body),p_request) RETURNING id INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.send_unipathway_guardian_message_once(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_unipathway_guardian_message_once(uuid,text,uuid) TO authenticated;
