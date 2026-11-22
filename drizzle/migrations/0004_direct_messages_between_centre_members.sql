CREATE OR REPLACE FUNCTION public.unipathway_is_messaging_staff(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND r.role::text IN
  ('superadmin','centre_director','admissions_admin','lecturer','programme_leader','iqa_officer','exams_officer','finance_officer','marketing_officer','assessor','welfare_officer'));
$$;
REVOKE ALL ON FUNCTION public.unipathway_is_messaging_staff(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_is_messaging_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unipathway_message_directory(p_search text DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, role_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant uuid; v_staff boolean; v_q text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 v_tenant:=public.get_user_tenant_id(auth.uid());
 IF v_tenant IS NULL THEN RETURN; END IF;
 v_staff:=public.unipathway_is_messaging_staff(auth.uid());
 v_q:=nullif(btrim(coalesce(p_search,'')),'');
 RETURN QUERY
 SELECT p.user_id, coalesce(nullif(p.full_name,''),'Centre member')::text,
  (SELECT string_agg(DISTINCT replace(r.role::text,'_',' '),', ') FROM public.user_roles r WHERE r.user_id=p.user_id)::text
 FROM public.profiles p
 WHERE p.tenant_id=v_tenant AND p.user_id<>auth.uid()
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id)
  AND (v_staff OR public.unipathway_is_messaging_staff(p.user_id))
  AND (v_q IS NULL OR p.full_name ILIKE '%'||v_q||'%')
 ORDER BY p.full_name NULLS LAST
 LIMIT 50;
END $$;
REVOKE ALL ON FUNCTION public.unipathway_message_directory(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_message_directory(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_unipathway_direct_conversation(p_recipient uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant uuid; v_id uuid; v_name text; v_me text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 v_tenant:=public.get_user_tenant_id(auth.uid());
 IF v_tenant IS NULL THEN RAISE EXCEPTION 'Approved centre account required' USING ERRCODE='42501'; END IF;
 IF p_recipient IS NULL OR p_recipient=auth.uid() THEN RAISE EXCEPTION 'Choose another person'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_recipient AND tenant_id=v_tenant) THEN
  RAISE EXCEPTION 'That person is not at your centre' USING ERRCODE='42501'; END IF;
 IF NOT public.unipathway_is_messaging_staff(auth.uid()) AND NOT public.unipathway_is_messaging_staff(p_recipient) THEN
  RAISE EXCEPTION 'Students can message centre staff only' USING ERRCODE='42501'; END IF;
 SELECT c.id INTO v_id FROM public.conversations c
  WHERE c.tenant_id=v_tenant AND c.type='direct'
   AND EXISTS(SELECT 1 FROM public.conversation_participants a WHERE a.conversation_id=c.id AND a.user_id=auth.uid())
   AND EXISTS(SELECT 1 FROM public.conversation_participants b WHERE b.conversation_id=c.id AND b.user_id=p_recipient)
   AND (SELECT count(*) FROM public.conversation_participants x WHERE x.conversation_id=c.id)=2
  ORDER BY c.updated_at DESC LIMIT 1;
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 SELECT coalesce(nullif(full_name,''),'Centre member') INTO v_name FROM public.profiles WHERE user_id=p_recipient;
 SELECT coalesce(nullif(full_name,''),'Centre member') INTO v_me FROM public.profiles WHERE user_id=auth.uid();
 INSERT INTO public.conversations(tenant_id,name,type) VALUES(v_tenant,left(v_me||' & '||v_name,120),'direct') RETURNING id INTO v_id;
 INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES(v_id,auth.uid()),(v_id,p_recipient);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.start_unipathway_direct_conversation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_unipathway_direct_conversation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unipathway_conversation_members(p_conversation uuid)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id, coalesce(nullif(pr.full_name,''),'Centre member')::text
 FROM public.conversation_participants p LEFT JOIN public.profiles pr ON pr.user_id=p.user_id
 WHERE p.conversation_id=p_conversation
  AND EXISTS(SELECT 1 FROM public.conversation_participants me WHERE me.conversation_id=p_conversation AND me.user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.unipathway_conversation_members(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_conversation_members(uuid) TO authenticated;

REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (read) ON public.messages TO authenticated;
DROP POLICY IF EXISTS "Recipients mark messages read" ON public.messages;
CREATE POLICY "Recipients mark messages read" ON public.messages FOR UPDATE TO authenticated
 USING (sender_id<>auth.uid() AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=messages.conversation_id AND cp.user_id=auth.uid()))
 WITH CHECK (sender_id<>auth.uid() AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=messages.conversation_id AND cp.user_id=auth.uid()));