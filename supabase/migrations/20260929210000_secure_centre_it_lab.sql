-- Secure flexible centre IT lab: laptop inventory, secure storage, checkout/setup/return and lab reservations.
create table if not exists public.centre_it_assets (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, asset_tag text not null, serial_reference text, device_type text not null default 'laptop',
 make_model text, status text not null default 'secured' check(status in ('secured','reserved','issued','in_lab','quarantine','repair','retired','lost')),
 secure_location text not null, assigned_room text, last_inventory_at timestamptz, disk_encryption_verified boolean not null default false,
 endpoint_management_status text, metadata jsonb not null default '{}'::jsonb, unique(tenant_id,asset_tag)
);
create table if not exists public.centre_it_lab_reservations (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, class_run_id uuid references public.lab_class_runs(id),
 module_id uuid references public.modules(id), room_reference text not null, starts_at timestamptz not null, ends_at timestamptz not null,
 laptop_count integer not null, requested_by uuid not null, approved_by uuid, status text not null default 'requested'
);
create table if not exists public.centre_it_asset_movements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, asset_id uuid not null references public.centre_it_assets(id),
 reservation_id uuid references public.centre_it_lab_reservations(id), movement text not null check(movement in ('checkout','room_setup','student_issue','student_return','room_clear','secure_return','quarantine','repair_send','repair_return')),
 actor_user_id uuid not null, student_user_id uuid, room_reference text, condition_notes text, occurred_at timestamptz not null default now()
);
alter table public.centre_it_assets enable row level security; alter table public.centre_it_lab_reservations enable row level security; alter table public.centre_it_asset_movements enable row level security;
create policy "it assets privileged read" on public.centre_it_assets for select to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
create policy "it reservations academic read" on public.centre_it_lab_reservations for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "it movements privileged read" on public.centre_it_asset_movements for select to authenticated using(public.same_tenant(tenant_id) and (public.is_academic_manager() or public.has_role(auth.uid(),'centre_director'::app_role) or public.has_role(auth.uid(),'superadmin'::app_role)));
revoke update, delete on public.centre_it_asset_movements from authenticated;
