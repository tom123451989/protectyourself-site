-- ProtectYourself Foundation: enable Admin-managed coupons for service bookings.
-- Run this in Supabase SQL Editor before deploying the revised service-checkout function.
-- This migration updates only service-booking metadata and the shared coupon RPCs.
-- It does not modify storefront-checkout or any Razorpay secrets.

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS subtotal_inr numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_inr numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code text;

-- Cleanup must understand both product orders and service bookings. Without this,
-- a service reservation would look like a missing product order and be released.
CREATE OR REPLACE FUNCTION public.protectyourself_cleanup_coupon_reservations(p_coupon_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_released integer := 0;
begin
  update public.coupon_redemptions r
     set redemption_status = 'released'
   where r.redemption_status = 'pending'
     and r.created_at < now() - interval '60 minutes'
     and r.coupon_id = p_coupon_id
     and (
       (
         not exists (select 1 from public.orders o where o.id::text = r.order_id)
         and not exists (select 1 from public.service_bookings sb where sb.id::text = r.order_id)
       )
       or exists (
         select 1 from public.orders o
          where o.id::text = r.order_id
            and o.created_at < now() - interval '60 minutes'
            and o.payment_status in ('pending','failed')
            and o.razorpay_payment_id is null
       )
       or exists (
         select 1 from public.service_bookings sb
          where sb.id::text = r.order_id
            and sb.created_at < now() - interval '60 minutes'
            and sb.payment_status in ('pending','failed')
            and sb.razorpay_payment_id is null
       )
     );
  get diagnostics v_released = row_count;
  return v_released;
end;
$function$;

-- Preserve the existing reservation rules and extend first-order checks to
-- include paid service bookings as well as paid product orders.
CREATE OR REPLACE FUNCTION public.protectyourself_reserve_coupon(
  p_coupon_id uuid,
  p_order_id text,
  p_customer_email text,
  p_discount_amount_inr numeric,
  p_expected_updated_at timestamp with time zone
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_coupon public.coupons%rowtype;
  v_total_active integer := 0;
  v_customer_active integer := 0;
begin
  select * into v_coupon
    from public.coupons
   where id = p_coupon_id
   for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'This coupon no longer exists.');
  end if;

  perform public.protectyourself_cleanup_coupon_reservations(p_coupon_id);
  select * into v_coupon from public.coupons where id = p_coupon_id;

  if not v_coupon.is_active then
    return jsonb_build_object('success', false, 'error', 'This coupon is disabled.');
  end if;
  if v_coupon.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('success', false, 'error', 'The coupon changed during checkout. Apply it again and retry.');
  end if;
  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    return jsonb_build_object('success', false, 'error', 'This coupon is not active yet.');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'This coupon has expired.');
  end if;

  if exists (
    select 1 from public.coupon_redemptions r
     where r.coupon_id = p_coupon_id and r.order_id = p_order_id
       and r.redemption_status in ('pending','redeemed')
  ) then
    return jsonb_build_object('success', true, 'already_reserved', true);
  end if;

  select count(*) into v_total_active
    from public.coupon_redemptions r
   where r.coupon_id = p_coupon_id
     and r.redemption_status in ('pending','redeemed');
  if v_coupon.usage_limit is not null and v_total_active >= v_coupon.usage_limit then
    return jsonb_build_object('success', false, 'error', 'This coupon has reached its usage limit.');
  end if;

  select count(*) into v_customer_active
    from public.coupon_redemptions r
   where r.coupon_id = p_coupon_id
     and lower(r.customer_email) = lower(p_customer_email)
     and r.redemption_status in ('pending','redeemed');
  if v_coupon.per_customer_limit is not null and v_customer_active >= v_coupon.per_customer_limit then
    return jsonb_build_object('success', false, 'error', 'You have already used this coupon the maximum number of times.');
  end if;

  if v_coupon.first_order_only then
    if exists (
      select 1 from public.orders o
       where lower(o.customer_email) = lower(p_customer_email)
         and o.payment_status = 'paid'
    ) or exists (
      select 1 from public.service_bookings sb
       where lower(sb.customer_email) = lower(p_customer_email)
         and sb.payment_status = 'paid'
    ) then
      return jsonb_build_object('success', false, 'error', 'This coupon is available only on a first order or service booking.');
    end if;
    if v_customer_active > 0 then
      return jsonb_build_object('success', false, 'error', 'This first-order coupon is already reserved or has been used for this email address.');
    end if;
  end if;

  if p_discount_amount_inr is null or p_discount_amount_inr <= 0 then
    return jsonb_build_object('success', false, 'error', 'The calculated coupon discount is invalid.');
  end if;

  insert into public.coupon_redemptions (
    coupon_id, coupon_code, order_id, customer_email, discount_amount_inr, redemption_status
  ) values (
    v_coupon.id, v_coupon.code, p_order_id, lower(p_customer_email), round(p_discount_amount_inr, 2), 'pending'
  );

  return jsonb_build_object('success', true, 'already_reserved', false);
end;
$function$;

-- Quick post-migration check. Expected: 3 columns returned and both RPCs present.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'service_bookings'
  AND column_name IN ('subtotal_inr','discount_inr','coupon_code')
ORDER BY column_name;
