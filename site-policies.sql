-- Protectyourself editable store policies. Run in Supabase SQL Editor.
create table if not exists public.site_policies (
  policy_key text primary key check (policy_key in ('shipping','cancellation','returns_refunds','privacy','terms')),
  title text not null,
  content text not null,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_policies enable row level security;
drop policy if exists "public read published site policies" on public.site_policies;
create policy "public read published site policies" on public.site_policies
  for select to anon, authenticated using (is_published = true or public.is_protectyourself_admin());
drop policy if exists "admins manage site policies" on public.site_policies;
create policy "admins manage site policies" on public.site_policies
  for all to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());
revoke all on public.site_policies from anon, authenticated;
grant select on public.site_policies to anon, authenticated;
grant insert, update, delete on public.site_policies to authenticated;
