-- 한번만 MVP 상태 저장소
-- 사진 원본·변환본은 이 스키마에 저장하지 않는다.

create extension if not exists pgcrypto;

create table public.buttons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  task_kind text not null check (task_kind in ('public_query', 'local_image_batch')),
  stopped_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  button_id uuid not null references public.buttons(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('DRAFT', 'PUBLISHED')),
  schema_version text not null,
  spec jsonb not null,
  review_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  unique (button_id, version)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references public.workflow_versions(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) >= 32),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.share_links(id) on delete restrict,
  workflow_version_id uuid not null references public.workflow_versions(id) on delete restrict,
  recipient_session_id text,
  idempotency_key text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null check (status in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'EMPTY', 'NEEDS_ATTENTION', 'FAILED', 'CANCELED')),
  result jsonb,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  finished_at timestamptz,
  unique (share_link_id, idempotency_key)
);

create index workflow_versions_button_id_idx on public.workflow_versions(button_id, version desc);
create index share_links_workflow_version_id_idx on public.share_links(workflow_version_id);
create index runs_workflow_version_id_idx on public.runs(workflow_version_id, created_at desc);

alter table public.buttons enable row level security;
alter table public.workflow_versions enable row level security;
alter table public.share_links enable row level security;
alter table public.runs enable row level security;

grant select, insert, update, delete on public.buttons to authenticated;
grant select, insert, update, delete on public.workflow_versions to authenticated;
grant select, insert, update, delete on public.share_links to authenticated;
grant select, insert, update, delete on public.runs to authenticated;

create policy "buttons_owner_select" on public.buttons
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "buttons_owner_insert" on public.buttons
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "buttons_owner_update" on public.buttons
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "buttons_owner_delete" on public.buttons
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "workflow_versions_owner_select" on public.workflow_versions
  for select to authenticated
  using (exists (
    select 1 from public.buttons
    where public.buttons.id = workflow_versions.button_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "workflow_versions_owner_insert" on public.workflow_versions
  for insert to authenticated
  with check (exists (
    select 1 from public.buttons
    where public.buttons.id = workflow_versions.button_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "workflow_versions_owner_update" on public.workflow_versions
  for update to authenticated
  using (exists (
    select 1 from public.buttons
    where public.buttons.id = workflow_versions.button_id
      and public.buttons.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.buttons
    where public.buttons.id = workflow_versions.button_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "workflow_versions_owner_delete" on public.workflow_versions
  for delete to authenticated
  using (exists (
    select 1 from public.buttons
    where public.buttons.id = workflow_versions.button_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "share_links_owner_select" on public.share_links
  for select to authenticated
  using (exists (
    select 1
    from public.workflow_versions
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.workflow_versions.id = share_links.workflow_version_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "share_links_owner_insert" on public.share_links
  for insert to authenticated
  with check (exists (
    select 1
    from public.workflow_versions
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.workflow_versions.id = share_links.workflow_version_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "share_links_owner_update" on public.share_links
  for update to authenticated
  using (exists (
    select 1
    from public.workflow_versions
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.workflow_versions.id = share_links.workflow_version_id
      and public.buttons.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.workflow_versions
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.workflow_versions.id = share_links.workflow_version_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "share_links_owner_delete" on public.share_links
  for delete to authenticated
  using (exists (
    select 1
    from public.workflow_versions
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.workflow_versions.id = share_links.workflow_version_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "runs_owner_select" on public.runs
  for select to authenticated
  using (exists (
    select 1
    from public.share_links
    join public.workflow_versions on public.workflow_versions.id = share_links.workflow_version_id
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.share_links.id = runs.share_link_id
      and public.buttons.owner_id = (select auth.uid())
  ));

create policy "runs_owner_insert" on public.runs
  for insert to authenticated
  with check (exists (
    select 1
    from public.share_links
    join public.workflow_versions on public.workflow_versions.id = share_links.workflow_version_id
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.share_links.id = runs.share_link_id
      and public.buttons.owner_id = (select auth.uid())
      and runs.workflow_version_id = public.workflow_versions.id
  ));

create policy "runs_owner_update" on public.runs
  for update to authenticated
  using (exists (
    select 1
    from public.share_links
    join public.workflow_versions on public.workflow_versions.id = share_links.workflow_version_id
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.share_links.id = runs.share_link_id
      and public.buttons.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.share_links
    join public.workflow_versions on public.workflow_versions.id = share_links.workflow_version_id
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.share_links.id = runs.share_link_id
      and public.buttons.owner_id = (select auth.uid())
      and runs.workflow_version_id = public.workflow_versions.id
  ));

create policy "runs_owner_delete" on public.runs
  for delete to authenticated
  using (exists (
    select 1
    from public.share_links
    join public.workflow_versions on public.workflow_versions.id = share_links.workflow_version_id
    join public.buttons on public.buttons.id = workflow_versions.button_id
    where public.share_links.id = runs.share_link_id
      and public.buttons.owner_id = (select auth.uid())
  ));
