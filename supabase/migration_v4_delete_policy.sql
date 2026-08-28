-- Run this in Supabase SQL Editor if you set up your database before the
-- "delete request" feature was added — it adds the missing RLS policy that
-- allows tickets to actually be deleted from the admin dashboard.

drop policy if exists "Public can delete tickets" on tickets;
create policy "Public can delete tickets" on tickets
  for delete using (true);
