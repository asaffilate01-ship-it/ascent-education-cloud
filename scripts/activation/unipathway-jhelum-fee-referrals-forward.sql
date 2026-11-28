-- Jhelum student-fee commission foundation: SOURCE ONLY, not activated.
-- NEVER apply to Dishbee or replay historical migrations on live UniPathway.
-- Keep staff identities, signed commercial rates and agreements in a private database.
-- Three Admin/Admissions posts are staffing targets, not database enrolments.
-- Prerequisites: public.tenants/profiles, public.same_tenant and public.has_role.
create table if not exists public.centre_fee_referrers (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 user_id uuid,
 display_name text not null,
 designation text not null check(designation in ('centre_representative','referrer')),
 direct_bps int not null check(direct_bps between 0 and 10000),
 centre_bps int not null default 0 check(centre_bps between 0 and 10000),
 contract_ref text not null check(length(btrim(contract_ref))>=4),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(tenant_id,id)
);
create unique index if not exists one_centre_fee_representative
 on public.centre_fee_referrers(tenant_id)
 where designation='centre_representative' and active;
create table if not exists public.centre_fee_attributions (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 student_user_id uuid not null,
 referrer_id uuid not null,
 evidence_ref text not null check(length(btrim(evidence_ref))>=4),
 approved_by uuid not null,
 locked_at timestamptz not null default now(),
 unique(tenant_id,student_user_id),
 foreign key(tenant_id,referrer_id) references public.centre_fee_referrers(tenant_id,id)
);
create table if not exists public.centre_fee_settlements (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 student_user_id uuid not null,
 payment_system text not null,
 source_payment_id text not null,
 kind text not null check(kind in ('settlement','refund')),
 original_event_id uuid references public.centre_fee_settlements(id),
 eligible_gross_pkr numeric(16,2) not null check(eligible_gross_pkr>0),
 verified_at timestamptz not null,
 verification_ref text not null check(length(btrim(verification_ref))>=4),
 created_at timestamptz not null default now(),
 unique(tenant_id,payment_system,source_payment_id),
 unique(tenant_id,id),
 check((kind='settlement' and original_event_id is null) or
       (kind='refund' and original_event_id is not null))
);
create table if not exists public.centre_fee_commission_lines (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 settlement_id uuid not null,
 payee_referrer_id uuid not null,
 kind text not null check(kind in ('direct','centre_share')),
 bps int not null check(bps between 0 and 10000),
 signed_pkr numeric(16,2) not null check(signed_pkr<>0),
 status text not null default 'pending_owner_approval'
  check(status in ('pending_owner_approval','approved','paid','disputed')),
 created_at timestamptz not null default now(),
 unique(tenant_id,settlement_id,payee_referrer_id,kind),
 foreign key(tenant_id,settlement_id) references public.centre_fee_settlements(tenant_id,id),
 foreign key(tenant_id,payee_referrer_id) references public.centre_fee_referrers(tenant_id,id)
);
create index if not exists centre_fee_lines_review on public.centre_fee_commission_lines(tenant_id,status,created_at desc);
create index if not exists centre_fee_payments_month on public.centre_fee_settlements(tenant_id,verified_at desc);

alter table public.centre_fee_referrers enable row level security;
alter table public.centre_fee_attributions enable row level security;
alter table public.centre_fee_settlements enable row level security;
alter table public.centre_fee_commission_lines enable row level security;
revoke all on public.centre_fee_referrers,public.centre_fee_attributions,
 public.centre_fee_settlements,public.centre_fee_commission_lines from anon,authenticated;
grant select on public.centre_fee_referrers,public.centre_fee_attributions,
 public.centre_fee_settlements,public.centre_fee_commission_lines to authenticated;
grant all on public.centre_fee_referrers,public.centre_fee_attributions,
 public.centre_fee_settlements,public.centre_fee_commission_lines to service_role;

create policy "centre fee referrer scoped read" on public.centre_fee_referrers for select to authenticated
 using (public.same_tenant(tenant_id) and
  (public.has_role(auth.uid(),'finance_officer'::public.app_role)
   or public.has_role(auth.uid(),'centre_director'::public.app_role)
   or public.has_role(auth.uid(),'superadmin'::public.app_role)
   or user_id=auth.uid()));
create policy "centre fee attribution finance only" on public.centre_fee_attributions for select to authenticated
 using (public.same_tenant(tenant_id) and
  (public.has_role(auth.uid(),'finance_officer'::public.app_role)
   or public.has_role(auth.uid(),'centre_director'::public.app_role)
   or public.has_role(auth.uid(),'superadmin'::public.app_role)));
create policy "centre fee settlement finance only" on public.centre_fee_settlements for select to authenticated
 using (public.same_tenant(tenant_id) and
  (public.has_role(auth.uid(),'finance_officer'::public.app_role)
   or public.has_role(auth.uid(),'centre_director'::public.app_role)
   or public.has_role(auth.uid(),'superadmin'::public.app_role)));
create policy "centre fee lines finance or own approved" on public.centre_fee_commission_lines for select to authenticated
 using (public.same_tenant(tenant_id) and
  (public.has_role(auth.uid(),'finance_officer'::public.app_role)
   or public.has_role(auth.uid(),'centre_director'::public.app_role)
   or public.has_role(auth.uid(),'superadmin'::public.app_role)
   or (status in ('approved','paid') and exists(
    select 1 from public.centre_fee_referrers r
    where r.id=payee_referrer_id and r.tenant_id=centre_fee_commission_lines.tenant_id
      and r.user_id=auth.uid()))));

-- Immutable ledger, locked attribution, and no retrospective commission claim.
create or replace function public.centre_fee_guard_attribution()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if TG_OP<>'INSERT' then
  raise exception 'Referral attribution locked; changes require separately audited owner correction' using errcode='42501';
 end if;
 if not exists(select 1 from public.profiles p where p.user_id=NEW.student_user_id and p.tenant_id=NEW.tenant_id) then
  raise exception 'Student not verified in this centre' using errcode='23514';
 end if;
 if not exists(select 1 from public.centre_fee_referrers r where r.id=NEW.referrer_id and r.tenant_id=NEW.tenant_id and r.active) then
  raise exception 'Approved centre referrer required' using errcode='23514';
 end if;
 if exists(select 1 from public.centre_fee_settlements s where s.tenant_id=NEW.tenant_id and s.student_user_id=NEW.student_user_id) then
  raise exception 'No referral can be added after settlement' using errcode='42501';
 end if;
 return NEW;
end $$;
drop trigger if exists centre_fee_attribution_guard on public.centre_fee_attributions;
create trigger centre_fee_attribution_guard before insert or update or delete
 on public.centre_fee_attributions for each row execute function public.centre_fee_guard_attribution();
revoke all on function public.centre_fee_guard_attribution() from public,anon,authenticated;

create or replace function public.centre_fee_guard_settlement()
returns trigger language plpgsql security invoker set search_path=public as $$
declare previous public.centre_fee_settlements;
declare already_refunded numeric(16,2);
begin
 if TG_OP<>'INSERT' then raise exception 'Settlements are immutable; append another event' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles p where p.user_id=NEW.student_user_id and p.tenant_id=NEW.tenant_id) then
  raise exception 'Student not verified in this centre' using errcode='23514';
 end if;
 if NEW.kind='refund' then
  select * into previous from public.centre_fee_settlements s
   where s.id=NEW.original_event_id and s.tenant_id=NEW.tenant_id and s.kind='settlement' for update;
  if previous.id is null or previous.student_user_id<>NEW.student_user_id then
   raise exception 'Refund must match original same-student settlement' using errcode='23514';
  end if;
  select coalesce(sum(s.eligible_gross_pkr),0) into already_refunded
   from public.centre_fee_settlements s where s.kind='refund' and s.original_event_id=previous.id;
  if already_refunded+NEW.eligible_gross_pkr>previous.eligible_gross_pkr then
   raise exception 'Refund exceeds original settlement' using errcode='23514';
  end if;
 end if;
 return NEW;
end $$;
drop trigger if exists centre_fee_settlement_guard on public.centre_fee_settlements;
create trigger centre_fee_settlement_guard before insert or update or delete
 on public.centre_fee_settlements for each row execute function public.centre_fee_guard_settlement();
revoke all on function public.centre_fee_guard_settlement() from public,anon,authenticated;

-- Service-role only. A receipt adapter must VERIFY actual settlement first.
-- Idempotency: unique(tenant,receipt,payee,kind) with ON CONFLICT DO NOTHING.
-- A refund uses exactly the original accrual rate for a linked negative entry.
create or replace function public.accrue_centre_fee_commission(_event_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare e public.centre_fee_settlements;
declare mgr public.centre_fee_referrers;
declare ref public.centre_fee_referrers;
declare old_line record;
declare amount numeric(16,2);
declare rows_created integer:=0;
begin
 select * into e from public.centre_fee_settlements where id=_event_id for update;
 if e.id is null then raise exception 'Verified fee event not found' using errcode='22023'; end if;
 if e.kind='refund' then
  if not exists(select 1 from public.centre_fee_commission_lines
    where settlement_id=e.original_event_id and tenant_id=e.tenant_id) then
    raise exception 'Original settlement must be accrued before refund adjustment'
      using errcode='22023';
  end if;
  for old_line in select payee_referrer_id,kind,bps from public.centre_fee_commission_lines
     where settlement_id=e.original_event_id and tenant_id=e.tenant_id loop
   amount:=-round(e.eligible_gross_pkr*old_line.bps/10000,2);
   if amount<>0 then
    insert into public.centre_fee_commission_lines(tenant_id,settlement_id,payee_referrer_id,kind,bps,signed_pkr)
    values(e.tenant_id,e.id,old_line.payee_referrer_id,old_line.kind,old_line.bps,amount)
    on conflict (tenant_id,settlement_id,payee_referrer_id,kind) do nothing;
    if found then rows_created:=rows_created+1; end if;
   end if;
  end loop;
  return rows_created;
 end if;
 select * into mgr from public.centre_fee_referrers
  where tenant_id=e.tenant_id and active and designation='centre_representative';
 if mgr.id is null then raise exception 'Owner must configure one centre representative first' using errcode='22023'; end if;
 select r.* into ref from public.centre_fee_attributions a
 join public.centre_fee_referrers r on r.id=a.referrer_id and r.tenant_id=a.tenant_id
 where a.student_user_id=e.student_user_id and a.tenant_id=e.tenant_id;
 if ref.id=mgr.id then
  amount:=round(e.eligible_gross_pkr*mgr.direct_bps/10000,2);
  if amount<>0 then
   insert into public.centre_fee_commission_lines(tenant_id,settlement_id,payee_referrer_id,kind,bps,signed_pkr)
   values(e.tenant_id,e.id,mgr.id,'direct',mgr.direct_bps,amount)
   on conflict(tenant_id,settlement_id,payee_referrer_id,kind) do nothing;
   if found then rows_created:=rows_created+1; end if;
  end if;
 else
  amount:=round(e.eligible_gross_pkr*mgr.centre_bps/10000,2);
  if amount<>0 then
   insert into public.centre_fee_commission_lines(tenant_id,settlement_id,payee_referrer_id,kind,bps,signed_pkr)
   values(e.tenant_id,e.id,mgr.id,'centre_share',mgr.centre_bps,amount)
   on conflict(tenant_id,settlement_id,payee_referrer_id,kind) do nothing;
   if found then rows_created:=rows_created+1; end if;
  end if;
  if ref.id is not null then
   amount:=round(e.eligible_gross_pkr*ref.direct_bps/10000,2);
   if amount<>0 then
    insert into public.centre_fee_commission_lines(tenant_id,settlement_id,payee_referrer_id,kind,bps,signed_pkr)
    values(e.tenant_id,e.id,ref.id,'direct',ref.direct_bps,amount)
    on conflict(tenant_id,settlement_id,payee_referrer_id,kind) do nothing;
    if found then rows_created:=rows_created+1; end if;
   end if;
  end if;
 end if;
 return rows_created;
end $$;
revoke all on function public.accrue_centre_fee_commission(uuid) from public,anon,authenticated;
grant execute on function public.accrue_centre_fee_commission(uuid) to service_role;

-- Activation gate:
-- 1. Confirm ONLY the live UniPathway schema/migrations, get backup, stage.
-- 2. Finance tests duplicate provider event, refund-before-accrual,
--    parallel partial refunds, RLS role isolation and owner payout workflow.
-- 3. Owner enters PRIVATE contracts/identities/rates in centre_fee_referrers.
-- 4. Admissions validates first-and-only referral assignment before payment.
-- 5. Trusted service reconciles bank/provider settlement before writing events.
-- 6. No line is a payout until separate owner approval and bank transfer.
