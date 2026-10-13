# Coupon feature setup — Protectyourself

This patch adds a coupon-management screen to the existing Supabase-authenticated admin portal and a coupon code entry in the shopping cart. It intentionally does not replace your existing Razorpay checkout function.

## Files in this patch

- `index.html`, `assets/main.js`, `assets/style.css`: coupon field and discount preview in the cart.
- `admin.html`, `assets/admin.js`: coupon creation/editing, active/disabled state, date windows, minimum subtotal, percentage/fixed discounts, maximum discount, product targeting, and usage fields.
- `coupon-management-migration.sql`: coupon table, redemption audit table, and row-level security policies.

## Required setup

1. Back up the current project before copying these files over it. The patch contains only the changed files and migration note; it does not contain your `.git` directory or backups.
2. In Supabase Dashboard → SQL Editor, run `coupon-management-migration.sql` once. It expects the existing `public.is_protectyourself_admin()` helper and `public.products` table already used by this project.
3. Push the front-end patch only after the current checkout function has been updated to support server-side coupons (see the next section). The customer cart preview is not authoritative.
4. Sign in to the admin portal, open **Coupons**, create a test coupon, and check the date, minimum subtotal, product restrictions and usage limits.

## Important: update the deployed Supabase Edge Function before live use

The source for your existing deployed `storefront-checkout` Edge Function was not included in the ZIP. The website calls that deployed function to create orders and verify Razorpay payments. Because it is not in the repository, it cannot safely be rewritten here without risking the current payment/order flow.

The front end deliberately **fails closed** when a coupon is applied: before opening Razorpay it calls the existing function with `action: "validate_coupon"` and expects `{ success: true, coupon_code: "CODE", discount_inr: number }`. It then sends `coupon_code` with `action: "create_order"` and expects the create-order response to echo the validated `coupon_code` and exact server-computed `discount_inr`. If the live function does not support this contract, checkout with a coupon will stop before Razorpay; a customer can remove the coupon and check out at regular price. This prevents a previewed discount from being mistaken for the amount charged.

Update the Edge Function in the Supabase Dashboard → Edge Functions → `storefront-checkout` (or export its source first). It must:

- validate coupon code, current dates/status, product eligibility, minimum eligible subtotal, maximum discount and the current database prices on the server;
- enforce total-use and per-customer limits atomically, and enforce first-order-only rules against verified orders;
- recalculate discount and total on every `create_order` call instead of trusting the browser preview;
- persist the applied coupon code and discount with the order, and return `coupon_code` and `discount_inr` alongside the existing response fields;
- record/adjust coupon redemptions only through verified-payment logic and safely handle failed/abandoned payments;
- preserve existing create-order behavior when no coupon is supplied, and preserve the existing `verify_payment` signature checks and order updates.

Do not simply accept the browser-submitted discount amount, and do not put Supabase service-role or Razorpay secret keys in website JavaScript. The redemption table is an audit structure; the Edge Function must actually implement atomic reservation/reconciliation for limits before those limits can be trusted in production.

## Test safely

Use a low-value test product and a short-lived test coupon. Confirm an invalid/expired code is rejected, percentage and fixed discounts are correct, product restrictions work, limits cannot be bypassed with simultaneous requests, and the Razorpay amount equals the server-computed order total. Check the created `orders` record and redemption audit after a successful test payment. Do not advertise a coupon before the Edge Function changes are deployed and tested.
