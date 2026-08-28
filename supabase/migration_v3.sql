-- Run this in Supabase SQL Editor after migration_v2.sql
-- Adds an internal notes field IT staff can use on any ticket

alter table tickets add column if not exists notes text not null default '';
