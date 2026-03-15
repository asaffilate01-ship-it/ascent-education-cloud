
-- Fix the overly permissive INSERT policy on profiles
-- The trigger handles profile creation, so we restrict to service role only
DROP POLICY "System can insert profiles" ON public.profiles;

-- Allow the trigger (which runs as SECURITY DEFINER) to insert
-- and allow users to insert their own profile as fallback
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
