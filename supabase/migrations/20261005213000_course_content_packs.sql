-- Controlled learning-content packs and publication gates.
create table if not exists public.course_content_packs (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, course_id uuid not null, module_id uuid,
 pack_type text not null check(pack_type in ('student','teacher','assessment','qa')), title text not null,
 specification_version text, content_version text not null, status text not null default 'draft' check(status in ('draft','review','approved','published','superseded')),
 author_id uuid, reviewer_id uuid, approved_by uuid, approved_at timestamptz, published_at timestamptz,
 source_references jsonb not null default '[]'::jsonb, metadata jsonb not null default '{}'::jsonb,
 unique(tenant_id,course_id,module_id,pack_type,content_version)
);
create table if not exists public.course_content_items (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, pack_id uuid not null references public.course_content_packs(id) on delete cascade,
 item_type text not null, title text not null, sequence_no integer not null default 0, content_reference text,
 learning_outcomes text[] not null default '{}', assessment_criteria text[] not null default '{}', status text not null default 'draft'
);
alter table public.course_content_packs enable row level security; alter table public.course_content_items enable row level security;
create policy "content packs scoped" on public.course_content_packs for select to authenticated using(public.same_tenant(tenant_id) and ((pack_type='student' and status='published') or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role) or public.has_role(auth.uid(),'assessor'::app_role) or public.has_role(auth.uid(),'iqa_officer'::app_role)));
create policy "content items via pack" on public.course_content_items for select to authenticated using(public.same_tenant(tenant_id) and exists(select 1 from public.course_content_packs p where p.id=pack_id and p.tenant_id=tenant_id and ((p.pack_type='student' and p.status='published') or public.is_academic_manager() or public.has_role(auth.uid(),'lecturer'::app_role) or public.has_role(auth.uid(),'assessor'::app_role) or public.has_role(auth.uid(),'iqa_officer'::app_role))));
