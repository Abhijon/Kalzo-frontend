import { api, unwrapData } from "@/lib/api";
import { ART_FORMS as FALLBACK } from "./rules";

let cache: Record<string, string[]> | null = null;
let inflight: Promise<Record<string, string[]>> | null = null;

function normalize(payload: unknown): Record<string, string[]> {
  const data = unwrapData(payload) as any;
  const rows = Array.isArray(data?.artForms) ? data.artForms : Array.isArray(data) ? data : [];
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const type = String(row?.type ?? "").trim();
    if (!type) continue;
    out[type] = Array.isArray(row?.subtypes)
      ? row.subtypes.map((s: unknown) => String(s)).filter(Boolean)
      : [];
  }
  return out;
}

/** Art forms for onboarding + filters — API first, hardcoded fallback. */
export async function loadArtForms(): Promise<Record<string, string[]>> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await api.catalogs.artForms();
    if (!res.error && res.data) {
      const map = normalize(res.data);
      if (Object.keys(map).length) {
        cache = map;
        return map;
      }
    }
    cache = { ...FALLBACK };
    return cache;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function getCachedArtForms(): Record<string, string[]> {
  return cache ?? { ...FALLBACK };
}
