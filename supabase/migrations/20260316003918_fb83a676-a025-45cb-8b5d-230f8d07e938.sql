
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

-- Storage RLS: avatars bucket
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: submissions bucket
CREATE POLICY "Students can upload submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Staff and owner can view submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'submissions' AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR public.has_role(auth.uid(), 'lecturer')
  OR public.has_role(auth.uid(), 'centre_director')
  OR public.has_role(auth.uid(), 'iqa_officer')
));

-- Storage RLS: resources bucket (public read, staff write)
CREATE POLICY "Anyone can view resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

CREATE POLICY "Staff can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources' AND (
  public.has_role(auth.uid(), 'lecturer')
  OR public.has_role(auth.uid(), 'centre_director')
  OR public.has_role(auth.uid(), 'programme_leader')
));
