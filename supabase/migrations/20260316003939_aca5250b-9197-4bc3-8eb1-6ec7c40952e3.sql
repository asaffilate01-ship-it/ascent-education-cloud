
-- Drop the overly permissive policy
DROP POLICY "Users can create conversations" ON public.conversations;

-- Replace with tenant-scoped policy
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()));
