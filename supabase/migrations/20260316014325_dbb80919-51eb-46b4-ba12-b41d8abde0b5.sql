
-- Allow new users to insert their own role during registration
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- GDPR data export function
CREATE OR REPLACE FUNCTION public.export_user_data(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.user_id = _user_id),
    'roles', (SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM user_roles r WHERE r.user_id = _user_id),
    'applications', (SELECT coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb) FROM applications a WHERE a.user_id = _user_id),
    'submissions', (SELECT coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM submissions s WHERE s.student_id = _user_id),
    'attendance', (SELECT coalesce(jsonb_agg(row_to_json(ar)), '[]'::jsonb) FROM attendance_records ar WHERE ar.student_id = _user_id),
    'invoices', (SELECT coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb) FROM invoices i WHERE i.student_id = _user_id),
    'notifications', (SELECT coalesce(jsonb_agg(row_to_json(n)), '[]'::jsonb) FROM notifications n WHERE n.user_id = _user_id),
    'messages', (SELECT coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM messages m WHERE m.sender_id = _user_id),
    'exported_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- Account deletion function
CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM notifications WHERE user_id = _user_id;
  DELETE FROM messages WHERE sender_id = _user_id;
  DELETE FROM conversation_participants WHERE user_id = _user_id;
  DELETE FROM submissions WHERE student_id = _user_id;
  DELETE FROM attendance_records WHERE student_id = _user_id;
  DELETE FROM applications WHERE user_id = _user_id;
  DELETE FROM invoices WHERE student_id = _user_id;
  DELETE FROM user_roles WHERE user_id = _user_id;
  DELETE FROM profiles WHERE user_id = _user_id;
END;
$$;
