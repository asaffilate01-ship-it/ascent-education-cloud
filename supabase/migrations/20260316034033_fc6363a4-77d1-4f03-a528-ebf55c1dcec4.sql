
-- Need pgcrypto extension for crypt/gen_salt
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.seed_dev_user(
  _email text,
  _password text,
  _full_name text,
  _role app_role,
  _tenant_slug text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;
  
  IF _user_id IS NULL THEN
    _user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, 
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    ) VALUES (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      _email,
      extensions.crypt(_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', _full_name),
      'authenticated',
      'authenticated',
      ''
    );
    
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      _user_id, _user_id, _email,
      jsonb_build_object('sub', _user_id, 'email', _email),
      'email', now(), now(), now()
    );
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (_user_id, _full_name, _email)
  ON CONFLICT (user_id) DO NOTHING;
  
  IF _tenant_slug IS NOT NULL THEN
    SELECT id INTO _tenant_id FROM public.tenants WHERE slug = _tenant_slug;
    UPDATE public.profiles SET tenant_id = _tenant_id WHERE user_id = _user_id;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (_user_id, _role, _tenant_id)
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT public.seed_dev_user('dev.superadmin@educloud.test', 'DevTest123!', 'Dev SuperAdmin', 'superadmin');
SELECT public.seed_dev_user('dev.director@educloud.test', 'DevTest123!', 'Dev Director', 'centre_director', 'edupathway');
SELECT public.seed_dev_user('dev.admissions@educloud.test', 'DevTest123!', 'Dev Admissions', 'admissions_admin', 'edupathway');
SELECT public.seed_dev_user('dev.lecturer@educloud.test', 'DevTest123!', 'Dev Lecturer', 'lecturer', 'edupathway');
SELECT public.seed_dev_user('dev.student@educloud.test', 'DevTest123!', 'Dev Student', 'student', 'edupathway');
SELECT public.seed_dev_user('dev.finance@educloud.test', 'DevTest123!', 'Dev Finance', 'finance_officer', 'edupathway');
SELECT public.seed_dev_user('dev.qa@educloud.test', 'DevTest123!', 'Dev QA Officer', 'iqa_officer', 'edupathway');
SELECT public.seed_dev_user('dev.exams@educloud.test', 'DevTest123!', 'Dev Exams', 'exams_officer', 'edupathway');
SELECT public.seed_dev_user('dev.marketing@educloud.test', 'DevTest123!', 'Dev Marketing', 'marketing_officer', 'edupathway');
SELECT public.seed_dev_user('dev.agent@educloud.test', 'DevTest123!', 'Dev Agent', 'agent', 'edupathway');
SELECT public.seed_dev_user('dev.programme@educloud.test', 'DevTest123!', 'Dev Programme Lead', 'programme_leader', 'edupathway');
SELECT public.seed_dev_user('dev.unipartner@educloud.test', 'DevTest123!', 'Dev Uni Partner', 'university_partner', 'edupathway');
SELECT public.seed_dev_user('dev.employer@educloud.test', 'DevTest123!', 'Dev Employer', 'employer_partner', 'edupathway');

DROP FUNCTION public.seed_dev_user;
