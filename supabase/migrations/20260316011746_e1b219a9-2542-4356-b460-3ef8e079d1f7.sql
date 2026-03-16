
-- Fix conversations RLS: wrong column reference
DROP POLICY IF EXISTS "Users see own conversations" ON public.conversations;

CREATE POLICY "Users see own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_participants.conversation_id = conversations.id
  AND conversation_participants.user_id = auth.uid()
));
