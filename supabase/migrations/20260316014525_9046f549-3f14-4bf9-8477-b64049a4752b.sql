
-- 1. CRITICAL: Remove dangerous self-insert role policy, replace with restricted one
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- Only allow inserting student/agent/centre_director roles (registration roles)
CREATE POLICY "Users can self-assign registration roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('student'::app_role, 'agent'::app_role, 'centre_director'::app_role)
);

-- 2. Fix conversation_participants: restrict joining to same-tenant conversations
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

CREATE POLICY "Users can join tenant conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.tenant_id IS NULL OR c.tenant_id = get_user_tenant_id(auth.uid()))
  )
);

-- 3. Fix notifications insert: restrict non-staff to self-only
DROP POLICY IF EXISTS "Staff insert notifications" ON public.notifications;

CREATE POLICY "Staff insert notifications for tenant"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  )
);

-- 4. Restrict public tenant view to non-sensitive columns via a view
CREATE OR REPLACE VIEW public.tenants_public AS
SELECT id, name, slug, logo_url, primary_color, accent_color, brand_name, status
FROM public.tenants
WHERE status = 'active';
