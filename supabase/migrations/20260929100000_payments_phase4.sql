-- Phase 4: payment instructions/webhooks, instalments, invoices and refunds.
create table if not exists public.payment_provider_configs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, provider_key text not null, display_name text not null,
 supported_rails text[] not null default '{}', enabled boolean not null default false, configuration_status text not null default 'credentials_required',
 metadata jsonb not null default '{}'::jsonb, unique(tenant_id,provider_key)
);
create table if not exists public.education_invoices (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_id uuid not null references public.education_orders(id),
 invoice_number text not null, billed_to_type text not null, billed_to_reference text, issued_at timestamptz not null default now(), due_at timestamptz,
 subtotal_pkr numeric not null, total_pkr numeric not null, status text not null default 'issued' check(status in ('draft','issued','part_paid','paid','overdue','cancelled','credited')),
 unique(tenant_id,invoice_number)
);
create table if not exists public.education_instalments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, allocation_id uuid not null references public.education_payment_allocations(id) on delete cascade,
 sequence_no integer not null, amount_pkr numeric not null, due_at timestamptz not null, status text not null default 'due' check(status in ('due','pending','paid','overdue','waived','cancelled')),
 unique(allocation_id,sequence_no)
);
create table if not exists public.education_refund_requests (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, transaction_id uuid not null references public.education_payment_transactions(id),
 requested_by uuid not null, amount_pkr numeric not null, reason text not null, status text not null default 'requested' check(status in ('requested','review','approved','rejected','processed')),
 approved_by uuid, processed_reference text, created_at timestamptz not null default now(), processed_at timestamptz
);
alter table public.payment_provider_configs enable row level security; alter table public.education_invoices enable row level security; alter table public.education_instalments enable row level security; alter table public.education_refund_requests enable row level security;
create policy "provider configs finance" on public.payment_provider_configs for all to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role))) with check(public.same_tenant(tenant_id));
create policy "invoices finance read" on public.education_invoices for select to authenticated using(public.same_tenant(tenant_id));
create policy "instalments payer finance read" on public.education_instalments for select to authenticated using(public.same_tenant(tenant_id));
create policy "refunds requester finance read" on public.education_refund_requests for select to authenticated using(public.same_tenant(tenant_id) and (requested_by=auth.uid() or public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
