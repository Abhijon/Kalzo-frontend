import { createFileRoute } from "@tanstack/react-router";
import { callerUser, paymentsOpenFor, razorpayApi, razorpayKeys } from "@/lib/razorpay-server";
import { bookingRequestSchema, priceBooking } from "@/lib/bookingPrice";

const PAUSED = "Bookings open soon. Payments are switched off while Kalzo verifies its first artists.";

export const Route = createFileRoute("/api/create-order")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const user = await callerUser(request);
    if (!user) return Response.json({ error: "Please sign in to pay." }, { status: 401 });
    if (!paymentsOpenFor(user.email)) return Response.json({ error: PAUSED }, { status: 503 });
    const keys = razorpayKeys();
    if (!keys) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });

    const parsed = bookingRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the booking details." }, { status: 400 });
    const req = parsed.data;
    if (Date.parse(req.event_date + "T23:59:59+05:30") < Date.now())
      return Response.json({ error: "Choose today or a future date." }, { status: 400 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: artist } = await supabaseAdmin
      .from("artist_profiles")
      .select("id,owner_id,stage_name,status,verification_status,rate_inr,pricing_unit,travel_setting,travel_charge_inr,stay_charge_inr,city_rates")
      .eq("id", req.artist_id)
      .maybeSingle();
    if (!artist || artist.status !== "approved" || artist.verification_status !== "verified")
      return Response.json({ error: "This artist is not available for booking." }, { status: 404 });
    if (artist.owner_id === user.id) return Response.json({ error: "You can't book your own profile." }, { status: 400 });

    let price;
    try { price = priceBooking(artist, req); }
    catch (e) { return Response.json({ error: e instanceof Error ? e.message : "This booking can't be priced." }, { status: 400 }); }

    if (req.expected_total !== undefined && req.expected_total !== price.patronPays)
      return Response.json({
        error: `The total for this booking is ₹${price.patronPays.toLocaleString("en-IN")}. Tap pay again to confirm.`,
        total: price.patronPays,
      }, { status: 409 });

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        patron_id: user.id,
        artist_ref: artist.id,
        artist_owner_id: artist.owner_id,
        artist_name: artist.stage_name,
        event_date: req.event_date,
        slot: req.slot,
        address: req.address,
        guests: req.guests,
        note: req.note,
        quantity: price.quantity,
        amount_inr: price.patronPays,
        performance_subtotal_inr: price.subtotal,
        artist_fee_inr: price.fee,
        artist_net_inr: price.artistNet,
        status: "awaiting_payment",
        workflow_stage: "awaiting_payment",
      })
      .select("id")
      .single();
    if (error || !booking) return Response.json({ error: "The booking could not be saved. Please try again." }, { status: 500 });

    try {
      const order = await razorpayApi<{ id: string; amount: number; currency: string }>("/orders", {
        method: "POST",
        body: { amount: price.patronPays * 100, currency: "INR", receipt: booking.id.replace(/-/g, "").slice(0, 32), notes: { booking_id: booking.id } },
      });
      await supabaseAdmin.from("bookings").update({ payment_order_id: order.id }).eq("id", booking.id);
      return Response.json({
        booking_id: booking.id, order_id: order.id, amount: order.amount, currency: order.currency, key_id: keys.id,
        price: { rate: price.rate, quantity: price.quantity, travel: price.travel, stay: price.stay, fee: price.fee, total: price.patronPays },
      });
    } catch {
      await supabaseAdmin.from("bookings").update({ status: "payment_failed", workflow_stage: "payment_failed" }).eq("id", booking.id);
      return Response.json({ error: "The payment could not be started. Please try again." }, { status: 502 });
    }
  } } },
});
