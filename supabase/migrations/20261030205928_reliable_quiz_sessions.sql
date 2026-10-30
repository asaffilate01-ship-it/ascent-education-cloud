-- Score authority and answer keys stay on the server. Public wrappers enforce caller identity.
CREATE SCHEMA IF NOT EXISTS unipathway_quiz;
REVOKE ALL ON SCHEMA unipathway_quiz FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA unipathway_quiz TO authenticated;
CREATE TABLE unipathway_quiz.sessions (
 attempt_id uuid PRIMARY KEY REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
 questions jsonb NOT NULL, expires_at timestamptz NOT NULL,
 pass_percentage integer NOT NULL, show_results boolean NOT NULL
);
REVOKE ALL ON unipathway_quiz.sessions FROM PUBLIC,anon,authenticated;
ALTER TABLE unipathway_quiz.sessions ENABLE ROW LEVEL SECURITY;
-- Remove legacy permissive policies, including client-authored marks.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('quizzes','quiz_questions','quiz_attempts') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,r.tablename);
 END LOOP;
END $$;
CREATE POLICY quiz_staff ON public.quizzes FOR ALL TO authenticated
 USING (unipathway_acl.module_access(module_id,tenant_id,true))
 WITH CHECK (unipathway_acl.module_access(module_id,tenant_id,true));
CREATE POLICY quiz_learner ON public.quizzes FOR SELECT TO authenticated
 USING (status='published' AND unipathway_acl.module_access(module_id,tenant_id,false));
CREATE POLICY quiz_question_staff ON public.quiz_questions FOR ALL TO authenticated
 USING (EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id=quiz_id AND unipathway_acl.module_access(q.module_id,q.tenant_id,true)))
 WITH CHECK (EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id=quiz_id AND unipathway_acl.module_access(q.module_id,q.tenant_id,true)));
CREATE POLICY quiz_attempt_staff ON public.quiz_attempts FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id=quiz_id AND unipathway_acl.module_access(q.module_id,q.tenant_id,true)));
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.quiz_attempts FROM anon,authenticated;

CREATE FUNCTION unipathway_quiz.start_quiz(p_quiz_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.quizzes; a public.quiz_attempts; s unipathway_quiz.sessions; snapshot jsonb; safe jsonb;
BEGIN
 SELECT * INTO q FROM public.quizzes WHERE id=p_quiz_id;
 IF auth.uid() IS NULL OR q.id IS NULL OR q.status<>'published' OR NOT unipathway_acl.module_access(q.module_id,q.tenant_id,false) THEN RAISE EXCEPTION 'Quiz unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_quiz_id::text,0));
 SELECT qa.* INTO a FROM public.quiz_attempts qa JOIN unipathway_quiz.sessions qs ON qs.attempt_id=qa.id WHERE qa.quiz_id=q.id AND qa.student_id=auth.uid() AND qa.completed_at IS NULL ORDER BY qa.started_at DESC LIMIT 1 FOR UPDATE OF qa;
 IF a.id IS NULL THEN
  IF (SELECT count(*) FROM public.quiz_attempts WHERE quiz_id=q.id AND student_id=auth.uid())>=coalesce(q.max_attempts,1) THEN RAISE EXCEPTION 'Maximum attempts reached'; END IF;
  IF q.time_limit_minutes IS NULL OR q.time_limit_minutes NOT BETWEEN 1 AND 1440 OR q.pass_percentage IS NULL OR q.pass_percentage NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Quiz settings need staff review'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.quiz_questions WHERE quiz_id=q.id) OR EXISTS(SELECT 1 FROM public.quiz_questions WHERE quiz_id=q.id AND (points IS NULL OR points NOT BETWEEN 1 AND 1000 OR btrim(correct_answer)='' OR question_type IS NULL OR (question_type='mcq' AND (jsonb_typeof(options)<>'array' OR NOT options @> jsonb_build_array(correct_answer))) OR (question_type='true_false' AND correct_answer NOT IN ('True','False')))) THEN RAISE EXCEPTION 'Quiz questions need staff review'; END IF;
  SELECT jsonb_agg(to_jsonb(qq) ORDER BY CASE WHEN q.shuffle_questions THEN random() ELSE qq.sort_order::float END,qq.id) INTO snapshot FROM public.quiz_questions qq WHERE quiz_id=q.id;
  INSERT INTO public.quiz_attempts(quiz_id,student_id,tenant_id,started_at) VALUES(q.id,auth.uid(),q.tenant_id,clock_timestamp()) RETURNING * INTO a;
  INSERT INTO unipathway_quiz.sessions VALUES(a.id,snapshot,a.started_at+make_interval(mins=>q.time_limit_minutes),q.pass_percentage,coalesce(q.show_results,false));
 END IF;
 SELECT * INTO s FROM unipathway_quiz.sessions WHERE attempt_id=a.id;
 SELECT jsonb_agg(value-'correct_answer'-'explanation') INTO safe FROM jsonb_array_elements(s.questions);
 RETURN jsonb_build_object('attempt_id',a.id,'questions',safe,'answers',a.answers,'expires_at',s.expires_at,'server_now',clock_timestamp());
END $$;

CREATE FUNCTION unipathway_quiz.answer_quiz(p_attempt_id uuid,p_answers jsonb,p_submit boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.quiz_attempts; s unipathway_quiz.sessions; q public.quizzes; item jsonb; earned integer:=0; total integer:=0; pct numeric; response jsonb;
BEGIN
 SELECT * INTO a FROM public.quiz_attempts WHERE id=p_attempt_id FOR UPDATE;
 SELECT * INTO s FROM unipathway_quiz.sessions WHERE attempt_id=p_attempt_id;
 SELECT * INTO q FROM public.quizzes WHERE id=a.quiz_id;
 IF auth.uid() IS NULL OR a.student_id IS DISTINCT FROM auth.uid() OR s.attempt_id IS NULL OR NOT unipathway_acl.module_access(q.module_id,q.tenant_id,false) THEN RAISE EXCEPTION 'Attempt unavailable'; END IF;
 IF a.completed_at IS NULL THEN
  IF p_answers IS NULL OR jsonb_typeof(p_answers)<>'object' OR octet_length(p_answers::text)>200000 THEN RAISE EXCEPTION 'Invalid answers'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_answers) e WHERE jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>4000 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.questions) AS question(value) WHERE question.value->>'id'=e.key)) THEN RAISE EXCEPTION 'Invalid answer or question'; END IF;
  -- Late network requests cannot replace previously saved answers.
  IF clock_timestamp()<=s.expires_at THEN a.answers:=p_answers;
  ELSIF NOT p_submit THEN RAISE EXCEPTION 'Time limit reached'; END IF;
  IF p_submit THEN
   FOR item IN SELECT value FROM jsonb_array_elements(s.questions) LOOP
    total:=total+(item->>'points')::integer;
    IF (item->>'question_type'='short_answer' AND lower(btrim(a.answers->>(item->>'id')))=lower(btrim(item->>'correct_answer'))) OR (item->>'question_type'<>'short_answer' AND a.answers->>(item->>'id')=item->>'correct_answer') THEN earned:=earned+(item->>'points')::integer; END IF;
   END LOOP;
   pct:=round(100.0*earned/nullif(total,0),2);
   UPDATE public.quiz_attempts SET answers=a.answers,score=earned,total_points=total,percentage=pct,passed=pct>=s.pass_percentage,completed_at=clock_timestamp(),time_spent_seconds=greatest(0,extract(epoch FROM least(clock_timestamp(),s.expires_at)-a.started_at)::integer) WHERE id=a.id RETURNING * INTO a;
  ELSE UPDATE public.quiz_attempts SET answers=a.answers WHERE id=a.id;
  END IF;
 END IF;
 response:=jsonb_build_object('attempt_id',a.id,'completed_at',a.completed_at,'saved_answers',a.answers,'results_visible',s.show_results,'expired',clock_timestamp()>s.expires_at);
 IF s.show_results AND a.completed_at IS NOT NULL THEN response:=response||jsonb_build_object('percentage',a.percentage,'score',a.score,'total_points',a.total_points,'passed',a.passed); END IF;
 RETURN response;
END $$;
CREATE FUNCTION unipathway_quiz.history() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'quiz_id',a.quiz_id,'started_at',a.started_at,'completed_at',a.completed_at,'time_spent_seconds',a.time_spent_seconds,'percentage',CASE WHEN coalesce(s.show_results,q.show_results,false) THEN a.percentage END,'score',CASE WHEN coalesce(s.show_results,q.show_results,false) THEN a.score END,'total_points',CASE WHEN coalesce(s.show_results,q.show_results,false) THEN a.total_points END,'passed',CASE WHEN coalesce(s.show_results,q.show_results,false) THEN a.passed END) ORDER BY a.started_at DESC),'[]'::jsonb)
 FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id LEFT JOIN unipathway_quiz.sessions s ON s.attempt_id=a.id
 WHERE a.student_id=auth.uid() AND unipathway_acl.module_access(q.module_id,q.tenant_id,false)
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_quiz FROM PUBLIC,anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA unipathway_quiz TO authenticated;
CREATE FUNCTION public.start_quiz_attempt(p_quiz_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT unipathway_quiz.start_quiz(p_quiz_id) $$;
CREATE FUNCTION public.save_quiz_answers(p_attempt_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT unipathway_quiz.answer_quiz(p_attempt_id,p_answers,false) $$;
CREATE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT unipathway_quiz.answer_quiz(p_attempt_id,p_answers,true) $$;
CREATE FUNCTION public.my_quiz_attempts() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT unipathway_quiz.history() $$;
REVOKE ALL ON FUNCTION public.start_quiz_attempt(uuid),public.save_quiz_answers(uuid,jsonb),public.submit_quiz_attempt(uuid,jsonb),public.my_quiz_attempts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid),public.save_quiz_answers(uuid,jsonb),public.submit_quiz_attempt(uuid,jsonb),public.my_quiz_attempts() TO authenticated;
NOTIFY pgrst,'reload schema';
