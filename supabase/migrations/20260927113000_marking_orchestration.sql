-- Next academic production phase: controlled assignment intake, blind specialist marking, second-read and QA release.
alter table public.marking_allocations add column if not exists blind_reference text;
alter table public.marking_allocations add column if not exists second_reader_id uuid;
alter table public.marking_allocations add column if not exists second_read_status text check(second_read_status is null or second_read_status in ('required','allocated','agreed','disagreed','resolved'));

create table if not exists public.integrity_case_events (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, integrity_case_id uuid not null references public.integrity_cases(id) on delete cascade,
 actor_id uuid, event_type text not null, notes text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.integrity_case_events enable row level security;
create policy "integrity timeline quality read" on public.integrity_case_events for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "integrity timeline quality write" on public.integrity_case_events for insert to authenticated with check(public.same_tenant(tenant_id) and public.is_academic_manager());

create or replace function public.allocate_marker(p_attempt uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_module uuid; v_tenant uuid; v_marker uuid; v_alloc uuid;
begin
 select a.module_id,sa.tenant_id into v_module,v_tenant from public.submission_attempts sa join public.submissions s on s.id=sa.submission_id join public.assignments a on a.id=s.assignment_id where sa.id=p_attempt;
 if not public.same_tenant(v_tenant) then raise exception 'Not authorised'; end if;
 if not public.is_academic_manager() then raise exception 'Academic manager required'; end if;
 select me.marker_id into v_marker from public.marker_module_eligibility me
 left join lateral (select count(*) c from public.marking_allocations ma where ma.marker_id=me.marker_id and ma.status in ('allocated','opened','in_progress')) w on true
 where me.tenant_id=v_tenant and me.module_id=v_module and me.approved=true order by coalesce(w.c,0),me.competency_score desc nulls last limit 1;
 if v_marker is null then raise exception 'No approved specialist marker available'; end if;
 insert into public.marking_allocations(tenant_id,submission_attempt_id,marker_id,allocation_source,blind_reference)
 values(v_tenant,p_attempt,v_marker,'system','UP-'||upper(substr(replace(p_attempt::text,'-',''),1,10))) returning id into v_alloc;
 return v_alloc;
end $$;
revoke all on function public.allocate_marker(uuid) from public; grant execute on function public.allocate_marker(uuid) to authenticated;
