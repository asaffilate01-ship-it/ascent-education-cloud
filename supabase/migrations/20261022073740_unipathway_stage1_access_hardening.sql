-- Stage 1: rehearse on isolated staging before production rollout.
BEGIN;
-- Legacy vacancies have no verified employer ownership mapping. Directors may
-- manage their centre's records; employer writes use the newer verified portal.
DROP POLICY IF EXISTS "Employer partners and directors manage jobs" ON public.job_listings;
CREATE POLICY "centre directors manage scoped legacy jobs" ON public.job_listings
 FOR ALL TO authenticated USING (
 public.has_role(auth.uid(),'superadmin'::public.app_role)
 OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
 WITH CHECK (public.has_role(auth.uid(),'superadmin'::public.app_role)
 OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)));

-- Membership is an access grant, never a user-editable self-join record.
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join tenant conversations" ON public.conversation_participants;
REVOKE INSERT,UPDATE,DELETE ON public.conversation_participants FROM anon,authenticated;
REVOKE INSERT ON public.conversations FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_unipathway_private_conversation(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant uuid; v_id uuid;
BEGIN
 v_tenant:=public.get_user_tenant_id(auth.uid());
 IF auth.uid() IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION 'Approved centre account required' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Conversation name must be 1–120 characters'; END IF;
 INSERT INTO public.conversations(tenant_id,name,type) VALUES(v_tenant,btrim(p_name),'direct') RETURNING id INTO v_id;
 INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES(v_id,auth.uid());
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_unipathway_private_conversation(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_unipathway_private_conversation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.unipathway_private_attachment_allowed(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.conversations c JOIN public.conversation_participants p ON p.conversation_id=c.id
 WHERE p.user_id=auth.uid() AND c.tenant_id=public.get_user_tenant_id(auth.uid())
 AND c.tenant_id::text=split_part(p_path,'/',1) AND c.id::text=split_part(p_path,'/',2));
$$;
REVOKE ALL ON FUNCTION public.unipathway_private_attachment_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_private_attachment_allowed(text) TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES('private-message-attachments','private-message-attachments',false,10485760)
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760;
CREATE POLICY "conversation members download private attachments" ON storage.objects
 FOR SELECT TO authenticated USING(bucket_id='private-message-attachments' AND public.unipathway_private_attachment_allowed(name));
CREATE POLICY "conversation members upload owned attachments" ON storage.objects
 FOR INSERT TO authenticated WITH CHECK(bucket_id='private-message-attachments'
 AND split_part(name,'/',3)=auth.uid()::text AND public.unipathway_private_attachment_allowed(name));
CREATE POLICY "conversation uploader removes own attachments" ON storage.objects
 FOR DELETE TO authenticated USING(bucket_id='private-message-attachments'
 AND split_part(name,'/',3)=auth.uid()::text AND public.unipathway_private_attachment_allowed(name));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name text;
CREATE OR REPLACE FUNCTION public.validate_unipathway_message_attachment()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.attachment_path IS NOT NULL AND (
  split_part(NEW.attachment_path,'/',2)<>NEW.conversation_id::text
  OR split_part(NEW.attachment_path,'/',3)<>NEW.sender_id::text
  OR NOT public.unipathway_private_attachment_allowed(NEW.attachment_path))
 THEN RAISE EXCEPTION 'Attachment does not belong to this conversation and sender' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_private_message_attachment BEFORE INSERT OR UPDATE OF attachment_path,conversation_id,sender_id ON public.messages
 FOR EACH ROW EXECUTE FUNCTION public.validate_unipathway_message_attachment();
-- Existing public resources are not deleted or made private indiscriminately:
-- historic message uploads require a separate inventory and relocation exercise.
COMMIT;
