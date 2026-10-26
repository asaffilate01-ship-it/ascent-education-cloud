-- Institutional mail is separate from informal chat. No provider is enabled by this migration.
CREATE TABLE public.uni_mailboxes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,address text NOT NULL UNIQUE CHECK(address=lower(address) AND address ~ '^[a-z0-9._+-]+@unipathway[.]pk$'),provider text NOT NULL DEFAULT 'graph' CHECK(provider IN ('graph','imap')),graph_user_id uuid,enabled boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.uni_mail_members(mailbox_id uuid NOT NULL REFERENCES public.uni_mailboxes(id),user_id uuid NOT NULL,can_send boolean NOT NULL DEFAULT false,PRIMARY KEY(mailbox_id,user_id));
CREATE TABLE public.uni_mail_threads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mailbox_id uuid NOT NULL REFERENCES public.uni_mailboxes(id),subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 500),provider_conversation text,assigned_to uuid,status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','waiting','completed')),priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','high','urgent')),due_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(mailbox_id,provider_conversation));
CREATE TABLE public.uni_mail_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES public.uni_mail_threads(id),provider_id text,from_address text NOT NULL,to_addresses text[] NOT NULL,cc_addresses text[] NOT NULL DEFAULT '{}',body_text text NOT NULL CHECK(length(body_text)<=100000),direction text NOT NULL CHECK(direction IN ('inbound','outbound')),state text NOT NULL CHECK(state IN ('draft','queued','sending','accepted','delivery_unknown','imported','cancelled')),created_by uuid,created_at timestamptz NOT NULL DEFAULT now(),provider_at timestamptz,has_attachments boolean NOT NULL DEFAULT false,UNIQUE(thread_id,provider_id));
CREATE TABLE public.uni_mail_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES public.uni_mail_threads(id),title text NOT NULL CHECK(length(title) BETWEEN 1 AND 500),assigned_to uuid NOT NULL,status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','completed')),due_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.uni_mail_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,thread_id uuid NOT NULL REFERENCES public.uni_mail_threads(id),actor_id uuid,event_type text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.uni_mail_alerts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES public.uni_mail_threads(id),user_id uuid NOT NULL,title text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.uni_mail_documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES public.uni_mail_threads(id),name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),object_path text NOT NULL UNIQUE,uploaded_by uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.uni_mail_cursors(mailbox_id uuid NOT NULL REFERENCES public.uni_mailboxes(id),folder text NOT NULL CHECK(length(folder) BETWEEN 1 AND 2000),cursor_url text,last_synced_at timestamptz,PRIMARY KEY(mailbox_id,folder));
CREATE INDEX ON public.uni_mail_threads(mailbox_id,updated_at DESC);
CREATE INDEX ON public.uni_mail_messages(thread_id,created_at);
CREATE INDEX ON public.uni_mail_alerts(user_id,read_at);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['uni_mailboxes','uni_mail_members','uni_mail_threads','uni_mail_messages','uni_mail_tasks','uni_mail_events','uni_mail_alerts','uni_mail_documents','uni_mail_cursors'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);EXECUTE format('GRANT ALL ON public.%I TO service_role',t);END LOOP;END $$;
GRANT USAGE,SELECT ON SEQUENCE public.uni_mail_events_id_seq TO service_role;
CREATE FUNCTION public.uni_mail_access(p_box uuid,p_send boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.uni_mailboxes b JOIN public.profiles p ON p.tenant_id=b.tenant_id AND p.user_id=auth.uid() WHERE b.id=p_box AND
 ((NOT p_send AND public.can_manage_unipathway_microsoft(b.tenant_id)) OR EXISTS(SELECT 1 FROM public.uni_mail_members m WHERE m.mailbox_id=b.id AND m.user_id=auth.uid() AND (NOT p_send OR m.can_send))))
$$;
CREATE FUNCTION public.uni_mail_thread_access(p_thread uuid,p_send boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.uni_mail_threads t WHERE t.id=p_thread AND public.uni_mail_access(t.mailbox_id,p_send)) $$;
REVOKE ALL ON FUNCTION public.uni_mail_access(uuid,boolean),public.uni_mail_thread_access(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.uni_mail_access(uuid,boolean),public.uni_mail_thread_access(uuid,boolean) TO authenticated;
GRANT SELECT ON public.uni_mailboxes,public.uni_mail_members,public.uni_mail_threads,public.uni_mail_messages,public.uni_mail_tasks,public.uni_mail_events,public.uni_mail_alerts,public.uni_mail_documents TO authenticated;
CREATE POLICY "mailbox authorised read" ON public.uni_mailboxes FOR SELECT TO authenticated USING(public.uni_mail_access(id));
CREATE POLICY "members authorised read" ON public.uni_mail_members FOR SELECT TO authenticated USING(public.uni_mail_access(mailbox_id));
CREATE POLICY "thread authorised read" ON public.uni_mail_threads FOR SELECT TO authenticated USING(public.uni_mail_access(mailbox_id));
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['uni_mail_messages','uni_mail_tasks','uni_mail_events','uni_mail_documents'] LOOP EXECUTE format('CREATE POLICY "thread authorised read" ON public.%I FOR SELECT TO authenticated USING(public.uni_mail_thread_access(thread_id))',t);END LOOP;END $$;
CREATE POLICY "alerts own current access" ON public.uni_mail_alerts FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.uni_mail_thread_access(thread_id));
CREATE FUNCTION public.configure_uni_mailbox(p_address text,p_graph uuid,p_member uuid,p_send boolean DEFAULT false,p_enabled boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;b uuid;BEGIN
 t:=public.get_user_tenant_id(auth.uid());IF NOT public.can_manage_unipathway_microsoft(t) THEN RAISE EXCEPTION 'Centre administrator required';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_member AND tenant_id=t) THEN RAISE EXCEPTION 'Member must belong to centre';END IF;
 INSERT INTO public.uni_mailboxes(tenant_id,address,graph_user_id,provider,enabled) VALUES(t,lower(trim(p_address)),p_graph,CASE WHEN p_graph IS NULL THEN 'imap' ELSE 'graph' END,p_enabled)
 ON CONFLICT(address) DO UPDATE SET enabled=EXCLUDED.enabled WHERE uni_mailboxes.tenant_id=t AND uni_mailboxes.graph_user_id IS NOT DISTINCT FROM EXCLUDED.graph_user_id RETURNING id INTO b;
 IF b IS NULL THEN RAISE EXCEPTION 'Mailbox mapping conflict';END IF;
 INSERT INTO public.uni_mail_members VALUES(b,p_member,p_send) ON CONFLICT(mailbox_id,user_id) DO UPDATE SET can_send=EXCLUDED.can_send;
 RETURN b;END $$;
CREATE FUNCTION public.remove_uni_mail_member(p_box uuid,p_member uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF NOT EXISTS(SELECT 1 FROM public.uni_mailboxes WHERE id=p_box AND public.can_manage_unipathway_microsoft(tenant_id)) THEN RAISE EXCEPTION 'Centre administrator required';END IF;
 DELETE FROM public.uni_mail_members WHERE mailbox_id=p_box AND user_id=p_member;
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) SELECT id,auth.uid(),'mailbox_access_removed',jsonb_build_object('user_id',p_member) FROM public.uni_mail_threads WHERE mailbox_id=p_box;
END $$;
CREATE FUNCTION public.save_uni_mail_draft(p_box uuid,p_subject text,p_to text[],p_body text,p_thread uuid DEFAULT NULL,p_request uuid DEFAULT gen_random_uuid()) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;b public.uni_mailboxes;a text;existing public.uni_mail_messages;BEGIN
 IF NOT public.uni_mail_access(p_box,true) THEN RAISE EXCEPTION 'Mailbox send permission required';END IF;
 IF p_to IS NULL OR cardinality(p_to) NOT BETWEEN 1 AND 20 OR length(trim(p_body)) NOT BETWEEN 1 AND 100000 OR length(trim(p_subject)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Subject, recipients and message required';END IF;
 FOREACH a IN ARRAY p_to LOOP IF a IS NULL OR length(a)>254 OR a !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$' THEN RAISE EXCEPTION 'Invalid recipient';END IF;END LOOP;
 SELECT * INTO existing FROM public.uni_mail_messages WHERE id=p_request;
 IF existing.id IS NOT NULL THEN
 IF existing.created_by=auth.uid() AND EXISTS(SELECT 1 FROM public.uni_mail_threads WHERE id=existing.thread_id AND mailbox_id=p_box) THEN RETURN existing.id;END IF;RAISE EXCEPTION 'Request ID conflict';END IF;
 SELECT * INTO b FROM public.uni_mailboxes WHERE id=p_box;
 IF p_thread IS NULL THEN INSERT INTO public.uni_mail_threads(mailbox_id,subject,assigned_to,provider_conversation) VALUES(p_box,trim(p_subject),auth.uid(),CASE WHEN b.provider='imap' THEN '<'||p_request::text||'@unipathway.pk>' ELSE NULL END) RETURNING id INTO t;
 ELSE SELECT id INTO t FROM public.uni_mail_threads WHERE id=p_thread AND mailbox_id=p_box;IF t IS NULL THEN RAISE EXCEPTION 'Thread unavailable';END IF;END IF;
 INSERT INTO public.uni_mail_messages(id,thread_id,from_address,to_addresses,body_text,direction,state,created_by) VALUES(p_request,t,b.address,p_to,p_body,'outbound','draft',auth.uid());
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) VALUES(t,auth.uid(),'draft_created',jsonb_build_object('message_id',p_request));RETURN p_request;END $$;
CREATE FUNCTION public.queue_uni_mail(p_message uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.uni_mail_messages;BEGIN
 SELECT * INTO m FROM public.uni_mail_messages WHERE id=p_message FOR UPDATE;
 IF m.id IS NULL OR NOT public.uni_mail_thread_access(m.thread_id,true) THEN RAISE EXCEPTION 'Mailbox send permission required';END IF;
 IF m.state<>'draft' THEN RAISE EXCEPTION 'Only a draft can be queued';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.uni_mail_threads t JOIN public.uni_mailboxes b ON b.id=t.mailbox_id WHERE t.id=m.thread_id AND b.enabled AND b.address=m.from_address) THEN RAISE EXCEPTION 'Mailbox connection must be enabled first';END IF;
 UPDATE public.uni_mail_messages SET state='queued' WHERE id=m.id;
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) VALUES(m.thread_id,auth.uid(),'email_queued',jsonb_build_object('message_id',m.id));END $$;
CREATE FUNCTION public.update_uni_mail_thread(p_thread uuid,p_assignee uuid,p_status text,p_priority text,p_due timestamptz DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.uni_mail_threads;BEGIN
 SELECT * INTO t FROM public.uni_mail_threads WHERE id=p_thread FOR UPDATE;
 IF NOT public.uni_mail_thread_access(p_thread,true) THEN RAISE EXCEPTION 'Mailbox management permission required';END IF;
 IF p_assignee IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.uni_mail_members m JOIN public.profiles p ON p.user_id=m.user_id JOIN public.uni_mailboxes b ON b.id=m.mailbox_id AND b.tenant_id=p.tenant_id WHERE m.mailbox_id=t.mailbox_id AND m.user_id=p_assignee) THEN RAISE EXCEPTION 'Assign to a current mailbox member';END IF;
 UPDATE public.uni_mail_threads SET assigned_to=p_assignee,status=p_status,priority=p_priority,due_at=p_due,updated_at=now() WHERE id=p_thread;
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) VALUES(p_thread,auth.uid(),'thread_updated',jsonb_build_object('previous_assignee',t.assigned_to,'assignee',p_assignee,'previous_status',t.status,'status',p_status,'priority',p_priority,'due',p_due));
 IF p_assignee IS NOT NULL THEN INSERT INTO public.uni_mail_alerts(thread_id,user_id,title) VALUES(p_thread,p_assignee,'Correspondence assigned or updated');END IF;END $$;
CREATE FUNCTION public.save_uni_mail_task(p_thread uuid,p_title text,p_assignee uuid,p_status text DEFAULT 'todo',p_due timestamptz DEFAULT NULL,p_task uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b uuid;j uuid;old public.uni_mail_tasks;BEGIN
 IF NOT public.uni_mail_thread_access(p_thread,true) THEN RAISE EXCEPTION 'Mailbox management permission required';END IF;
 SELECT mailbox_id INTO b FROM public.uni_mail_threads WHERE id=p_thread;
 IF NOT EXISTS(SELECT 1 FROM public.uni_mail_members m JOIN public.profiles p ON p.user_id=m.user_id JOIN public.uni_mailboxes x ON x.id=m.mailbox_id AND x.tenant_id=p.tenant_id WHERE m.mailbox_id=b AND m.user_id=p_assignee) THEN RAISE EXCEPTION 'Assign to a current mailbox member';END IF;
 IF p_task IS NULL THEN INSERT INTO public.uni_mail_tasks(thread_id,title,assigned_to,status,due_at) VALUES(p_thread,p_title,p_assignee,p_status,p_due) RETURNING id INTO j;
 ELSE SELECT * INTO old FROM public.uni_mail_tasks WHERE id=p_task AND thread_id=p_thread FOR UPDATE;IF old.id IS NULL THEN RAISE EXCEPTION 'Task unavailable';END IF;
 UPDATE public.uni_mail_tasks SET title=p_title,assigned_to=p_assignee,status=p_status,due_at=p_due WHERE id=p_task RETURNING id INTO j;END IF;
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) VALUES(p_thread,auth.uid(),'task_saved',jsonb_build_object('task_id',j,'title',p_title,'previous_assignee',old.assigned_to,'assignee',p_assignee,'previous_status',old.status,'status',p_status,'due',p_due));
 INSERT INTO public.uni_mail_alerts(thread_id,user_id,title) VALUES(p_thread,p_assignee,'Communication task: '||left(p_title,150));RETURN j;END $$;
CREATE FUNCTION public.read_uni_mail_alert(p_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ UPDATE public.uni_mail_alerts SET read_at=now() WHERE id=p_id AND user_id=auth.uid() AND public.uni_mail_thread_access(thread_id) $$;
-- Immutable append-only audit and message history: clients receive no UPDATE/DELETE grants.
CREATE FUNCTION public.register_uni_mail_document(p_thread uuid,p_name text,p_path text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j uuid;BEGIN
 IF NOT public.uni_mail_thread_access(p_thread,true) OR p_path NOT LIKE p_thread::text||'/'||auth.uid()::text||'/%' THEN RAISE EXCEPTION 'Document upload permission required';END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='unipathway-comms' AND name=p_path) THEN RAISE EXCEPTION 'Upload missing';END IF;
 INSERT INTO public.uni_mail_documents(thread_id,name,object_path,uploaded_by) VALUES(p_thread,p_name,p_path,auth.uid()) RETURNING id INTO j;
 RETURN j;END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('unipathway-comms','unipathway-comms',false,10485760,ARRAY['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) ON CONFLICT(id) DO UPDATE SET public=false;
CREATE FUNCTION public.uni_mail_storage_access(p_name text,p_write boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;BEGIN
 BEGIN t:=split_part(p_name,'/',1)::uuid;EXCEPTION WHEN invalid_text_representation THEN RETURN false;END;
 IF p_write THEN RETURN public.uni_mail_thread_access(t,true) AND split_part(p_name,'/',2)=auth.uid()::text;END IF;
 RETURN public.uni_mail_thread_access(t) AND EXISTS(SELECT 1 FROM public.uni_mail_documents WHERE object_path=p_name AND thread_id=t);END $$;
REVOKE ALL ON FUNCTION public.uni_mail_storage_access(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.uni_mail_storage_access(text,boolean) TO authenticated;
CREATE POLICY "comms document read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='unipathway-comms' AND public.uni_mail_storage_access(name));
CREATE POLICY "comms document insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='unipathway-comms' AND public.uni_mail_storage_access(name,true));
CREATE POLICY "comms read guard" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id<>'unipathway-comms' OR public.uni_mail_storage_access(name));
CREATE POLICY "comms insert guard" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'unipathway-comms' OR public.uni_mail_storage_access(name,true));
CREATE POLICY "comms immutable update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'unipathway-comms') WITH CHECK(bucket_id<>'unipathway-comms');
CREATE POLICY "comms immutable delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'unipathway-comms');
DO $$ DECLARE f record;BEGIN FOR f IN SELECT oid::regprocedure sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('configure_uni_mailbox','remove_uni_mail_member','save_uni_mail_draft','queue_uni_mail','update_uni_mail_thread','save_uni_mail_task','read_uni_mail_alert','register_uni_mail_document') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f.sig);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig);END LOOP;END $$;
-- Provider-only ingestion and delivery transitions. A network timeout never triggers an automatic resend.
CREATE FUNCTION public.ingest_uni_mail(p_box uuid,p_provider text,p_conversation text,p_subject text,p_from text,p_to text[],p_cc text[],p_body text,p_direction text,p_at timestamptz,p_has_documents boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;m uuid;b public.uni_mailboxes;BEGIN
 SELECT * INTO b FROM public.uni_mailboxes WHERE id=p_box AND enabled;IF b.id IS NULL THEN RAISE EXCEPTION 'Mailbox disabled';END IF;
 IF p_direction NOT IN ('inbound','outbound') OR p_provider IS NULL OR length(p_provider)>2000 OR p_conversation IS NULL OR length(p_conversation)>2000 THEN RAISE EXCEPTION 'Invalid provider envelope';END IF;
 -- Reconcile an SMTP sent copy with its original queued record using our deterministic Message-ID.
 IF p_direction='outbound' AND lower(p_from)=b.address THEN
 SELECT x.id,x.thread_id INTO m,t FROM public.uni_mail_messages x JOIN public.uni_mail_threads y ON y.id=x.thread_id WHERE y.mailbox_id=p_box AND '<'||x.id::text||'@unipathway.pk>'=p_provider AND x.state IN ('sending','accepted','delivery_unknown','imported') LIMIT 1;
 IF m IS NOT NULL THEN
 UPDATE public.uni_mail_messages SET provider_id=p_provider,state='imported',provider_at=p_at WHERE id=m AND state<>'imported';
 IF FOUND THEN INSERT INTO public.uni_mail_events(thread_id,event_type,details) VALUES(t,'sent_copy_reconciled',jsonb_build_object('message_id',m));END IF;RETURN m;END IF;END IF;
 INSERT INTO public.uni_mail_threads(mailbox_id,subject,provider_conversation) VALUES(p_box,left(coalesce(nullif(p_subject,''),'(No subject)'),500),p_conversation) ON CONFLICT(mailbox_id,provider_conversation) DO UPDATE SET updated_at=now() RETURNING id INTO t;
 INSERT INTO public.uni_mail_messages(thread_id,provider_id,from_address,to_addresses,cc_addresses,body_text,direction,state,provider_at,has_attachments)
 VALUES(t,p_provider,p_from,p_to,coalesce(p_cc,'{}'),left(coalesce(p_body,''),100000),p_direction,'imported',p_at,p_has_documents) ON CONFLICT(thread_id,provider_id) DO NOTHING RETURNING id INTO m;
 IF m IS NOT NULL THEN
 INSERT INTO public.uni_mail_events(thread_id,event_type,details) VALUES(t,'email_imported',jsonb_build_object('message_id',m,'direction',p_direction));
 INSERT INTO public.uni_mail_alerts(thread_id,user_id,title) SELECT t,user_id,'New correspondence: '||left(coalesce(p_subject,''),120) FROM public.uni_mail_members WHERE mailbox_id=p_box;
 ELSE SELECT id INTO m FROM public.uni_mail_messages WHERE thread_id=t AND provider_id=p_provider;END IF;
 RETURN m;END $$;
CREATE FUNCTION public.claim_uni_mail_send(p_tenant uuid,p_provider text DEFAULT 'graph') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.uni_mail_messages;b public.uni_mailboxes;t public.uni_mail_threads;BEGIN
 WITH stalled AS (
 UPDATE public.uni_mail_messages x SET state='delivery_unknown' FROM public.uni_mail_threads y,public.uni_mailboxes z
 WHERE x.thread_id=y.id AND y.mailbox_id=z.id AND z.tenant_id=p_tenant AND z.provider=p_provider AND x.state='sending'
 AND EXISTS(SELECT 1 FROM public.uni_mail_events e WHERE e.thread_id=y.id AND e.event_type='send_attempt_started' AND e.details->>'message_id'=x.id::text AND e.created_at<now()-interval '10 minutes') RETURNING x.id,x.thread_id)
 INSERT INTO public.uni_mail_events(thread_id,event_type,details) SELECT thread_id,'delivery_needs_review',jsonb_build_object('message_id',id,'reason','worker_interrupted') FROM stalled;
 SELECT x.* INTO m FROM public.uni_mail_messages x JOIN public.uni_mail_threads y ON y.id=x.thread_id JOIN public.uni_mailboxes z ON z.id=y.mailbox_id
 WHERE z.tenant_id=p_tenant AND z.provider=p_provider AND z.enabled AND x.state='queued' ORDER BY x.created_at FOR UPDATE OF x SKIP LOCKED LIMIT 1;
 IF m.id IS NULL THEN RETURN NULL;END IF;
 SELECT * INTO t FROM public.uni_mail_threads WHERE id=m.thread_id;SELECT * INTO b FROM public.uni_mailboxes WHERE id=t.mailbox_id;
 -- Recheck sender membership; administrators use explicitly granted membership for provider sends too.
 IF NOT EXISTS(SELECT 1 FROM public.uni_mail_members mm JOIN public.profiles p ON p.user_id=mm.user_id AND p.tenant_id=b.tenant_id WHERE mm.mailbox_id=b.id AND mm.user_id=m.created_by AND mm.can_send) OR m.from_address<>b.address THEN
 UPDATE public.uni_mail_messages SET state='draft' WHERE id=m.id;INSERT INTO public.uni_mail_events(thread_id,event_type) VALUES(m.thread_id,'send_permission_revoked');RETURN NULL;END IF;
 UPDATE public.uni_mail_messages SET state='sending' WHERE id=m.id;
 INSERT INTO public.uni_mail_events(thread_id,event_type,details) VALUES(m.thread_id,'send_attempt_started',jsonb_build_object('message_id',m.id));
 RETURN jsonb_build_object('message',to_jsonb(m),'mailbox',to_jsonb(b),'subject',t.subject,'references',t.provider_conversation,'reply_provider',(SELECT provider_id FROM public.uni_mail_messages WHERE thread_id=t.id AND direction='inbound' AND provider_id IS NOT NULL ORDER BY provider_at DESC NULLS LAST LIMIT 1));END $$;
CREATE FUNCTION public.finish_uni_mail_send(p_message uuid,p_accepted boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;BEGIN
 UPDATE public.uni_mail_messages SET state=CASE WHEN p_accepted THEN 'accepted' ELSE 'delivery_unknown' END WHERE id=p_message AND state='sending' RETURNING thread_id INTO t;
 IF t IS NULL THEN RAISE EXCEPTION 'Message not sending';END IF;
 INSERT INTO public.uni_mail_events(thread_id,event_type,details) VALUES(t,CASE WHEN p_accepted THEN 'provider_accepted_not_delivery_confirmed' ELSE 'delivery_needs_review' END,jsonb_build_object('message_id',p_message));END $$;
REVOKE ALL ON FUNCTION public.ingest_uni_mail(uuid,text,text,text,text,text[],text[],text,text,timestamptz,boolean),public.claim_uni_mail_send(uuid,text),public.finish_uni_mail_send(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_uni_mail(uuid,text,text,text,text,text[],text[],text,text,timestamptz,boolean),public.claim_uni_mail_send(uuid,text),public.finish_uni_mail_send(uuid,boolean) TO service_role;
CREATE FUNCTION public.audit_uni_mail_ai(p_thread uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.uni_mail_thread_access(p_thread) THEN RAISE EXCEPTION 'Thread access required';END IF;
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type) VALUES(p_thread,auth.uid(),'omniqora_assistance_requested');END $$;
REVOKE ALL ON FUNCTION public.audit_uni_mail_ai(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.audit_uni_mail_ai(uuid) TO authenticated;
CREATE FUNCTION public.uni_mail_member_directory() RETURNS TABLE(mailbox_id uuid,user_id uuid,can_send boolean,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT m.mailbox_id,m.user_id,m.can_send,p.full_name FROM public.uni_mail_members m JOIN public.uni_mailboxes b ON b.id=m.mailbox_id JOIN public.profiles p ON p.user_id=m.user_id AND p.tenant_id=b.tenant_id WHERE public.uni_mail_access(m.mailbox_id)
$$;
REVOKE ALL ON FUNCTION public.uni_mail_member_directory() FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.uni_mail_member_directory() TO authenticated;
CREATE TABLE public.uni_mailbox_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,mailbox_id uuid NOT NULL REFERENCES public.uni_mailboxes(id),actor_id uuid,event_type text NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.uni_mailbox_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.uni_mailbox_events FROM PUBLIC,anon,authenticated;GRANT SELECT ON public.uni_mailbox_events TO authenticated;
CREATE POLICY "mailbox config audit admin" ON public.uni_mailbox_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.uni_mailboxes b WHERE b.id=mailbox_id AND public.can_manage_unipathway_microsoft(b.tenant_id)));
CREATE FUNCTION public.audit_uni_mailbox_config() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b uuid;BEGIN
 IF TG_TABLE_NAME='uni_mailboxes' THEN b:=NEW.id;ELSE b:=coalesce(NEW.mailbox_id,OLD.mailbox_id);END IF;
 INSERT INTO public.uni_mailbox_events(mailbox_id,actor_id,event_type,details) VALUES(b,auth.uid(),TG_TABLE_NAME||'_'||lower(TG_OP),jsonb_build_object('before',CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,'after',CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END));RETURN coalesce(NEW,OLD);END $$;
REVOKE ALL ON FUNCTION public.audit_uni_mailbox_config() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER uni_mailbox_audit AFTER INSERT OR UPDATE ON public.uni_mailboxes FOR EACH ROW EXECUTE FUNCTION public.audit_uni_mailbox_config();
CREATE TRIGGER uni_mail_member_audit AFTER INSERT OR UPDATE OR DELETE ON public.uni_mail_members FOR EACH ROW EXECUTE FUNCTION public.audit_uni_mailbox_config();
CREATE FUNCTION public.remind_uni_mail_tasks(p_tenant uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;BEGIN
 INSERT INTO public.uni_mail_alerts(thread_id,user_id,title)
 SELECT t.thread_id,t.assigned_to,'Overdue task: '||left(t.title,150) FROM public.uni_mail_tasks t JOIN public.uni_mail_threads c ON c.id=t.thread_id JOIN public.uni_mailboxes b ON b.id=c.mailbox_id
 WHERE b.tenant_id=p_tenant AND t.status<>'completed' AND t.due_at<now() AND EXISTS(SELECT 1 FROM public.uni_mail_members m WHERE m.mailbox_id=b.id AND m.user_id=t.assigned_to)
 AND NOT EXISTS(SELECT 1 FROM public.uni_mail_alerts a WHERE a.thread_id=t.thread_id AND a.user_id=t.assigned_to AND a.title='Overdue task: '||left(t.title,150) AND a.created_at>=date_trunc('day',now()));
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END $$;
REVOKE ALL ON FUNCTION public.remind_uni_mail_tasks(uuid) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.remind_uni_mail_tasks(uuid) TO service_role;
CREATE POLICY "comms anonymous isolation" ON storage.objects AS RESTRICTIVE FOR ALL TO anon USING(bucket_id<>'unipathway-comms') WITH CHECK(bucket_id<>'unipathway-comms');

CREATE FUNCTION public.audit_uni_mail_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) VALUES(NEW.thread_id,NEW.uploaded_by,CASE WHEN NEW.uploaded_by IS NULL THEN 'provider_document_imported' ELSE 'document_uploaded' END,jsonb_build_object('document_id',NEW.id,'name',NEW.name));RETURN NEW;END $$;
REVOKE ALL ON FUNCTION public.audit_uni_mail_document() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER uni_mail_document_audit AFTER INSERT ON public.uni_mail_documents FOR EACH ROW EXECUTE FUNCTION public.audit_uni_mail_document();

CREATE FUNCTION public.cancel_uni_mail_draft(p_message uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;BEGIN
 UPDATE public.uni_mail_messages SET state='cancelled' WHERE id=p_message AND state IN ('draft','queued') AND public.uni_mail_thread_access(thread_id,true) RETURNING thread_id INTO t;
 IF t IS NULL THEN RAISE EXCEPTION 'Only an authorised unsent draft or queued email can be cancelled';END IF;
 INSERT INTO public.uni_mail_events(thread_id,actor_id,event_type,details) VALUES(t,auth.uid(),'email_cancelled',jsonb_build_object('message_id',p_message));END $$;
REVOKE ALL ON FUNCTION public.cancel_uni_mail_draft(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.cancel_uni_mail_draft(uuid) TO authenticated;
