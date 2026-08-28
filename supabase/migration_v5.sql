-- Run after migration_v3.sql and migration_v4_delete_policy.sql

-- Restructure board_items: "items" (flat checklist) becomes "lists" (array of
-- checklists, each with its own title). Existing cards get migrated so nothing
-- is lost.
alter table board_items add column if not exists lists jsonb not null default '[]';

update board_items
set lists = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'title', 'Checklist',
    'items', coalesce(items, '[]'::jsonb)
  )
)
where lists = '[]'::jsonb and items is not null and items <> '[]'::jsonb;

-- Board card connector lines (simple line between two cards)
create table if not exists board_connections (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references board_items(id) on delete cascade,
  to_id uuid not null references board_items(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table board_connections enable row level security;

drop policy if exists "Public can manage board connections" on board_connections;
create policy "Public can manage board connections" on board_connections
  for all using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'board_connections'
  ) then
    alter publication supabase_realtime add table board_connections;
  end if;
end $$;
