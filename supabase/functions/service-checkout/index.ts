import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/json",
    },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success:false, error:"Method not allowed." }, 405);
  try {
    const body = await req.json();
    const db = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth:{persistSession:false} });

    if (body.action === "create_order") {
      const serviceId = text(body.service_id, 80);
      const name = text(body.customer_name, 150);
      const email = text(body.customer_email, 320).toLowerCase();
      const phone = text(body.customer_phone, 30);
      const currency = text(body.currency, 3).toUpperCase();
      if (!serviceId || !name || !validEmail(email) || !["INR","USD"].includes(currency)) {
        return json({ success:false, error:"Enter a valid service, name, email, and currency." }, 400);
      }
      // USD service payments require confirmed international-payment support; do not silently charge INR.
      if (currency !== "INR") return json({ success:false, error:"International service payments are not enabled yet. Please submit an enquiry." }, 400);
      const { data: service, error: serviceError } = await db.from("services")
        .select("id,name,price_inr,is_active").eq("id", serviceId).eq("is_active", true).single();
      if (serviceError || !service) return json({ success:false, error:"This service is unavailable." }, 404);
      const amountPaise = Math.round(Number(service.price_inr) * 100);
      if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) return json({ success:false, error:"Service price is invalid." }, 400);
      const { data: booking, error: bookingError } = await db.from("service_bookings").insert({
        service_id:service.id, service_name:service.name, customer_name:name, customer_email:email,
        customer_phone:phone || null, currency:"INR", amount:amountPaise/100, payment_status:"pending"
      }).select("id,booking_number").single();
      if (bookingError) throw bookingError;
      let rp;
      try {
        rp = await razorpay("/orders", "POST", {
          amount:amountPaise, currency:"INR", receipt:booking.booking_number,
          notes:{ service_booking_id:booking.id, booking_number:booking.booking_number, service_name:service.name }
        });
      } catch (orderError) {
        const { error: cleanupError } = await db.from("service_bookings")
          .update({ payment_status:"failed", updated_at:new Date().toISOString() })
          .eq("id", booking.id).eq("payment_status","pending");
        if (cleanupError) console.error("Could not mark failed service booking", cleanupError);
        throw orderError;
      }
      const { error: updateError } = await db.from("service_bookings").update({ razorpay_order_id:rp.id }).eq("id", booking.id);
      if (updateError) throw updateError;
      return json({ success:true, booking_id:booking.id, booking_number:booking.booking_number,
        razorpay_order_id:rp.id, amount:amountPaise, currency:"INR", key_id:required("SERVICE_RAZORPAY_KEY_ID"),
        service_name:service.name, customer_name:name, customer_email:email });
    }

    if (body.action === "verify_payment") {
      const bookingId = text(body.booking_id, 80);
      const orderId = text(body.razorpay_order_id, 100);
      const paymentId = text(body.razorpay_payment_id, 100);
      const signature = text(body.razorpay_signature, 200);
      if (!bookingId || !orderId || !paymentId || !signature) return json({ success:false, error:"Payment verification details are incomplete." }, 400);
      const { data: booking, error } = await db.from("service_bookings").select("id,booking_number,razorpay_order_id,payment_status,amount,currency,razorpay_payment_id").eq("id", bookingId).single();
      if (error || !booking || booking.razorpay_order_id !== orderId) return json({ success:false, error:"Booking/payment does not match." }, 400);
      if (booking.payment_status === "paid") {
        if (booking.razorpay_payment_id === paymentId) {
          return json({ success:true, booking_number:booking.booking_number, already_paid:true });
        }
        return json({ success:false, error:"This booking has already been paid. Please contact support if you need help." }, 409);
      }
      const expected = await hmacHex(required("SERVICE_RAZORPAY_KEY_SECRET"), `${orderId}|${paymentId}`);
      if (expected !== signature) return json({ success:false, error:"Payment signature verification failed." }, 400);
      const payment = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
      if (payment.order_id !== orderId || payment.status !== "captured") return json({ success:false, error:"Payment is not captured yet. Please contact support if your account was charged." }, 409);
      const expectedPaise = Math.round(Number(booking.amount) * 100);
      if (payment.currency !== booking.currency || Number(payment.amount) !== expectedPaise) {
        return json({ success:false, error:"Captured payment amount or currency does not match this booking. Please contact support." }, 409);
      }
      const { data: updatedBooking, error: updateError } = await db.from("service_bookings").update({
        payment_status:"paid", razorpay_payment_id:paymentId, updated_at:new Date().toISOString()
      }).eq("id", bookingId).eq("payment_status","pending").select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updatedBooking) {
        const { data: currentBooking, error: currentError } = await db.from("service_bookings")
          .select("payment_status,razorpay_payment_id").eq("id", bookingId).single();
        if (currentError) throw currentError;
        if (currentBooking.payment_status === "paid" && currentBooking.razorpay_payment_id === paymentId) {
          return json({ success:true, booking_number:booking.booking_number, already_paid:true });
        }
        return json({ success:false, error:"Booking status changed during verification. Please contact support before retrying payment." }, 409);
      }
      return json({ success:true, booking_number:booking.booking_number });
    }
    return json({ success:false, error:"Unknown action." }, 400);
  } catch (error) {
    console.error("service-checkout error", error);
    return json({ success:false, error:"The service checkout could not be completed. Please try again or contact support." }, 500);
  }
});
