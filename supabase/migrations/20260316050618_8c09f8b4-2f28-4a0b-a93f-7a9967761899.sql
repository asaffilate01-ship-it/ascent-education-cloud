
-- 1. Re-create the auth trigger that was missing
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Seed a tenant so dev users have something to attach to
INSERT INTO public.tenants (name, slug, status, plan, primary_color, accent_color, brand_name)
VALUES ('EduPathway College', 'edupathway', 'active', 'professional', '#8B1538', '#D4A853', 'EduPathway')
ON CONFLICT (slug) DO NOTHING;

-- 3. Re-seed dev users with proper tenant
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  _tenant_id uuid;
  _accounts jsonb[] := ARRAY[
    '{"email":"dev.superadmin@educloud.test","name":"Dev SuperAdmin","role":"superadmin","tenant":false}'::jsonb,
    '{"email":"dev.director@educloud.test","name":"Dev Director","role":"centre_director","tenant":true}'::jsonb,
    '{"email":"dev.admissions@educloud.test","name":"Dev Admissions","role":"admissions_admin","tenant":true}'::jsonb,
    '{"email":"dev.lecturer@educloud.test","name":"Dev Lecturer","role":"lecturer","tenant":true}'::jsonb,
    '{"email":"dev.student@educloud.test","name":"Dev Student","role":"student","tenant":true}'::jsonb,
    '{"email":"dev.finance@educloud.test","name":"Dev Finance","role":"finance_officer","tenant":true}'::jsonb,
    '{"email":"dev.qa@educloud.test","name":"Dev QA Officer","role":"iqa_officer","tenant":true}'::jsonb,
    '{"email":"dev.exams@educloud.test","name":"Dev Exams","role":"exams_officer","tenant":true}'::jsonb,
    '{"email":"dev.marketing@educloud.test","name":"Dev Marketing","role":"marketing_officer","tenant":true}'::jsonb,
    '{"email":"dev.agent@educloud.test","name":"Dev Agent","role":"agent","tenant":true}'::jsonb,
    '{"email":"dev.programme@educloud.test","name":"Dev Programme Lead","role":"programme_leader","tenant":true}'::jsonb,
    '{"email":"dev.unipartner@educloud.test","name":"Dev Uni Partner","role":"university_partner","tenant":true}'::jsonb,
    '{"email":"dev.employer@educloud.test","name":"Dev Employer","role":"employer_partner","tenant":true}'::jsonb
  ];
  _acc jsonb;
  _uid uuid;
  _tid uuid;
BEGIN
  SELECT id INTO _tenant_id FROM public.tenants WHERE slug = 'edupathway';

  FOREACH _acc SLICE 0 IN ARRAY _accounts LOOP
    -- Check if user exists
    SELECT id INTO _uid FROM auth.users WHERE email = _acc->>'email';
    
    IF _uid IS NULL THEN
      _uid := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        aud, role, confirmation_token
      ) VALUES (
        _uid, '00000000-0000-0000-0000-000000000000',
        _acc->>'email',
        extensions.crypt('DevTest123!', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', _acc->>'name'),
        'authenticated', 'authenticated', ''
      );
      
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (_uid, _uid, _acc->>'email', jsonb_build_object('sub', _uid, 'email', _acc->>'email'), 'email', now(), now(), now());
    END IF;

    -- Ensure profile exists
    _tid := CASE WHEN (_acc->>'tenant')::boolean THEN _tenant_id ELSE NULL END;
    
    INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
    VALUES (_uid, _acc->>'name', _acc->>'email', _tid)
    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, full_name = EXCLUDED.full_name;

    -- Ensure role exists
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_uid, (_acc->>'role')::app_role, _tid)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
