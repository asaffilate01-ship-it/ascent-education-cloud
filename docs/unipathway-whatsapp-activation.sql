-- REVIEW-ONLY: Do NOT apply to a connected DB without confirming it is UniPathway,
-- schema compatibility, backup, security review and live-owner approval.
-- Service-role-only ingress. No student/guardian row exposure through the Data API.
create table if not exists public.uni_whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  phone_number_id text not null,
  wa_id text not null,
  status text not null default 'open' check (status in ('open','needs_staff','closed')),
  automation_paused boolean not null default false,
  enquiry_state jsonb not null default '{"step":"language","language":"en"}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, phone_number_id, wa_id)
);
create table if not exists public.uni_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.uni_whatsapp_conversations(id) on delete cascade,
  provider_message_id text not null unique,
  direction text not null check (direction in ('inbound','outbound')),
  body_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists uni_whatsapp_messages_conversation_idx
  on public.uni_whatsapp_messages(conversation_id, created_at desc);
alter table public.uni_whatsapp_conversations enable row level security;
alter table public.uni_whatsapp_messages enable row level security;
revoke all on public.uni_whatsapp_conversations from anon, authenticated;
revoke all on public.uni_whatsapp_messages from anon, authenticated;
-- Do not add permissive policies. Access by server-side service-role only.
