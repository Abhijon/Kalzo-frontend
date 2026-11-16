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

    // Static artist profile matching current logged in artist
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
        "Jaipur": { rate: 30000, travel: "including", travel_charge: 3000, stay_charge: 0 },
      },
      updated_at: new Date().toISOString(),
    };

    const staticLocation = {
      city: "Delhi NCR",
      state: "Delhi",
      pricing: {
        rate: 25000,
        travel: "not_needed" as const,
        travel_charge: 0,
        stay_charge: 0,
      },
    };

    const staticBookings = [
      {
        id: "b1010000-0000-4000-8000-000000000001",
        artist_ref: "artist-mock-profile",
        artist_owner_id: userId,
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
        workflow_stage: "paid", // Shows under "Booking requests" for accept/decline
        payment_order_id: "order_mock_001",
        created_at: new Date().toISOString(),
        cancellation_requested: false,
      },
      {
        id: "b1020000-0000-4000-8000-000000000002",
        artist_ref: "artist-mock-profile",
        artist_owner_id: userId,
        artist_name: "Navneet Live",
        patron_id: "patron-02",
        patron_name: "Vikram Malhotra",
        event_date: new Date(Date.now() + 86400000 * 6).toISOString().slice(0, 10),
        slot: "Night (8:00 PM - 11:00 PM)",
        address: "ITC Maurya, Diplomatic Enclave, New Delhi",
        guests: "120",
        note: "Annual corporate gala dinner.",
        amount_inr: 25000,
        status: "paid",
        workflow_stage: "accepted", // In progress
        payment_order_id: "order_mock_002",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        cancellation_requested: false,
      },
      {
        id: "b1030000-0000-4000-8000-000000000003",
        artist_ref: "artist-mock-profile",
        artist_owner_id: userId,
        artist_name: "Navneet Live",
        patron_id: "patron-03",
        patron_name: "Ananya Sen",
        event_date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
        slot: "Evening (6:30 PM - 9:30 PM)",
        address: "Olive Bar & Kitchen, Mehrauli, New Delhi",
        guests: "45",
        note: "Intimate anniversary mehfil.",
        amount_inr: 25000,
        status: "paid",
        workflow_stage: "completed", // Past completed
        payment_order_id: "order_mock_003",
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        cancellation_requested: false,
      },
    ];

    const staticNotifications = [
      {
        id: "notif-001",
        owner_id: userId,
        kind: "booking",
        title: "New Booking Request",
        body: "Rahul & Priya invited you to perform at The Roseate on " + new Date(Date.now() + 86400000 * 3).toLocaleDateString("en-IN") + ".",
        read: false,
        booking_id: "b1010000-0000-4000-8000-000000000001",
        created_at: new Date().toISOString(),
      },
      {
        id: "notif-002",
        owner_id: userId,
        kind: "meeting",
        title: "Call Invitation",
        body: "Rahul & Priya requested a 15-minute consultation call.",
        read: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "notif-003",
        owner_id: userId,
        kind: "payment",
        title: "Payout Cleared",
        body: "₹25,000 was settled to your HDFC bank account for Olive Bar & Kitchen performance.",
        read: true,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: "notif-004",
        owner_id: userId,
        kind: "rating",
        title: "5-Star Review Received",
        body: "Ananya Sen left a 5-star review: 'Soulful voice and incredible presence!'",
        read: true,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ];

    const staticWallet = [
      {
        id: "wallet-001",
        owner_id: userId,
        amount_inr: 6250,
        kind: "advance",
        status: "available",
        booking_id: "b1020000-0000-4000-8000-000000000002",
        release_after: new Date().toISOString(),
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "wallet-002",
        owner_id: userId,
        amount_inr: 18750,
        kind: "balance",
        status: "released",
        booking_id: "b1030000-0000-4000-8000-000000000003",
        release_after: new Date(Date.now() - 86400000 * 4).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: "wallet-003",
        owner_id: userId,
        amount_inr: 18750,
        kind: "balance",
        status: "pending",
        booking_id: "b1020000-0000-4000-8000-000000000002",
        release_after: new Date(Date.now() + 86400000 * 6).toISOString(),
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const staticPayout = {
      holder_name: "Navneet",
      account_last4: "5848",
      ifsc: "HDFC0001234",
      bank_name: "HDFC Bank",
      updated_at: new Date().toISOString(),
    };

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
