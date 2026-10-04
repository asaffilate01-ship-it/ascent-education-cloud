-- Omniqora Education phase 2: interventions and permission-aware knowledge index.
create table if not exists public.omniqora_interventions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, student_id uuid not null, intelligence_id uuid references public.omniqora_student_intelligence(id),
 intervention_type text not null, priority text not null default 'normal', title text not null, rationale text,
 recommended_actions jsonb not null default '[]'::jsonb, assigned_to uuid, status text not null default 'open',
 human_decision text, human_notes text, due_at timestamptz, resolved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.omniqora_knowledge_documents (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, source_type text not null, source_id uuid, title text not null,
 qualification_route text, course_id uuid, module_id uuid, visibility text not null default 'student',
 version text, approval_status text not null default 'draft', content_reference text, embedding_reference text,
 metadata jsonb not null default '{}'::jsonb, indexed_at timestamptz, unique(tenant_id,source_type,source_id,version)
);
create table if not exists public.omniqora_knowledge_edges (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, from_type text not null, from_id uuid not null,
 relation text not null, to_type text not null, to_id uuid not null, metadata jsonb not null default '{}'::jsonb,
 unique(tenant_id,from_type,from_id,relation,to_type,to_id)
);
alter table public.omniqora_interventions enable row level security; alter table public.omniqora_knowledge_documents enable row level security; alter table public.omniqora_knowledge_edges enable row level security;
create policy "interventions academic" on public.omniqora_interventions for select to authenticated using(public.same_tenant(tenant_id) and public.is_academic_manager());
create policy "knowledge approved scoped" on public.omniqora_knowledge_documents for select to authenticated using(public.same_tenant(tenant_id) and approval_status='approved' and (visibility='student' or public.is_academic_manager()));
create policy "knowledge edges tenant" on public.omniqora_knowledge_edges for select to authenticated using(public.same_tenant(tenant_id));
