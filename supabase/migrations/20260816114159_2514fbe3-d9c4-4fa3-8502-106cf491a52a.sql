GRANT SELECT ON public.programmes TO anon;
GRANT SELECT ON public.modules TO anon;
GRANT SELECT ON public.partner_universities TO anon;

CREATE POLICY "Public can view active programmes"
  ON public.programmes FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "Public can view active modules"
  ON public.modules FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "Public can view active partner universities"
  ON public.partner_universities FOR SELECT TO anon
  USING (status = 'active');