-- Provider-neutral Pakistan payment orchestration.
create table if not exists public.payment_checkout_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_id uuid not null, allocation_id uuid not null,
 provider_key text not null, rail text not null, provider_session_reference text, amount_pkr numeric not null,
 status text not null default 'created' check(status in ('created','pending','authorised','paid','failed','expired','cancelled','refunded')),
 idempotency_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(provider_key,idempotency_key)
);
create table if not exists public.payment_settlements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, checkout_session_id uuid references public.payment_checkout_sessions(id),
 provider_key text not null, provider_transaction_reference text not null, amount_pkr numeric not null, settled_at timestamptz,
 status text not null default 'pending', reconciliation_reference text, metadata jsonb not null default '{}'::jsonb,
 unique(provider_key,provider_transaction_reference)
);
alter table public.payment_checkout_sessions enable row level security; alter table public.payment_settlements enable row level security;
create policy "checkout own tenant finance" on public.payment_checkout_sessions for select to authenticated using(public.same_tenant(tenant_id));
create policy "settlements finance" on public.payment_settlements for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
