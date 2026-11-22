import { createServerFn } from "@tanstack/react-start";
import { api, artistListFrom, unwrapData } from "@/lib/api";

/**
 * Public verified artists for the browse UI.
 * Uses GET /api/v1/artists/verified — response already includes S3 photoUrl / artPhotoUrl / reelUrls.
 * Also loads recurring weekday availability for THIS WEEK tiles.
 */
export const publicArtists = createServerFn({ method: "GET" }).handler(async () => {
  const res = await api.artists.listVerified({ page: 1, limit: 100 });
  if (res.error) throw new Error(res.error.message);

  const rows = artistListFrom(res.data);
  return Promise.all(
    rows.map(async (a) => {
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

      let weekAvailability: Array<{ weekday: number; day: string; isActive: boolean }> = [];
      try {
        const availRes = await api.availability.forArtist(a.id);
        if (!availRes.error && availRes.data) {
          const data = unwrapData(availRes.data) as { days?: typeof weekAvailability };
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
    }),
  );
});
