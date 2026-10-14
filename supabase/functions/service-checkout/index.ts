import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://tom123451989.github.io",
  "https://protectyourselffoundation.in",
  "https://www.protectyourselffoundation.in",
  "http://localhost:3000",
]);
const corsFor = (origin: string | null) => {
  const allowed = origin && allowedOrigins.has(origin) ? origin : "https://protectyourselffoundation.in";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};
const json = (body: unknown, status = 200, cors: Record<string,string> = corsFor(null)) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const required = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing server configuration: ${key}`);
  return value;
};
const text = (v: unknown, max = 500) => typeof v === "string" ? v.trim().slice(0, max) : "";
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function razorpay(path: string, method = "GET", body?: unknown) {
  const id = required("SERVICE_RAZORPAY_KEY_ID");
  const secret = required("SERVICE_RAZORPAY_KEY_SECRET");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.description || "Payment provider request failed.");
  return result;
}
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map(x => x.toString(16).padStart(2,"0")).join("");
}
class CheckoutError extends Error {}

async function calculateServiceCoupon(db: any, rawCode: unknown, email: string, service: any) {
  const code = text(rawCode, 40).toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new CheckoutError("Enter a valid coupon code.");
  if (!validEmail(email)) throw new CheckoutError("Enter a valid email address before using a coupon.");
  let { data: coupon, error } = await db.from("coupons").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  if (!coupon || !coupon.is_active) throw new CheckoutError("That coupon is invalid or inactive.");
  const cleanup = await db.rpc("protectyourself_cleanup_coupon_reservations", { p_coupon_id: coupon.id });
  if (cleanup.error) throw cleanup.error;
  const refreshed = await db.from("coupons").select("*").eq("id", coupon.id).maybeSingle();
  if (refreshed.error) throw refreshed.error;
  coupon = refreshed.data;
  if (!coupon || !coupon.is_active) throw new CheckoutError("That coupon is invalid or inactive.");
  const now = Date.now();
  if (coupon.starts_at && now < new Date(coupon.starts_at).getTime()) throw new CheckoutError("This coupon is not active yet.");
  if (coupon.expires_at && now >= new Date(coupon.expires_at).getTime()) throw new CheckoutError("This coupon has expired.");
  if (coupon.usage_limit !== null && Number(coupon.usage_count) >= Number(coupon.usage_limit)) throw new CheckoutError("This coupon has reached its usage limit.");
  // Product-specific coupons never apply to services. Only all-active-products coupons cross over.
  if (!coupon.applies_to_all_products) throw new CheckoutError("This coupon is restricted to selected products and does not apply to services.");
  const servicePaise = Math.round(Number(service.price_inr) * 100);
  const minimumPaise = Math.round(Number(coupon.minimum_order_amount || 0) * 100);
  if (servicePaise < minimumPaise) throw new CheckoutError(`This coupon requires an eligible subtotal of ₹${(minimumPaise / 100).toFixed(2)}.`);
  if (coupon.per_customer_limit !== null) {
    const { count, error: redemptionError } = await db.from("coupon_redemptions").select("id", { count:"exact", head:true })
      .eq("coupon_id", coupon.id).ilike("customer_email", email).in("redemption_status", ["pending", "redeemed"]);
    if (redemptionError) throw redemptionError;
    if (Number(count || 0) >= Number(coupon.per_customer_limit)) throw new CheckoutError("You have already used this coupon the maximum number of times.");
  }
  if (coupon.first_order_only) {
    const productOrders = await db.from("orders").select("id", { count:"exact", head:true }).ilike("customer_email", email).eq("payment_status", "paid");
    if (productOrders.error) throw productOrders.error;
    const serviceBookings = await db.from("service_bookings").select("id", { count:"exact", head:true }).ilike("customer_email", email).eq("payment_status", "paid");
    if (serviceBookings.error) throw serviceBookings.error;
    if (Number(productOrders.count || 0) + Number(serviceBookings.count || 0) > 0) throw new CheckoutError("This coupon is available only on your first order or service booking.");
    const activeRedemptions = await db.from("coupon_redemptions").select("id", { count:"exact", head:true })
      .eq("coupon_id", coupon.id).ilike("customer_email", email).in("redemption_status", ["pending", "redeemed"]);
    if (activeRedemptions.error) throw activeRedemptions.error;
    if (Number(activeRedemptions.count || 0) > 0) throw new CheckoutError("This first-order coupon is already reserved or has been used for this email address.");
  }
  let discountPaise = coupon.discount_type === "percentage"
    ? Math.round(servicePaise * Number(coupon.discount_value) / 100)
    : Math.round(Number(coupon.discount_value) * 100);
  if (coupon.discount_type === "percentage" && coupon.maximum_discount_amount !== null) {
    discountPaise = Math.min(discountPaise, Math.round(Number(coupon.maximum_discount_amount) * 100));
  }
  discountPaise = Math.max(0, Math.min(servicePaise, discountPaise));
  if (discountPaise < 1) throw new CheckoutError("This coupon does not produce a discount for this service.");
  return { coupon, code, subtotalPaise:servicePaise, discountPaise, totalPaise:servicePaise-discountPaise };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsFor(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  if (req.method !== "POST") return json({ success:false, error:"Method not allowed." }, 405, cors);
  if (origin && !allowedOrigins.has(origin)) return json({ success:false, error:"Origin is not allowed." }, 403, cors);
  try {
    const body = await req.json();
    const db = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth:{persistSession:false} });

    if (body.action === "validate_coupon" || body.action === "create_order") {
      const serviceId = text(body.service_id, 80);
      const name = text(body.customer_name, 150);
      const email = text(body.customer_email, 320).toLowerCase();
      const phone = text(body.customer_phone, 30);
      const currency = text(body.currency || "INR", 3).toUpperCase();
      if (!serviceId || (body.action === "create_order" && !name) || !validEmail(email) || !["INR","USD"].includes(currency)) {
        return json({ success:false, error:"Enter a valid service, name, email, and currency." }, 400, cors);
      }
      if (currency !== "INR") return json({ success:false, error:"International service payments are not enabled yet. Please submit an enquiry." }, 400, cors);
      const { data: service, error: serviceError } = await db.from("services")
        .select("id,name,price_inr,is_active").eq("id", serviceId).eq("is_active", true).single();
      if (serviceError || !service) return json({ success:false, error:"This service is unavailable." }, 404, cors);
      const subtotalPaise = Math.round(Number(service.price_inr) * 100);
      if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise < 100) return json({ success:false, error:"Service price is invalid." }, 400, cors);
      let couponPricing: Awaited<ReturnType<typeof calculateServiceCoupon>> | null = null;
      if (text(body.coupon_code, 40)) couponPricing = await calculateServiceCoupon(db, body.coupon_code, email, service);
      const discountPaise = couponPricing?.discountPaise || 0;
      const totalPaise = subtotalPaise - discountPaise;
      if (totalPaise < 100) return json({ success:false, error:"This coupon would leave less than ₹1 to pay. Remove it or adjust the coupon." }, 400, cors);
      if (body.action === "validate_coupon") {
        if (!couponPricing) return json({ success:false, error:"Enter a coupon code first." }, 400, cors);
        return json({ success:true, coupon_code:couponPricing.code, discount_inr:discountPaise/100,
          subtotal_inr:subtotalPaise/100, total_inr:totalPaise/100 }, 200, cors);
      }

      const { data: booking, error: bookingError } = await db.from("service_bookings").insert({
        service_id:service.id, service_name:service.name, customer_name:name, customer_email:email,
        customer_phone:phone || null, currency:"INR", amount:totalPaise/100,
        subtotal_inr:subtotalPaise/100, discount_inr:discountPaise/100, coupon_code:couponPricing?.code || null,
        payment_status:"pending"
      }).select("id,booking_number").single();
      if (bookingError) throw bookingError;
      let couponReserved = false;
      try {
        if (couponPricing) {
          const reservation = await db.rpc("protectyourself_reserve_coupon", {
            p_coupon_id:couponPricing.coupon.id, p_order_id:String(booking.id), p_customer_email:email,
            p_discount_amount_inr:discountPaise/100, p_expected_updated_at:couponPricing.coupon.updated_at,
          });
          if (reservation.error) throw reservation.error;
          if (!reservation.data || reservation.data.success !== true) {
            await db.from("service_bookings").update({payment_status:"failed",updated_at:new Date().toISOString()}).eq("id",booking.id);
            return json({success:false,error:reservation.data?.error || "This coupon is no longer available. Apply it again and retry."},409,cors);
          }
          couponReserved = true;
        }
        const rp = await razorpay("/orders", "POST", {
          amount:totalPaise, currency:"INR", receipt:booking.booking_number,
          notes:{service_booking_id:booking.id,booking_number:booking.booking_number,service_name:service.name,coupon_code:couponPricing?.code || ""}
        });
        const { error: updateError } = await db.from("service_bookings").update({razorpay_order_id:rp.id,updated_at:new Date().toISOString()}).eq("id",booking.id);
        if (updateError) throw updateError;
        return json({success:true,booking_id:booking.id,booking_number:booking.booking_number,razorpay_order_id:rp.id,
          amount:totalPaise,currency:"INR",key_id:required("SERVICE_RAZORPAY_KEY_ID"),service_name:service.name,
          customer_name:name,customer_email:email,customer_phone:phone,subtotal_inr:subtotalPaise/100,
          discount_inr:discountPaise/100,total_inr:totalPaise/100,coupon_code:couponPricing?.code || null},200,cors);
      } catch (orderError) {
        if (couponReserved) {
          const {error:releaseError} = await db.rpc("protectyourself_release_coupon_reservation",{p_order_id:String(booking.id)});
          if (releaseError) console.error("Could not release service coupon reservation",releaseError);
        }
        const {error:failedError} = await db.from("service_bookings").update({payment_status:"failed",updated_at:new Date().toISOString()}).eq("id",booking.id).eq("payment_status","pending");
        if (failedError) console.error("Could not mark failed service booking",failedError);
        throw orderError;
      }
    }

    if (body.action === "payment_failed") {
      const bookingId = text(body.booking_id, 80);
      const orderId = text(body.razorpay_order_id, 100);
      if (!bookingId || !orderId) return json({success:false,error:"Failed payment details are incomplete."},400,cors);
      const {data:booking,error:bookingError} = await db.from("service_bookings")
        .select("id,payment_status,razorpay_order_id,razorpay_payment_id")
        .eq("id",bookingId).maybeSingle();
      if (bookingError) throw bookingError;
      if (!booking || booking.razorpay_order_id !== orderId) return json({success:false,error:"Booking/payment does not match."},400,cors);
      if (booking.payment_status === "paid" || booking.razorpay_payment_id) {
        return json({success:false,error:"A payment may already have completed. Please contact support before retrying."},409,cors);
      }
      const {error:updateError} = await db.from("service_bookings").update({payment_status:"failed",updated_at:new Date().toISOString()})
        .eq("id",bookingId).eq("payment_status","pending").is("razorpay_payment_id",null);
      if (updateError) throw updateError;
      const {error:releaseError} = await db.rpc("protectyourself_release_coupon_reservation",{p_order_id:String(bookingId)});
      if (releaseError) throw releaseError;
      return json({success:true},200,cors);
    }

    if (body.action === "verify_payment") {
      const bookingId = text(body.booking_id, 80);
      const orderId = text(body.razorpay_order_id, 100);
      const paymentId = text(body.razorpay_payment_id, 100);
      const signature = text(body.razorpay_signature, 200);
      if (!bookingId || !orderId || !paymentId || !signature) return json({success:false,error:"Payment verification details are incomplete."},400,cors);
      const {data:booking,error} = await db.from("service_bookings")
        .select("id,booking_number,razorpay_order_id,payment_status,amount,currency,razorpay_payment_id,coupon_code")
        .eq("id",bookingId).single();
      if (error || !booking || booking.razorpay_order_id !== orderId) return json({success:false,error:"Booking/payment does not match."},400,cors);
      if (booking.payment_status === "paid") {
        if (booking.razorpay_payment_id === paymentId) {
          const {error:finalizeError} = await db.rpc("protectyourself_finalize_coupon_redemption",{p_order_id:String(booking.id)});
          if (finalizeError) throw finalizeError;
          return json({success:true,booking_number:booking.booking_number,already_paid:true},200,cors);
        }
        return json({success:false,error:"This booking has already been paid. Please contact support if you need help."},409,cors);
      }
      const expected = await hmacHex(required("SERVICE_RAZORPAY_KEY_SECRET"),`${orderId}|${paymentId}`);
      if (expected !== signature) return json({success:false,error:"Payment signature verification failed."},400,cors);
      const payment = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
      if (payment.order_id !== orderId || payment.status !== "captured") return json({success:false,error:"Payment is not captured yet. Please contact support if your account was charged."},409,cors);
      const expectedPaise = Math.round(Number(booking.amount)*100);
      if (payment.currency !== booking.currency || Number(payment.amount) !== expectedPaise) return json({success:false,error:"Captured payment amount or currency does not match this booking. Please contact support."},409,cors);
      const {data:updatedBooking,error:updateError} = await db.from("service_bookings").update({
        payment_status:"paid",razorpay_payment_id:paymentId,updated_at:new Date().toISOString()
      }).eq("id",bookingId).eq("payment_status","pending").select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updatedBooking) {
        const {data:currentBooking,error:currentError} = await db.from("service_bookings").select("payment_status,razorpay_payment_id").eq("id",bookingId).single();
        if (currentError) throw currentError;
        if (currentBooking.payment_status === "paid" && currentBooking.razorpay_payment_id === paymentId) {
          const {error:finalizeError} = await db.rpc("protectyourself_finalize_coupon_redemption",{p_order_id:String(booking.id)});
          if (finalizeError) throw finalizeError;
          return json({success:true,booking_number:booking.booking_number,already_paid:true},200,cors);
        }
        return json({success:false,error:"Booking status changed during verification. Please contact support before retrying payment."},409,cors);
      }
      const {error:finalizeError} = await db.rpc("protectyourself_finalize_coupon_redemption",{p_order_id:String(booking.id)});
      if (finalizeError) throw finalizeError;
      return json({success:true,booking_number:booking.booking_number},200,cors);
    }
    return json({success:false,error:"Unknown action."},400,cors);
  } catch (error) {
    console.error("service-checkout error",error);
    const message = error instanceof CheckoutError ? error.message : "The service checkout could not be completed. Please try again or contact support.";
    const status = error instanceof CheckoutError ? 400 : 500;
    return json({success:false,error:message},status,cors);
  }
});
