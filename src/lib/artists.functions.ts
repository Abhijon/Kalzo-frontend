import { createServerFn } from "@tanstack/react-start";
import { ownsArtistMedia } from "./artistMedia";
export const publicArtists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data, error } = await db.rpc("kalzo_public_artists");
  if (error) throw new Error(error.message);
  return Promise.all(
    (data ?? []).map(async (a) => {
      const { data: media, error } = await db
        .from("artist_profiles")
        .select("owner_id,photo_path,reels,rate_inr,pricing_unit,travel_setting,travel_charge_inr,stay_charge_inr,city_rates")
        .eq("id", a.id)
        .eq("status", "approved")
        .eq("verification_status", "verified")
        .single();
      if (error || !media) throw new Error("Artist media unavailable.");
      // Public prices only (rates and travel), never fees or bank details.
      const pricing = {
        rate_inr: media.rate_inr,
        pricing_unit: media.pricing_unit,
        travel_setting: media.travel_setting,
        travel_charge_inr: media.travel_charge_inr,
        stay_charge_inr: media.stay_charge_inr,
        city_rates: media.city_rates,
      };
      const paths = [
        media.photo_path,
        ...(Array.isArray(media.reels)
          ? media.reels.filter((r): r is string => typeof r === "string")
          : []),
      ];
      if (paths.some((path) => !ownsArtistMedia(media.owner_id, path)))
        return { ...a, pricing, photo: "", reelUrls: [] };
      const { data: signed, error: signErr } = await db.storage
        .from("kalzo-media")
        .createSignedUrls(paths, 600);
      if (signErr) throw new Error(signErr.message);
      const urls = (signed ?? []).map((s) => s.signedUrl);
      return { ...a, pricing, photo: urls[0] ?? "", reelUrls: urls.slice(1) };
    }),
  );
});
