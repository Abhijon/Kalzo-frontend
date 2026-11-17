import { createServerFn } from "@tanstack/react-start";
import { api, artistListFrom } from "@/lib/api";
import { ownsArtistMedia } from "./artistMedia";

/**
 * Public verified artists for the browse UI.
 * Uses GET /api/v1/artists/verified (paginated flat list).
 */
export const publicArtists = createServerFn({ method: "GET" }).handler(async () => {
  const res = await api.artists.listVerified({ page: 1, limit: 100 });
  if (res.error) throw new Error(res.error.message);

  const rows = artistListFrom(res.data);
  return Promise.all(
    rows.map(async (a) => {
      const owner = a.owner_id || "";
      const pricing = {
        rate_inr: a.rate_inr,
        pricing_unit: a.pricing_unit,
        travel_setting: a.travel_setting,
        travel_charge_inr: a.travel_charge_inr,
        stay_charge_inr: a.stay_charge_inr,
        city_rates: a.city_rates,
      };
      const reelPaths = Array.isArray(a.reels)
        ? a.reels.filter((r: unknown): r is string => typeof r === "string")
        : [];
      const paths = [a.photo_path, ...reelPaths].filter(Boolean) as string[];
      if (owner && paths.some((path) => !ownsArtistMedia(owner, path))) {
        return {
          ...a,
          pricing,
          photo: "",
          reelUrls: [] as string[],
        };
      }
      const urls = await Promise.all(
        paths.map(async (path) => {
          const { data } = await api.storage.from("kalzo-media").createSignedUrl(path, 600);
          return data?.signedUrl ?? "";
        }),
      );
      return {
        ...a,
        pricing,
        photo: urls[0] ?? "",
        reelUrls: urls.slice(1),
      };
    }),
  );
});
