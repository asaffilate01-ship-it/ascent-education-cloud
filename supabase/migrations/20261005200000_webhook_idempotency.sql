-- Webhook idempotency ledger.
create table if not exists public.provider_webhook_events (
 id uuid primary key default gen_random_uuid(), provider text not null, provider_event_id text not null,
 event_type text not null, tenant_id uuid, received_at timestamptz not null default now(), processed_at timestamptz,
 status text not null default 'received' check(status in ('received','processed','failed','ignored')), error_message text,
 unique(provider,provider_event_id)
);
alter table public.provider_webhook_events enable row level security;
create policy "webhook ledger superadmin" on public.provider_webhook_events for select to authenticated using(public.has_role(auth.uid(),'superadmin'::app_role));
