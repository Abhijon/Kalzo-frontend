/**
 * Razorpay Checkout for booking payments.
 * Order is created on the backend; this only opens Checkout and returns the success payload.
 */

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

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

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function loadCheckoutScript(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is only available in the browser."));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Razorpay) resolve(window.Razorpay);
        else reject(new Error("Razorpay failed to load."));
      });
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay failed to load."));
    };
    script.onerror = () => reject(new Error("Razorpay script failed to load."));
    document.head.appendChild(script);
  });
}

export type OpenCheckoutInput = {
  keyId: string;
  orderId: string;
  amountPaise: number;
  artistName?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

/** Opens Razorpay Checkout. Resolves on success; rejects if dismissed or script fails. */
export function openRazorpayCheckout(input: OpenCheckoutInput): Promise<RazorpaySuccess> {
  return loadCheckoutScript().then(
    (Razorpay) =>
      new Promise<RazorpaySuccess>((resolve, reject) => {
        let settled = false;
        const rzp = new Razorpay({
          key: input.keyId,
          amount: input.amountPaise,
          currency: "INR",
          name: "Kalzo",
          description: input.description || (input.artistName ? `Booking · ${input.artistName}` : "Booking"),
          order_id: input.orderId,
          prefill: input.prefill,
          theme: { color: "#E7A042" },
          handler(response) {
            settled = true;
            resolve(response);
          },
          modal: {
            ondismiss() {
              if (!settled) reject(new Error("Payment cancelled."));
            },
          },
        });
        rzp.open();
      }),
  );
}

/** @deprecated Prefer openRazorpayCheckout via bookingClick. */
export function startRazorpay() {
  return () => {};
}
