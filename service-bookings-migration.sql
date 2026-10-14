-- Service booking/payment records for Protectyourself.
-- Review and run in Supabase SQL Editor before enabling service payments.
create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default ('SV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  service_id uuid not null references public.services(id) on delete restrict,
  service_name text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  currency text not null check (currency in ('INR','USD')),
  amount numeric(10,2) not null check (amount > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  booking_status text not null default 'new' check (booking_status in ('new','contacted','in_progress','completed','cancelled')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.service_bookings enable row level security;
revoke all on public.service_bookings from anon, authenticated;
grant select, update on public.service_bookings to authenticated;
drop policy if exists "admins read service bookings" on public.service_bookings;
create policy "admins read service bookings" on public.service_bookings
for select to authenticated using (public.is_protectyourself_admin());
drop policy if exists "admins update service bookings" on public.service_bookings;
create policy "admins update service bookings" on public.service_bookings
for update to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());
