-- Run after migration_v5.sql
-- Moves "Quick Status" visibility from per-browser localStorage into the database,
-- so admins configure it once and it applies both to their own Sidebar panel and
-- to the public summary shown on the /help page.

alter table ticket_groups add column if not exists show_in_summary boolean not null default false;

-- Sensible starting point: show the first two default groups
update ticket_groups set show_in_summary = true where name in ('New', 'In Progress');
