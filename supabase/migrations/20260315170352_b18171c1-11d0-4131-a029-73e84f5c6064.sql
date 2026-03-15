
-- Assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  module_id UUID REFERENCES public.modules(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Report',
  max_marks INTEGER NOT NULL DEFAULT 100,
  word_count TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff manage assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader'))
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  assignment_id UUID REFERENCES public.assignments(id) NOT NULL,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  file_url TEXT,
  word_count INTEGER,
  plagiarism_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  grade INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Staff manage submissions"
  ON public.submissions FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'iqa_officer'))
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Students insert own submissions"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  type TEXT NOT NULL DEFAULT 'direct',
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users see own participations"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation members see messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users send messages to own conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Updated_at triggers
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
