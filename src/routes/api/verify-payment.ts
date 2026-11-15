import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { callerUser } from "@/lib/razorpay-server";
import { confirmBookingPayment } from "@/lib/payment.server";

const bodySchema = z.object({
  booking_id: z.string().uuid(),
  razorpay_order_id: z.string().max(60).optional(),
  razorpay_payment_id: z.string().max(60).optional(),
  razorpay_signature: z.string().max(200).optional(),
});

// Called by the checkout after payment, and by the booking page to recover a payment if the tab was closed.
export const Route = createFileRoute("/api/verify-payment")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const user = await callerUser(request);
    if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Missing payment details." }, { status: 400 });
    try {
      const r = await confirmBookingPayment({ booking_id: parsed.data.booking_id, razorpay_order_id: parsed.data.razorpay_order_id ?? "", razorpay_payment_id: parsed.data.razorpay_payment_id ?? "", razorpay_signature: parsed.data.razorpay_signature ?? "", patron_id: user.id });
      if (r.ok) return Response.json({ status: "paid" });
      return Response.json({ status: r.status, error: r.message }, { status: r.status === "pending" ? 202 : 400 });
    } catch (e) {
      console.error("[Kalzo] verify-payment", e);
      return Response.json({ status: "error", error: "We couldn't reach the payment service. Please check again in a minute." }, { status: 502 });
    }
  } } },
});
