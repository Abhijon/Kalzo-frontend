import { createServerFn } from "@tanstack/react-start";
import { api, artistListFrom, unwrapData } from "@/lib/api";

export type VerifiedArtistQuery = {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  /** all | current | base | preferred (aliases visiting, pref) */
  tier?: string;
  discipline?: string;
  subcategory?: string;
  maxRate?: number;
  /** At least one active weekday */
  anyDay?: boolean;
  date?: string;
  weekday?: number;
  day?: string;
};

type WeekDay = { weekday: number; day: string; isActive: boolean };

/** Map one verified-list row into the shape KalzoLogic expects. */
async function enrichVerifiedArtist(a: Record<string, any>) {
  const pricing = {
    rate_inr: a.rate_inr,
    pricing_unit: a.pricing_unit,
    travel_setting: a.travel_setting,
    travel_charge_inr: a.travel_charge_inr,
    stay_charge_inr: a.stay_charge_inr,
    city_rates: a.city_rates,
  };
  const photo =
    (typeof a.photo_url === "string" && a.photo_url) ||
    (typeof a.photoUrl === "string" && a.photoUrl) ||
    "";
  const artPhoto =
    (typeof a.art_photo_url === "string" && a.art_photo_url) ||
    (typeof a.artPhotoUrl === "string" && a.artPhotoUrl) ||
    "";
  const faceVideoUrl =
    (typeof a.face_video_url === "string" && a.face_video_url) ||
    (typeof a.faceVideoUrl === "string" && a.faceVideoUrl) ||
    "";
  const reelUrls = Array.isArray(a.reel_urls)
    ? a.reel_urls.filter((u: unknown): u is string => typeof u === "string" && !!u)
    : Array.isArray(a.reelUrls)
      ? a.reelUrls.filter((u: unknown): u is string => typeof u === "string" && !!u)
      : [];

  let weekAvailability: WeekDay[] = [];
  try {
    const availRes = await api.availability.forArtist(a.id);
    if (!availRes.error && availRes.data) {
      const data = unwrapData(availRes.data) as { days?: WeekDay[] };
      weekAvailability = Array.isArray(data?.days) ? data.days : [];
    }
  } catch {
    weekAvailability = [];
  }

  return {
    ...a,
    pricing,
    photo,
    artPhoto,
    faceVideoUrl,
    reelUrls,
    weekAvailability,
  };
}

/**
 * Client + server helper: GET /artists/verified with optional city/state/tier filters.
 */
export async function loadVerifiedArtistsList(params: VerifiedArtistQuery = {}) {
  const res = await api.artists.listVerified({
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    ...(params.city ? { city: params.city } : {}),
    ...(params.state ? { state: params.state } : {}),
    ...(params.city || params.state ? { tier: params.tier || "all" } : {}),
    ...(params.discipline ? { discipline: params.discipline } : {}),
    ...(params.subcategory ? { subcategory: params.subcategory } : {}),
    ...(params.maxRate != null ? { maxRate: params.maxRate } : {}),
    ...(params.anyDay ? { anyDay: true } : {}),
    ...(!params.anyDay && params.date ? { date: params.date } : {}),
    ...(!params.anyDay && params.weekday != null ? { weekday: params.weekday } : {}),
    ...(!params.anyDay && params.day ? { day: params.day } : {}),
  });
  if (res.error) throw new Error(res.error.message);

  const rows = artistListFrom(res.data);
  return Promise.all(rows.map((a) => enrichVerifiedArtist(a)));
}

/**
 * Public verified artists for the browse UI (initial load — no location filter).
 */
export const publicArtists = createServerFn({ method: "GET" }).handler(async () => {
  return loadVerifiedArtistsList({ page: 1, limit: 100 });
});
