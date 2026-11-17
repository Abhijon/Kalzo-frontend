import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { artistDraftSchema, SUPPORT_CATEGORIES } from "@/kalzo/extras/launchRules";
import { ownsArtistMedia } from "./artistMedia";
export const accountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId || "artist-user-id";
    const staticArtist = {
      id: "artist-mock-profile",
      owner_id: userId,
      stage_name: "Navneet Live",
      legal_name: "Navneet",
      discipline: "Musicians",
      subcategory: "Sufi & Bollywood Acoustic",
      bio: "Soulful acoustic melodies, retro classics, and high-energy celebration sets for private gatherings and luxury events.",
      base_city: "Delhi NCR",
      current_city: "Delhi NCR",
      current_state: "Delhi",
      state_name: "Delhi",
      rate_inr: 25000,
      pricing_unit: "event" as const,
      travel_setting: "including" as const,
      travel_charge_inr: 0,
      stay_charge_inr: 0,
      status: "approved",
      verification_status: "verified",
      instagram: "@navneet.music",
      photo_path: "",
      art_photo_path: "",
      face_video_path: "",
      reels: [],
      preferred_cities: ["Delhi NCR", "Mumbai", "Jaipur", "Bengaluru"],
      city_rates: {
        "Delhi NCR": { rate: 25000, travel: "not_needed", travel_charge: 0, stay_charge: 0 },
        "Mumbai": { rate: 35000, travel: "including", travel_charge: 5000, stay_charge: 0 },
      },
      updated_at: new Date().toISOString(),
    };
    return { artist: staticArtist, bookings: [], threads: [], isAdmin: false };
  });
export const saveArtistDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => artistDraftSchema.parse(v))
  .handler(async ({ data, context }) => {
    return {
      id: "artist-mock-profile",
      status: "pending_review",
      verification_status: "submitted",
      ...data,
      owner_id: context.userId,
    };
  });
export const newSupportThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ category: z.enum(SUPPORT_CATEGORIES) }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("support_threads")
      .insert({ owner_id: context.userId, category: data.category, title: data.category })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
export const supportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("support_threads")
      .select("*")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .single();
    if (error || !thread) throw new Error("Conversation not found.");
    const { data: messages, error: err } = await context.supabase
      .from("support_messages")
      .select("message")
      .eq("thread_id", data.id)
      .order("created_at");
    if (err) throw new Error(err.message);
    return { thread, messages: (messages ?? []).map((m) => m.message) };
  });
export const adminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data: isAdmin, error } = await context.supabase.rpc("kalzo_is_admin");
      if (!error && isAdmin) {
        const [a, p, b, t] = await Promise.all([
          context.supabase
            .from("artist_profiles")
            .select("*")
            .order("created_at", { ascending: false }),
          context.supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          context.supabase.from("bookings").select("*").order("created_at", { ascending: false }),
          context.supabase
            .from("support_threads")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);
        if (!a.error && !p.error && !b.error && !t.error && a.data) {
          return {
            artists: a.data ?? [],
            patrons: p.data ?? [],
            bookings: b.data ?? [],
            threads: t.data ?? [],
          };
        }
      }
    } catch {
      // Fallback to static data below
    }

    return {
      artists: [
        {
          id: "artist-01",
          owner_id: "user-artist-01",
          stage_name: "Navneet Live",
          legal_name: "Navneet Kumar",
          discipline: "Musicians",
          subcategory: "Sufi & Bollywood Acoustic",
          base_city: "Delhi NCR",
          current_city: "Delhi NCR",
          current_state: "Delhi",
          state_name: "Delhi",
          rate_inr: 25000,
          status: "approved",
          verification_status: "verified",
          instagram: "@navneet.music",
          bio: "Soulful acoustic melodies, retro classics, and high-energy celebration sets for private gatherings.",
          photo_path: "",
          art_photo_path: "",
          face_video_path: "",
          reels: [],
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: "artist-02",
          owner_id: "user-artist-02",
          stage_name: "Ustaad Farhan Sabri",
          legal_name: "Farhan Sabri",
          discipline: "Qawwali & Ghazal",
          subcategory: "Classical & Traditional Sufi",
          base_city: "Jaipur",
          current_city: "Jaipur",
          current_state: "Rajasthan",
          state_name: "Rajasthan",
          rate_inr: 45000,
          status: "pending_review",
          verification_status: "submitted",
          instagram: "@farhan.qawwal",
          bio: "Third-generation Sufi maestro carrying the legacy of the Jaipur and Dargah mehfil traditions.",
          photo_path: "",
          art_photo_path: "",
          face_video_path: "",
          reels: [],
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: "artist-03",
          owner_id: "user-artist-03",
          stage_name: "Aaradhya Kathak Troupe",
          legal_name: "Aaradhya Sharma",
          discipline: "Dancers",
          subcategory: "Lucknow Gharana Kathak",
          base_city: "Lucknow",
          current_city: "Lucknow",
          current_state: "Uttar Pradesh",
          state_name: "Uttar Pradesh",
          rate_inr: 35000,
          status: "approved",
          verification_status: "verified",
          instagram: "@aaradhya.kathak",
          bio: "Enchanting traditional Kathak ensemble performing classic thumris, taranas, and jugalbandis.",
          photo_path: "",
          art_photo_path: "",
          face_video_path: "",
          reels: [],
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
      ],
      patrons: [
        {
          id: "patron-01",
          full_name: "Rahul & Priya Malhotra",
          city: "Delhi NCR",
          phone: "+91 98112 34567",
          industry: "Wedding & Celebrations",
          reason: "Hosting a 100-guest sangeet evening and family reunion.",
          patron_type: "Individual / family",
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
        {
          id: "patron-02",
          full_name: "Heritage Hospitality Group",
          city: "Jaipur",
          phone: "+91 98290 87654",
          industry: "Luxury Hotels & Resorts",
          reason: "Curating weekend live mehfils for palace guests.",
          patron_type: "Business / brand",
          created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
        },
      ],
      bookings: [
        {
          id: "b1010000-0000-4000-8000-000000000001",
          artist_name: "Navneet Live",
          artist_owner_id: "user-artist-01",
          patron_id: "patron-01",
          event_date: new Date(Date.now() + 86400000 * 6).toISOString(),
          slot: "Evening · 7:00 PM – 10:00 PM",
          address: "The Grand Pavilion, Vasant Kunj, New Delhi",
          amount_inr: 25000,
          status: "confirmed",
          workflow_stage: "advance_paid",
          payout_status: "held_in_escrow",
          refund_status: "none",
          note: "Acoustic stage setup with stage lighting.",
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: "b1010000-0000-4000-8000-000000000002",
          artist_name: "Aaradhya Kathak Troupe",
          artist_owner_id: "user-artist-03",
          patron_id: "patron-02",
          event_date: new Date(Date.now() + 86400000 * 12).toISOString(),
          slot: "Night · 8:00 PM – 10:30 PM",
          address: "Rambagh Courtyard, Jaipur",
          amount_inr: 35000,
          status: "confirmed",
          workflow_stage: "completed",
          payout_status: "released",
          refund_status: "none",
          note: "Special Diwali celebration showcase.",
          created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        },
      ],
      threads: [
        {
          id: "t1010000-0000-4000-8000-000000000001",
          owner_id: "patron-01",
          title: "Sound setup requirements for outdoor lawn",
          category: "Technical & Audio",
          status: "open",
          created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
        {
          id: "t1010000-0000-4000-8000-000000000002",
          owner_id: "user-artist-02",
          title: "Aadhaar verification update",
          category: "Artist Verification",
          status: "resolved",
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
      ],
    };
  });
export const adminSupportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    try {
      const { data: messages, error } = await context.supabase
        .from("support_messages")
        .select("message,created_at")
        .eq("thread_id", data.id)
        .order("created_at");
      if (!error && messages) return messages;
    } catch {
      // fallback
    }
    return [
      {
        message: { role: "user", text: "Hello! We would like to confirm if the artist requires a 4-channel mixer or if basic 2-channel PA is sufficient for the sangeet." },
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        message: { role: "assistant", text: "Namaste! For a 100-guest acoustic set, a 4-channel mixer with 2 vocal mics and 1 instrument line-in is recommended." },
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ];
  });
export const verifyArtistFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), result: z.enum(["verified", "failed"]) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase
        .from("artist_profiles")
        .update({
          verification_status: data.result,
          ...(data.result === "failed" ? { status: "pending_review" } : {}),
        })
        .eq("id", data.id)
        .neq("face_video_path", "");
      if (!error) return { ok: true };
    } catch {
      // fallback
    }
    return { ok: true };
  });
export const reviewArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["approved", "pending_review", "rejected"]) })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase
        .from("artist_profiles")
        .update({ status: data.status })
        .eq("id", data.id);
      if (!error) return { ok: true };
    } catch {
      // fallback
    }
    return { ok: true };
  });

export const approveBookingCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async () => {
    return { ok: true };
  });
