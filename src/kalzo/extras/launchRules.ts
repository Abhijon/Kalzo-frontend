import { z } from "zod";
import { cityRateSchema } from "./artist/flowRules";
import { isAccountNumber, isIFSC } from "./validate";
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
export const reelPaths = z
  .array(z.string().min(1).max(500))
  .min(2, "Add at least two reels (two more are optional)")
  .max(4, "You can upload up to four reels");
export const INSTAGRAM_URL =
  /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/;
export const artistDraftSchema = z
  .object({
    stage_name: z.string().trim().min(1, "Enter your stage name").max(100),
    legal_name: z.string().trim().min(2, "Enter your name as shown on Aadhaar").max(100),
    current_state: z.string().trim().min(1, "Choose your current state").max(100),
    preferred_states: z.array(z.string().max(100)).max(20).default([]),
    discipline: z.string().trim().min(1, "Choose your art form").max(100),
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
    bio: z.string().trim().min(1, "Tell us about your act").max(2000, "Bio cannot exceed 2000 characters"),
    base_city: z.string().trim().min(1, "Choose your base city").max(100),
    state_name: z.string().trim().min(1, "Choose your base state").max(100),
    current_city: z.string().trim().min(1, "Choose your current city").max(100),
    rate_inr: z
      .number({
        required_error: "Enter your hourly rate in rupees",
        invalid_type_error: "Enter your hourly rate in rupees",
      })
      .int("Rate must be a whole number")
      .min(1, "Rate must be at least ₹1")
      .max(100000, "Rate cannot exceed ₹1,00,000"),
    photo_path: z.string().min(1, "Add your profile photograph").max(500),
    face_video_path: z.string().min(1, "Record and submit your live face video").max(500),
    instagram: z
      .string()
      .trim()
      .max(200)
      .refine((v) => INSTAGRAM_URL.test(v), "Use your full Instagram URL, e.g. https://instagram.com/yourname"),
    reels: reelPaths,
    primary_reel: z.number().int().min(0).max(3),
    pricing_unit: z.enum(["hour", "event", "plate"]),
    travel_setting: z.enum(["including", "excluding", "none"]),
    preferred_cities: z
      .array(z.string().trim().min(1).max(100))
      .min(1, "Choose at least one preferred city")
      .max(20),
  })
  .refine((v) => v.primary_reel < v.reels.length, {
    message: "Choose an uploaded primary reel",
    path: ["primary_reel"],
  })
  .refine(
    (v) =>
      v.travel_setting !== "excluding" ||
      (Number.isInteger(v.travel_charge_inr) && v.travel_charge_inr >= 0),
    { message: "Enter travel charges in rupees", path: ["travel_charge_inr"] },
  )
  .refine(
    (v) =>
      v.travel_setting !== "excluding" ||
      (Number.isInteger(v.stay_charge_inr) && v.stay_charge_inr >= 0),
    { message: "Enter stay and living charges in rupees", path: ["stay_charge_inr"] },
  );

/** Full submit payload for POST /artist/profile (text + bank + required media). */
export const artistProfileSubmitSchema = artistDraftSchema.and(
  z.object({
    bank_account_holder: z
      .string()
      .trim()
      .min(2, "Enter the account holder name")
      .max(100),
    bank_name: z.string().trim().min(2, "Enter the bank name").max(100),
    bank_account_number: z
      .string()
      .trim()
      .refine(isAccountNumber, "Account number must be 9–18 digits"),
    bank_ifsc: z
      .string()
      .trim()
      .refine(isIFSC, "Enter a valid 11-character IFSC (e.g. HDFC0001234)"),
    has_photo: z
      .boolean()
      .refine((v) => v, { message: "Add your profile photograph" }),
    has_art_photo: z
      .boolean()
      .refine((v) => v, { message: "Add your art photograph" }),
    has_face_video: z
      .boolean()
      .refine((v) => v, { message: "Record and submit your live face video" }),
    reel_count: z
      .number()
      .int()
      .min(2, "Add at least two reels (two more are optional)")
      .max(4, "You can upload up to four reels"),
    has_primary_reel: z
      .boolean()
      .refine((v) => v, { message: "Mark one uploaded reel as primary" }),
  }),
);

export type ArtistProfileField =
  | "stage_name"
  | "legal_name"
  | "base_city"
  | "state_name"
  | "current_city"
  | "current_state"
  | "preferred_cities"
  | "discipline"
  | "subcategory"
  | "bio"
  | "instagram"
  | "rate_inr"
  | "travel_setting"
  | "travel_charge_inr"
  | "stay_charge_inr"
  | "photo"
  | "art_photo"
  | "face_video"
  | "reels"
  | "primary_reel"
  | "bank_account_holder"
  | "bank_name"
  | "bank_account_number"
  | "bank_ifsc";

const FIELD_ALIASES: Record<string, ArtistProfileField> = {
  stage_name: "stage_name",
  legal_name: "legal_name",
  base_city: "base_city",
  state_name: "state_name",
  current_city: "current_city",
  current_state: "current_state",
  preferred_cities: "preferred_cities",
  discipline: "discipline",
  subcategory: "subcategory",
  bio: "bio",
  instagram: "instagram",
  rate_inr: "rate_inr",
  travel_setting: "travel_setting",
  travel_charge_inr: "travel_charge_inr",
  stay_charge_inr: "stay_charge_inr",
  photo_path: "photo",
  art_photo_path: "art_photo",
  face_video_path: "face_video",
  reels: "reels",
  reel_count: "reels",
  primary_reel: "primary_reel",
  has_primary_reel: "primary_reel",
  has_photo: "photo",
  has_art_photo: "art_photo",
  has_face_video: "face_video",
  bank_account_holder: "bank_account_holder",
  bank_name: "bank_name",
  bank_account_number: "bank_account_number",
  bank_ifsc: "bank_ifsc",
};

export type ArtistProfileAlert = {
  kind: "error" | "success" | "info";
  title: string;
  message: string;
};

export type ArtistProfileValidation =
  | { ok: true }
  | {
      ok: false;
      fields: Partial<Record<ArtistProfileField, string>>;
      alert: ArtistProfileAlert;
      firstField: ArtistProfileField | null;
    };

export function validateArtistProfileSubmit(input: {
  stage_name: string;
  legal_name: string;
  current_state: string;
  preferred_states: string[];
  discipline: string;
  subcategory: string;
  bio: string;
  base_city: string;
  state_name: string;
  current_city: string;
  rate_inr: number;
  instagram: string;
  photo_path: string;
  art_photo_path: string;
  face_video_path: string;
  reels: string[];
  primary_reel: number;
  pricing_unit: "hour" | "event" | "plate";
  travel_setting: "including" | "excluding" | "none";
  travel_charge_inr: number;
  stay_charge_inr: number;
  preferred_cities: string[];
  city_rates: Record<string, unknown>;
  bank_account_holder: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  has_photo: boolean;
  has_art_photo: boolean;
  has_face_video: boolean;
  reel_count: number;
  has_primary_reel: boolean;
}): ArtistProfileValidation {
  const parsed = artistProfileSubmitSchema.safeParse({
    ...input,
    travel_charge_inr: input.travel_setting === "excluding" ? input.travel_charge_inr : 0,
    stay_charge_inr: input.travel_setting === "excluding" ? input.stay_charge_inr : 0,
    // Keep path-based draft checks satisfied when files are present for multipart submit.
    photo_path: input.has_photo ? input.photo_path || "local:photo" : "",
    art_photo_path: input.has_art_photo ? input.art_photo_path || "local:art" : "",
    face_video_path: input.has_face_video ? input.face_video_path || "local:face" : "",
    reels: input.reel_count
      ? Array.from({ length: input.reel_count }, (_, i) => input.reels[i] || `local:reel:${i}`)
      : [],
  });
  if (parsed.success) return { ok: true };

  const fields: Partial<Record<ArtistProfileField, string>> = {};
  for (const issue of parsed.error.issues) {
    const raw = String(issue.path[0] ?? "");
    const key = FIELD_ALIASES[raw];
    if (!key || fields[key]) continue;
    fields[key] = issue.message;
  }
  const firstField = (Object.keys(fields)[0] as ArtistProfileField | undefined) ?? null;
  const firstMessage = firstField ? fields[firstField]! : "Please complete the required profile fields.";
  const count = Object.keys(fields).length;
  return {
    ok: false,
    fields,
    firstField,
    alert: {
      kind: "error",
      title: count > 1 ? `${count} details need attention` : "One detail needs attention",
      message: firstMessage,
    },
  };
}

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
