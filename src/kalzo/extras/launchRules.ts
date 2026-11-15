import { z } from "zod";
import { cityRateSchema } from "./artist/flowRules";
export const SUPPORT_CATEGORIES = [
  "Booking inquiry",
  "Recent booking",
  "Artist acceptance",
  "Arrival or closing code",
  "Payment",
  "Cancellation or refund",
  "Artist payout",
  "Profile and reels",
  "Identity verification",
  "Other help",
] as const;
export const reelPaths = z.array(z.string().min(1).max(500)).min(2).max(4);
export const artistDraftSchema = z
  .object({
    stage_name: z.string().trim().min(1).max(100),
    legal_name: z.string().trim().min(2, "Enter your name as shown on Aadhaar").max(100),
    current_state: z.string().trim().min(1, "Choose your current state").max(100),
    preferred_states: z.array(z.string().max(100)).max(20).default([]),
    discipline: z.string().trim().min(1).max(100),
    subcategory: z.string().trim().min(1, "Choose or describe your art speciality").max(100),
    art_photo_path: z.string().min(1, "Add your art photograph").max(500),
    travel_charge_inr: z.number().int().min(0).max(500000).default(0),
    stay_charge_inr: z.number().int().min(0).max(500000).default(0),
    city_rates: z
      .record(
        z.string().max(100),
        cityRateSchema,
      )
      .default({}),
    bio: z.string().trim().min(1, "Tell us about your act").max(2000),
    base_city: z.string().trim().min(1).max(100),
    state_name: z.string().trim().min(1).max(100),
    current_city: z.string().trim().min(1, "Choose your current city").max(100),
    rate_inr: z.number().int().min(1).max(100000),
    photo_path: z.string().min(1).max(500),
    face_video_path: z.string().min(1, "Record and submit your live face video").max(500),
    instagram: z
      .string()
      .max(200)
      .refine(
        (v) => /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(v),
        "Use your Instagram profile URL",
      ),
    reels: reelPaths,
    primary_reel: z.number().int().min(0).max(3),
    pricing_unit: z.enum(["hour", "event", "plate"]),
    travel_setting: z.enum(["including", "excluding", "none"]),
    preferred_cities: z.array(z.string().trim().min(1).max(100)).min(1, "Choose at least one preferred city").max(20),
  })
  .refine((v) => v.primary_reel < v.reels.length, "Choose an uploaded primary reel");
export function canPublishArtist(a: {
  verification_status: string;
  photo_path: string;
  face_video_path: string;
  reels: unknown[];
}) {
  return (
    a.verification_status === "verified" &&
    !!a.photo_path &&
    !!a.face_video_path &&
    a.reels.length >= 2 &&
    a.reels.length <= 4
  );
}
export function isSampleArtist(ref: string) {
  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
}
