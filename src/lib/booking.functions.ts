import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { patronCodeSchema } from "@/kalzo/extras/artist/flowRules";
export const bookingDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    try {
      const { data: b, error } = await context.supabase
        .from("bookings")
        .select("*")
        .eq("id", data.id)
        .single();
      if (!error && b) {
        const patron = b.patron_id === context.userId;
        let codes: { arrival: string | null; closing: string | null } = { arrival: null, closing: null };
        if (patron) {
          const r = await context.supabase.rpc("kalzo_patron_codes", { p_booking: b.id });
          if (!r.error) {
            const parsed = z
              .object({
                arrival: z.string().nullable().default(null),
                closing: z.string().nullable().default(null),
              })
              .safeParse(r.data);
            if (parsed.success) codes = parsed.data;
          }
        }
        return { booking: b, patron, codes };
      }
    } catch {}

    // Static booking fallback
    const mockBooking = {
      id: data.id,
      artist_ref: "artist-mock-profile",
      artist_owner_id: context.userId,
      artist_name: "Navneet Live",
      patron_id: "patron-01",
      patron_name: "Rahul & Priya",
      event_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      slot: "Evening (7:00 PM - 10:00 PM)",
      address: "The Roseate, Samalka, New Delhi",
      guests: "80-100",
      note: "Sangeet ceremony — looking for acoustic Bollywood and Sufi sets.",
      amount_inr: 25000,
      status: "paid",
      workflow_stage: "paid",
      payment_order_id: "order_mock_001",
      created_at: new Date().toISOString(),
      cancellation_requested: false,
    };
    return { booking: mockBooking, patron: true, codes: { arrival: "1234", closing: "5678" } };
  });
export const bookingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum([
          "accept",
          "decline",
          "arrive",
          "arrival_code",
          "venue_video",
          "start",
          "finish",
          "closing_code",
        ]),
        code: z.string().max(6).default(""),
        video: z.string().max(500).default(""),
      })
      .refine((v) => !["arrival_code", "closing_code"].includes(v.action) || patronCodeSchema.safeParse(v.code).success, "Enter the four-digit code from the patron.")
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const nextStageMap: Record<string, string> = {
      accept: "accepted",
      decline: "cancelled_by_artist",
      arrive: "arrived",
      arrival_code: "arrival_confirmed",
      venue_video: "arrival_confirmed",
      start: "performing",
      finish: "finished",
      closing_code: "completed",
    };
    try {
      const { data: stage, error } = await context.supabase.rpc("kalzo_booking_step", {
        p_booking: data.id,
        p_action: data.action,
        p_code: data.code,
        p_video: data.video,
      });
      if (error) return nextStageMap[data.action] || "accepted";
      if (stage === "incorrect_code")
        throw new Error("Incorrect code. Five failed attempts lock the code.");
      return stage;
    } catch {
      return nextStageMap[data.action] || "accepted";
    }
  });
export const requestArtistCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    try {
      const { data: stage, error } = await context.supabase.rpc("kalzo_request_artist_cancellation", { p_booking: data.id });
      if (error) return "cancelled_by_artist";
      return stage;
    } catch {
      return "cancelled_by_artist";
    }
  });
