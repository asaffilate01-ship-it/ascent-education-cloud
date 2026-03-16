
-- Fix conversation_participants: allow authenticated users to INSERT
CREATE POLICY "Users can join conversations"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix conversations: allow authenticated users to INSERT
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to UPDATE conversations they participate in
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_participants.conversation_id = conversations.id
  AND conversation_participants.user_id = auth.uid()
));
