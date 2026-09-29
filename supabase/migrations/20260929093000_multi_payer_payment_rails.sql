-- Multi-payer, multi-rail Pakistan education payments.
alter table public.education_orders drop constraint if exists education_orders_purchaser_type_check;
alter table public.education_orders add constraint education_orders_purchaser_type_check check(purchaser_type in ('student','guardian','employer','government','donor','ngo','bank_finance','sponsor','mixed'));

create table if not exists public.education_payment_allocations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_id uuid not null references public.education_orders(id) on delete cascade,
 payer_type text not null check(payer_type in ('student','guardian','employer','government','donor','ngo','bank_finance','sponsor')),
 payer_user_id uuid, payer_organisation_id uuid, amount_pkr numeric not null check(amount_pkr>=0),
 status text not null default 'due' check(status in ('due','pending','authorised','paid','failed','refunded','waived')), due_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.education_payment_transactions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_id uuid not null references public.education_orders(id) on delete cascade,
 allocation_id uuid references public.education_payment_allocations(id), payment_rail text not null check(payment_rail in ('bank_transfer','bank_counter','card','mobile_wallet','payment_gateway','government_claim','employer_invoice','cash_deposit','other')),
 provider text, provider_reference text, bank_reference text, amount_pkr numeric not null, currency text not null default 'PKR',
 status text not null default 'initiated' check(status in ('initiated','pending','authorised','settled','failed','reversed','refunded')),
 initiated_at timestamptz not null default now(), settled_at timestamptz, metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.payment_reconciliation_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, transaction_id uuid not null references public.education_payment_transactions(id),
 source text not null, external_reference text, matched boolean not null default false, reconciled_by uuid, reconciled_at timestamptz, notes text, created_at timestamptz not null default now()
);
alter table public.education_payment_allocations enable row level security; alter table public.education_payment_transactions enable row level security; alter table public.payment_reconciliation_events enable row level security;
create policy "payment allocations purchaser finance read" on public.education_payment_allocations for select to authenticated using(public.same_tenant(tenant_id) and (payer_user_id=auth.uid() or public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "payment transactions purchaser finance read" on public.education_payment_transactions for select to authenticated using(public.same_tenant(tenant_id) and (exists(select 1 from public.education_payment_allocations a where a.id=allocation_id and a.payer_user_id=auth.uid()) or public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "reconciliation finance read" on public.payment_reconciliation_events for select to authenticated using(public.same_tenant(tenant_id) and (public.has_role(auth.uid(),'finance_officer'::app_role) or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
