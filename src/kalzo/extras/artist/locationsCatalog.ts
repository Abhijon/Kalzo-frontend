import { api, unwrapData } from "@/lib/api";
import fallbackLocations from "./locations.json";

export type LocationRow = { name: string; cities: string[] };

let cache: LocationRow[] | null = null;
let inflight: Promise<LocationRow[]> | null = null;

function normalize(payload: unknown): LocationRow[] {
  const data = unwrapData(payload) as any;
  const rows = Array.isArray(data?.locations) ? data.locations : Array.isArray(data) ? data : [];
  return rows
    .map((r: any) => ({
      name: String(r?.name ?? r?.state ?? "").trim(),
      cities: Array.isArray(r?.cities)
        ? r.cities.map((c: any) => (typeof c === "string" ? c : String(c?.name ?? ""))).filter(Boolean)
        : [],
    }))
    .filter((r: LocationRow) => r.name);
}

/** Shared locations for base/current/preferred city pickers — API first, JSON fallback. */
export async function loadLocations(): Promise<LocationRow[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await api.catalogs.locations();
    if (!res.error && res.data) {
      const rows = normalize(res.data);
      if (rows.length) {
        cache = rows;
        return rows;
      }
    }
    cache = fallbackLocations as LocationRow[];
    return cache;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function getCachedLocations(): LocationRow[] {
  return cache ?? (fallbackLocations as LocationRow[]);
}
