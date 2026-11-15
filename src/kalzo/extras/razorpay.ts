import { api } from "@/lib/api";

// Fallback publishable key id (safe in the browser). The server sends the key it actually uses.
const FALLBACK_KEY_ID = "rzp_live_TzDuU1GaYMOr2W";

export type PayRequest = {
  artist_id: string;
  artist_name: string;
  event_date: string;
  slot: string;
  quantity: number;
  city: string;
  address: string;
  guests: string;
  note: string;
  expected_total: number;
};

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: unknown) => void): void };
  }
}

function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("The payment window could not load. Check your connection and try again."));
    document.head.appendChild(s);
  });
}

const emit = (type: string, detail?: Record<string, unknown>) => window.dispatchEvent(new CustomEvent(type, { detail }));

// When the server says the total differs (e.g. city pricing), the next tap confirms the server's total.
const confirmedTotals = new Map<string, number>();

type OrderResponse = { booking_id?: string; order_id?: string; amount?: number; currency?: string; key_id?: string; error?: string; total?: number };

/** Listens for `kalzo:pay`, creates the booking + order on the server, opens Razorpay, then verifies on the server. */
export function startRazorpay() {
  const onPay = async (e: Event) => {
    const d = (e as CustomEvent<PayRequest>).detail;
    try {
      const { data: sess } = await api.auth.getSession();
      const token = sess?.session?.access_token;
      const user = sess?.session?.user;
      if (!token || !user) { emit("kalzo:pay-failed", { reason: "Please log in again to pay." }); return; }
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const priceKey = `${d.artist_id}|${d.city}|${d.quantity}`;
      const body = { ...d, expected_total: confirmedTotals.get(priceKey) ?? d.expected_total };
      const res = await fetch("/api/create-order", { method: "POST", headers, body: JSON.stringify(body) });
      const order = (await res.json().catch(() => null)) as OrderResponse | null;
      if (res.status === 409 && order?.total) {
        confirmedTotals.set(priceKey, order.total);
        emit("kalzo:pay-failed", { reason: order.error });
        return;
      }
      if (!res.ok || !order?.order_id || !order.booking_id) {
        emit("kalzo:pay-failed", { reason: order?.error || "The payment could not be started." });
        return;
      }
      const bookingId = order.booking_id;
      await loadCheckout();
      const { data: prof } = await api.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      const rzp = new window.Razorpay!({
        key: order.key_id || FALLBACK_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "Kalzo",
        description: `Booking · ${d.artist_name}`,
        prefill: { name: prof?.full_name || "", contact: prof?.phone || "", email: user.email || "" },
        notes: { booking_id: bookingId },
        theme: { color: "#8A6D3B" },
        modal: { ondismiss: () => emit("kalzo:pay-cancelled") },
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const vres = await fetch("/api/verify-payment", { method: "POST", headers, body: JSON.stringify({ ...resp, booking_id: bookingId }) });
          const v = (await vres.json().catch(() => null)) as { status?: string; error?: string } | null;
          if (vres.ok && v?.status === "paid") {
            emit("kalzo:paid", { booking_id: bookingId });
            window.location.assign(`/bookings/${bookingId}?paid=1`);
          }
          else emit("kalzo:pay-failed", {
            reason: (v?.error || "We couldn't confirm the payment yet.") + " Open My bookings to check; if money was taken, the booking updates automatically.",
          });
        },
      });
      rzp.on("payment.failed", () => emit("kalzo:pay-failed", { reason: "The payment didn't go through. Nothing was charged — please try again." }));
      rzp.open();
    } catch (err) {
      emit("kalzo:pay-failed", { reason: err instanceof Error ? err.message : "The payment failed to start." });
    }
  };
  window.addEventListener("kalzo:pay", onPay);
  return () => window.removeEventListener("kalzo:pay", onPay);
}
