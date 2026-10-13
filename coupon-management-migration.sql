-- Protectyourself coupon management migration
-- Run once in Supabase Dashboard -> SQL Editor, using the existing project.
-- This creates coupon metadata and a redemption audit table. The checkout Edge Function
-- must validate/apply coupons server-side before discounts are safe for production use.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0 and (discount_type <> 'percentage' or discount_value <= 100)),
  minimum_order_amount numeric(10,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(10,2) check (maximum_discount_amount is null or maximum_discount_amount > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  applies_to_all_products boolean not null default true,
  eligible_product_ids uuid[] not null default '{}',
  first_order_only boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_valid_window check (starts_at is null or expires_at is null or starts_at < expires_at),
  constraint coupons_has_eligible_products check (applies_to_all_products or cardinality(eligible_product_ids) > 0)
);

create index if not exists coupons_active_code_idx on public.coupons (code) where is_active = true;
create index if not exists coupons_expiry_idx on public.coupons (expires_at);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  coupon_code text not null,
  order_id text not null,
  customer_email text not null,
  discount_amount_inr numeric(10,2) not null check (discount_amount_inr >= 0),
  redemption_status text not null default 'pending' check (redemption_status in ('pending','redeemed','released')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (coupon_id, order_id)
);
create index if not exists coupon_redemptions_customer_idx on public.coupon_redemptions (coupon_id, lower(customer_email));
create index if not exists coupon_redemptions_order_idx on public.coupon_redemptions (order_id);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists "public read current coupons" on public.coupons;
create policy "public read current coupons" on public.coupons
  for select to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at > now())
    and (usage_limit is null or usage_count < usage_limit)
  );

drop policy if exists "admins manage coupons" on public.coupons;
create policy "admins manage coupons" on public.coupons
  for all to authenticated
  using (public.is_protectyourself_admin())
  with check (public.is_protectyourself_admin());

drop policy if exists "admins read coupon redemptions" on public.coupon_redemptions;
create policy "admins read coupon redemptions" on public.coupon_redemptions
  for select to authenticated
  using (public.is_protectyourself_admin());

-- Public users can only read current coupon rows; they cannot create or modify coupons.
grant select on public.coupons to anon, authenticated;
grant insert, update, delete on public.coupons to authenticated;
grant select on public.coupon_redemptions to authenticated;
revoke insert, update, delete on public.coupon_redemptions from anon, authenticated;

-- Usage is not incremented by browser code. The trusted checkout Edge Function must:
-- 1) lock/check coupon and limits while creating the payable order,
-- 2) calculate the discount from database product prices (not the client preview),
-- 3) persist coupon_code and discount on the order, and
-- 4) record/reconcile coupon_redemptions only after verified payment, while enforcing limits atomically.
