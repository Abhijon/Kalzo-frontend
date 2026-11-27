import { api, unwrapData } from "@/lib/api";
import { openRazorpayCheckout } from "./razorpay";

export type BookRequest = {
  artist_id: string;
  artist_name: string;
  event_date: string;
  slot?: string;
  quantity: number;
  city: string;
  address: string;
  guests: string;
  note: string;
  expected_total: number;
};

const emit = (type: string, detail?: Record<string, unknown>) =>
  window.dispatchEvent(new CustomEvent(type, { detail }));

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bk_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Invitation seal → create booking → Razorpay order → Checkout → verify.
 * Idempotency-Key is stable for the life of one seal attempt so retries
 * reuse the same Razorpay order instead of double-charging.
 */
export function startDirectBooking() {
  const onBook = async (e: Event) => {
    const d = (e as CustomEvent<BookRequest>).detail;
    try {
      const { data: sess } = await api.auth.getSession();
      if (!sess?.session?.access_token) {
        emit("kalzo:book-failed", { reason: "Please log in again to book." });
        return;
      }

      const amountInr = Math.round(Number(d.expected_total) || 0);
      if (amountInr < 1) {
        emit("kalzo:book-failed", { reason: "Booking amount must be at least ₹1." });
        return;
      }

      const createRes = await api.bookings.create({
        artistId: d.artist_id,
        eventDate: d.event_date,
        address: d.address,
        guests: d.guests || undefined,
        note: d.note || undefined,
        amountInr,
      });

      if (createRes.error) {
        emit("kalzo:book-failed", { reason: createRes.error.message });
        return;
      }

      const created = unwrapData(createRes.data) as { booking?: { id?: string }; id?: string } | null;
      const bookingId = created?.booking?.id ?? created?.id;
      if (!bookingId) {
        emit("kalzo:book-failed", { reason: "Booking was created but no id was returned." });
        return;
      }

      const idempotencyKey = newIdempotencyKey();
      const orderRes = await api.payments.createOrder(bookingId, idempotencyKey);
      if (orderRes.error) {
        emit("kalzo:book-failed", {
          reason: orderRes.error.message || "Could not start payment. Your booking was saved — try again from My bookings.",
          booking_id: bookingId,
        });
        return;
      }

      const order = unwrapData(orderRes.data) as {
        orderId?: string;
        keyId?: string | null;
        amountPaise?: number;
        paymentStatus?: string;
      } | null;

      if (order?.paymentStatus === "paid") {
        emit("kalzo:booked", { booking_id: bookingId });
        window.location.assign(`/bookings/${bookingId}`);
        return;
      }

      if (!order?.orderId || !order?.keyId) {
        emit("kalzo:book-failed", {
          reason: "Payment order was incomplete. Try again from My bookings.",
          booking_id: bookingId,
        });
        return;
      }

      const amountPaise = order.amountPaise ?? amountInr * 100;
      let checkout;
      try {
        checkout = await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amountPaise,
          artistName: d.artist_name,
          description: `Kalzo booking · ${d.event_date}`,
        });
      } catch (err) {
        emit("kalzo:book-failed", {
          reason:
            err instanceof Error && err.message === "Payment cancelled."
              ? "Payment cancelled. Your invitation is saved — open it from My bookings to pay."
              : err instanceof Error
                ? err.message
                : "Payment window failed to open.",
          booking_id: bookingId,
        });
        return;
      }

      const verifyRes = await api.payments.verifyPayment(bookingId, {
        razorpay_order_id: checkout.razorpay_order_id,
        razorpay_payment_id: checkout.razorpay_payment_id,
        razorpay_signature: checkout.razorpay_signature,
      });

      if (verifyRes.error) {
        emit("kalzo:book-failed", {
          reason:
            verifyRes.error.message ||
            "Payment received but verification failed. Contact support with your booking id.",
          booking_id: bookingId,
        });
        return;
      }

      emit("kalzo:booked", { booking_id: bookingId });
      window.location.assign(`/bookings/${bookingId}`);
    } catch (err) {
      emit("kalzo:book-failed", {
        reason: err instanceof Error ? err.message : "The booking failed to start.",
      });
    }
  };

  window.addEventListener("kalzo:book", onBook);
  return () => window.removeEventListener("kalzo:book", onBook);
}
