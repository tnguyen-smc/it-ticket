-- Run this entire file in Supabase Dashboard -> SQL Editor -> New Query

-- Tickets table
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  problem text not null,
  status text not null default 'New',
  created_at timestamptz not null default now()
);

-- Custom status groups (columns in Kanban / sections in List view)
create table if not exists ticket_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

-- Seed default groups
insert into ticket_groups (name, sort_order) values
  ('New', 0),
  ('In Progress', 1),
  ('Waiting', 2),
  ('Resolved', 3)
on conflict do nothing;

-- Only add to realtime publication if not already present (avoids
-- "relation is already member of publication" errors on reruns)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table tickets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'ticket_groups'
  ) then
    alter publication supabase_realtime add table ticket_groups;
  end if;
end $$;

-- Row Level Security
alter table tickets enable row level security;
alter table ticket_groups enable row level security;

-- NOTE: These policies are intentionally permissive so the app works out of the box
-- with the public anon key (the /help form has no login). The /it dashboard is
-- protected at the APPLICATION layer via Google OAuth + domain check, not by RLS.
-- If you want database-level protection too, tighten these policies to check
-- auth.jwt() ->> 'email' against your school domain for update/delete on tickets
-- and all operations on ticket_groups.

drop policy if exists "Public can insert tickets" on tickets;
create policy "Public can insert tickets" on tickets
  for insert with check (true);

drop policy if exists "Public can read tickets" on tickets;
create policy "Public can read tickets" on tickets
  for select using (true);

drop policy if exists "Public can update tickets" on tickets;
create policy "Public can update tickets" on tickets
  for update using (true);

drop policy if exists "Public can delete tickets" on tickets;
create policy "Public can delete tickets" on tickets
  for delete using (true);

drop policy if exists "Public can read groups" on ticket_groups;
create policy "Public can read groups" on ticket_groups
  for select using (true);

drop policy if exists "Public can write groups" on ticket_groups;
create policy "Public can write groups" on ticket_groups
  for all using (true);
