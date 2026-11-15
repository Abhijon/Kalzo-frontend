// Server-only: confirms a Razorpay payment against its booking and issues booking codes.
import { codesExpireAt, newBookingCodes, safeEqual } from "@/lib/bookingPrice";
import { hmacHex, razorpayApi, razorpayKeys, type RazorpayPayment } from "@/lib/razorpay-server";

export type ConfirmInput = {
  booking_id: string;
  patron_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export type ConfirmResult = { ok: true; status: "paid" } | { ok: false; status: "pending" | "error"; message: string };

/**
 * A booking is marked paid only when Razorpay itself reports a captured payment
 * for this booking's own order, for exactly the amount Kalzo calculated.
 * Safe to call more than once (for example after a closed checkout tab).
 */
export async function confirmBookingPayment(input: ConfirmInput): Promise<ConfirmResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: b, error } = await supabaseAdmin
    .from("bookings")
    .select("id,patron_id,status,amount_inr,payment_order_id,event_date")
    .eq("id", input.booking_id)
    .maybeSingle();
  if (error || !b || b.patron_id !== input.patron_id) return { ok: false, status: "error", message: "Booking not found." };
  if (b.status === "paid") return { ok: true, status: "paid" };
  if (b.status !== "awaiting_payment" || !b.payment_order_id) return { ok: false, status: "error", message: "This booking is not waiting for payment." };
  if (input.razorpay_order_id && input.razorpay_order_id !== b.payment_order_id)
    return { ok: false, status: "error", message: "This payment belongs to a different booking." };

  // 1. If the checkout handed us a signature, it must match.
  if (input.razorpay_payment_id) {
    const k = razorpayKeys();
    if (!k) return { ok: false, status: "error", message: "Payments are not configured." };
    const expected = await hmacHex(k.secret, b.payment_order_id + "|" + input.razorpay_payment_id);
    if (!safeEqual(expected, input.razorpay_signature ?? "")) return { ok: false, status: "error", message: "The payment signature did not match." };
  }

  // 2. The order must be the one Kalzo's server created for this exact booking and amount.
  const order = await razorpayApi<{ id: string; amount: number; currency: string; notes?: Record<string, string> }>(
    "/orders/" + encodeURIComponent(b.payment_order_id),
  );
  if (order.notes?.["booking_id"] !== b.id || order.amount !== b.amount_inr * 100 || order.currency !== "INR")
    return { ok: false, status: "error", message: "This payment does not belong to this booking." };

  // 3. Ask Razorpay what really happened on this order.
  let payment: RazorpayPayment | undefined;
  if (input.razorpay_payment_id) {
    payment = await razorpayApi<RazorpayPayment>("/payments/" + encodeURIComponent(input.razorpay_payment_id));
  } else {
    const list = await razorpayApi<{ items: RazorpayPayment[] }>("/orders/" + encodeURIComponent(b.payment_order_id) + "/payments");
    payment = list.items.find((p) => p.status === "captured") ?? list.items.find((p) => p.status === "authorized");
  }
  if (!payment) return { ok: false, status: "pending", message: "No payment has been received for this booking yet." };

  const paise = b.amount_inr * 100;
  if (payment.order_id !== b.payment_order_id || payment.amount !== paise || payment.currency !== "INR")
    return { ok: false, status: "error", message: "The payment amount did not match this booking. Kalzo support will review it." };

  if (payment.status === "authorized") {
    payment = await razorpayApi<RazorpayPayment>("/payments/" + encodeURIComponent(payment.id) + "/capture", {
      method: "POST",
      body: { amount: paise, currency: "INR" },
    });
  }
  if (payment.status !== "captured") return { ok: false, status: "pending", message: "The payment is still processing. Please check again in a minute." };

  // 4. Mark paid exactly once; the database then notifies the artist.
  const { data: updated, error: upErr } = await supabaseAdmin
    .from("bookings")
    .update({ status: "paid", workflow_stage: "paid", payment_id: payment.id })
    .eq("id", b.id)
    .eq("status", "awaiting_payment")
    .select("id");
  if (upErr) return { ok: false, status: "error", message: "The payment was received but the booking could not be updated. Kalzo support will fix it." };
  if (!updated?.length) return { ok: true, status: "paid" };

  // 5. One-time arrival and closing codes, private to the patron.
  const codes = newBookingCodes();
  const { error: codeErr } = await supabaseAdmin.from("booking_codes").upsert(
    { booking_id: b.id, arrival_code: codes.arrival, closing_code: codes.closing, expires_at: codesExpireAt(b.event_date) },
    { onConflict: "booking_id", ignoreDuplicates: true },
  );
  if (codeErr) console.error("[Kalzo] booking codes not created", b.id, codeErr.message);
  return { ok: true, status: "paid" };
}
