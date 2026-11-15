import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { patronCodeSchema } from "@/kalzo/extras/artist/flowRules";
export const bookingDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !b) throw new Error("Booking not found.");
    const patron = b.patron_id === context.userId;
    let codes: { arrival: string | null; closing: string | null } = {
      arrival: null,
      closing: null,
    };
    if (patron) {
      const r = await context.supabase.rpc("kalzo_patron_codes", { p_booking: b.id });
      if (r.error) throw new Error(r.error.message);
      const parsed = z
        .object({
          arrival: z.string().nullable().default(null),
          closing: z.string().nullable().default(null),
        })
        .safeParse(r.data);
      if (parsed.success) codes = parsed.data;
    }
    return { booking: b, patron, codes };
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
    const { data: stage, error } = await context.supabase.rpc("kalzo_booking_step", {
      p_booking: data.id,
      p_action: data.action,
      p_code: data.code,
      p_video: data.video,
    });
    if (error) throw new Error(error.message);
    if (stage === "incorrect_code")
      throw new Error("Incorrect code. Five failed attempts lock the code.");
    return stage;
  });
export const requestArtistCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: stage, error } = await context.supabase.rpc("kalzo_request_artist_cancellation", { p_booking: data.id });
    if (error) throw new Error(error.message);
    return stage;
  });
