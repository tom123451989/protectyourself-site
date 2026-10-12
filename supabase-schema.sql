-- Protectyourself Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor.
-- Then create an Auth user and add its UUID to admin_users as described in README.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_protectyourself_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_protectyourself_admin() from public;
grant execute on function public.is_protectyourself_admin() to authenticated;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_inr numeric(10,2) not null default 500 check (price_inr >= 0),
  price_usd numeric(10,2) not null default 50 check (price_usd >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  service_name text not null default 'Transcendental Protection',
  message text not null default '',
  consent boolean not null default false,
  payment_reference text,
  status text not null default 'new' check (status in ('new','contacted','in_progress','completed','cancelled')),
  payment_status text not null default 'unverified' check (payment_status in ('unverified','pending','paid','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  business_name text not null default 'Protectyourself',
  contact_email text not null default 'protectyourselfin@gmail.com',
  whatsapp_number text not null default '',
  india_payment_url text not null default '',
  international_payment_url text not null default '',
  booking_form_url text not null default '',
  public_notice text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.services (name, description, price_inr, price_usd, is_active)
select 'Transcendental Protection',
       'Remote spiritual protection service delivered personally. Review the process and expectations before publishing.',
       500, 50, true
where not exists (select 1 from public.services);

insert into public.site_settings (id, business_name, contact_email)
values (1, 'Protectyourself', 'protectyourselfin@gmail.com')
on conflict (id) do nothing;

alter table public.admin_users enable row level security;
alter table public.services enable row level security;
alter table public.enquiries enable row level security;
alter table public.site_settings enable row level security;

-- Admin identities can be read/managed only by existing admins.
drop policy if exists "admins read admin list" on public.admin_users;
create policy "admins read admin list" on public.admin_users for select to authenticated using (public.is_protectyourself_admin());
drop policy if exists "admins manage admin list" on public.admin_users;
create policy "admins manage admin list" on public.admin_users for all to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());

-- Public visitors may view active services. Only approved admins can create/update/delete.
drop policy if exists "public read active services" on public.services;
create policy "public read active services" on public.services for select to anon, authenticated using (is_active or public.is_protectyourself_admin());
drop policy if exists "admins manage services" on public.services;
create policy "admins manage services" on public.services for all to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());

-- Public booking form can insert an enquiry; only admins can read or update customer records.
drop policy if exists "public submit enquiry" on public.enquiries;
create policy "public submit enquiry" on public.enquiries for insert to anon, authenticated with check (length(trim(customer_name)) between 1 and 150 and length(trim(customer_email)) between 3 and 320 and length(trim(message)) <= 5000);
drop policy if exists "admins read enquiries" on public.enquiries;
create policy "admins read enquiries" on public.enquiries for select to authenticated using (public.is_protectyourself_admin());
drop policy if exists "admins update enquiries" on public.enquiries;
create policy "admins update enquiries" on public.enquiries for update to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());
drop policy if exists "admins delete enquiries" on public.enquiries;
create policy "admins delete enquiries" on public.enquiries for delete to authenticated using (public.is_protectyourself_admin());

-- Public site can read settings, but only approved admins can change them.
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage site settings" on public.site_settings;
create policy "admins manage site settings" on public.site_settings for all to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());

grant select on public.services to anon, authenticated;
grant insert on public.enquiries to anon, authenticated;
grant select, update, delete on public.enquiries to authenticated;
grant select on public.site_settings to anon, authenticated;
grant all on public.services, public.site_settings to authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
