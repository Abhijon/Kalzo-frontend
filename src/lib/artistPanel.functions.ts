import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { cityRateSchema, normalizedCityRate } from "@/kalzo/extras/artist/flowRules";
export const artistPanelData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [a, b, n, w, p, loc] = await Promise.all([
      supabase.from("artist_profiles").select("*").eq("owner_id", userId).maybeSingle(),
      supabase
        .from("bookings")
        .select("*")
        .eq("artist_owner_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("artist_notifications")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("wallet_entries")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("artist_payout_accounts")
        .select("holder_name,account_last4,ifsc,bank_name,updated_at")
        .eq("owner_id", userId)
        .maybeSingle(),
      supabase
        .from("artist_location_preferences")
        .select("city,state,pricing")
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);
    const err = a.error || b.error || n.error || w.error || p.error || loc.error;
    if (err) throw new Error(err.message);
    return {
      artist: a.data,
      location: loc.data,
      bookings: b.data ?? [],
      notifications: n.data ?? [],
      wallet: w.data ?? [],
      payout: p.data,
    };
  });
export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("artist_notifications")
      .update({ read: true })
      .eq("owner_id", context.userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const savePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        holder: z.string().trim().min(2).max(100),
        number: z.string().regex(/^[0-9]{9,18}$/, "Account number must be 9 to 18 digits"),
        ifsc: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
        bank: z.string().trim().min(1, "Enter your bank name").max(100),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("kalzo_save_payout", {
      p_holder: data.holder,
      p_number: data.number,
      p_ifsc: data.ifsc,
      p_bank: data.bank,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const updateArtistLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        city: z.string().trim().min(1).max(100),
        state: z.string().trim().min(1).max(100),
        pricing: cityRateSchema,
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const p = normalizedCityRate(data.pricing);
    const { error: preferenceError } = await context.supabase
      .from("artist_location_preferences")
      .upsert({
        owner_id: context.userId,
        city: data.city,
        state: data.state,
        pricing: p,
        updated_at: new Date().toISOString(),
      });
    if (preferenceError) throw new Error(preferenceError.message);
    const { data: artist, error: readError } = await context.supabase
      .from("artist_profiles")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!artist) return { ok: true };
    const { error } = await context.supabase.rpc("kalzo_update_artist_location", {
      p_city: data.city,
      p_state: data.state,
      p_rate: p.rate,
      p_travel: p.travel,
      p_travel_charge: p.travel_charge,
      p_stay_charge: p.stay_charge,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
