import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { cityRateSchema, normalizedCityRate } from "@/kalzo/extras/artist/flowRules";

/**
 * Artist Panel Data
 * Uses static mock data for artist profile, bookings, wallet, notifications and payouts
 * until your Node.js backend endpoints are ready.
 */
export const artistPanelData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId || "artist-user-id";

    // Neutral artist panel data fallback
    const staticArtist = {
      id: "artist-mock-profile",
      owner_id: userId,
      stage_name: "",
      legal_name: "",
      discipline: "Musicians",
      subcategory: "",
      bio: "",
      base_city: "",
      current_city: "",
      current_state: "",
      state_name: "",
      rate_inr: 2000,
      pricing_unit: "hour" as const,
      travel_setting: "including" as const,
      travel_charge_inr: 0,
      stay_charge_inr: 0,
      status: "pending_review",
      verification_status: "unverified",
      instagram: "",
      photo_path: "",
      art_photo_path: "",
      face_video_path: "",
      reels: [],
      preferred_cities: [] as string[],
      city_rates: {} as Record<string, any>,
      updated_at: new Date().toISOString(),
    };

    const staticLocation = {
      city: "",
      state: "",
      pricing: {
        rate: 2000,
        travel: "not_needed" as const,
        travel_charge: 0,
        stay_charge: 0,
      },
    };

    const staticBookings: any[] = [];
    const staticNotifications: any[] = [];
    const staticWallet: any[] = [];
    const staticPayout = null;

    return {
      artist: staticArtist,
      location: staticLocation,
      bookings: staticBookings,
      notifications: staticNotifications,
      wallet: staticWallet,
      payout: staticPayout,
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
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
  .handler(async () => {
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
  .handler(async ({ data }) => {
    return { ok: true, location: normalizedCityRate(data.pricing) };
  });
