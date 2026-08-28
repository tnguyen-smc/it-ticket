-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- Adds: group colors, School/Parish category, and the Thought Board feature

-- Color for each status group (hex string, e.g. #7A9B76)
alter table ticket_groups add column if not exists color text not null default '#94A3B8';

-- Distinguish School vs Parish tickets
alter table tickets add column if not exists category text not null default 'School';

-- Thought Board: freeform sticky-note style cards on an infinite canvas
create table if not exists board_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  items jsonb not null default '[]', -- array of {id, text, done}
  color text not null default '#FDE68A',
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 260,
  height numeric not null default 200,
  created_at timestamptz not null default now()
);

alter table board_items enable row level security;

create policy "Public can manage board items" on board_items
  for all using (true);

alter publication supabase_realtime add table board_items;

-- Suggested starting colors for the four default groups (optional, run once)
update ticket_groups set color = '#93C5A3' where name = 'New';
update ticket_groups set color = '#8FB4DB' where name = 'In Progress';
update ticket_groups set color = '#E8C57E' where name = 'Waiting';
update ticket_groups set color = '#A9A9C7' where name = 'Resolved';
