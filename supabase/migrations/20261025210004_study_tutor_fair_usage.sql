create table public.study_tutor_usage (
 user_id uuid primary key, usage_day date not null, daily_count integer not null default 0,
 minute_bucket timestamptz not null, minute_count integer not null default 0
);
alter table public.study_tutor_usage enable row level security;
revoke all on public.study_tutor_usage from public,anon,authenticated;
grant all on public.study_tutor_usage to service_role;
create function public.consume_study_tutor_quota(p_user uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.study_tutor_usage; d date; m timestamptz;
begin
 if p_user is null then raise exception 'User required'; end if;
 d:=(clock_timestamp() at time zone 'Asia/Karachi')::date;
 m:=date_trunc('minute',clock_timestamp());
 insert into public.study_tutor_usage(user_id,usage_day,minute_bucket) values(p_user,d,m) on conflict do nothing;
 select * into r from public.study_tutor_usage where user_id=p_user for update;
 if r.usage_day<>d then r.daily_count:=0;end if;
 if r.minute_bucket<>m then r.minute_count:=0;end if;
 if r.daily_count>=50 then return jsonb_build_object('allowed',false,'reason','day','remaining',0);end if;
 if r.minute_count>=5 then return jsonb_build_object('allowed',false,'reason','minute','remaining',50-r.daily_count);end if;
 update public.study_tutor_usage set usage_day=d,daily_count=r.daily_count+1,minute_bucket=m,minute_count=r.minute_count+1 where user_id=p_user;
 return jsonb_build_object('allowed',true,'remaining',49-r.daily_count);
end $$;
revoke all on function public.consume_study_tutor_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_study_tutor_quota(uuid) to service_role;
