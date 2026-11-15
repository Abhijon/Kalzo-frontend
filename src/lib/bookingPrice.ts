// Server-side booking price. The browser never decides what a patron pays.
// Uses Kalzo's flat service-fee bands (see src/kalzo/extras/fees.ts).
import { z } from "zod";
import { serviceFee } from "@/kalzo/extras/fees";

export const bookingRequestSchema = z.object({
  artist_id: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  slot: z.string().trim().min(1, "Choose a time.").max(60),
  quantity: z.number().int().min(1).max(5000),
  city: z.string().trim().max(80).default(""),
  address: z.string().trim().min(8, "Add the full venue address.").max(400),
  guests: z.string().trim().max(60).default(""),
  note: z.string().trim().max(1000).default(""),
  expected_total: z.number().int().positive().optional(),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export type PricedArtist = {
  rate_inr: number;
  pricing_unit: string; // hour | event | plate
  travel_setting: string; // including | excluding | none
  travel_charge_inr: number;
  stay_charge_inr: number;
  city_rates: unknown;
};

type CityRate = { rate: number; travel: "included" | "separate" | "not_needed"; travel_charge?: number; stay_charge?: number };

function cityRate(rates: unknown, city: string): CityRate | null {
  if (!city || !rates || typeof rates !== "object") return null;
  const key = Object.keys(rates as Record<string, unknown>).find((k) => k.trim().toLowerCase() === city.trim().toLowerCase());
  const r = key ? (rates as Record<string, CityRate>)[key] : null;
  return r && Number.isInteger(r.rate) && r.rate > 0 ? r : null;
}

/** Highest quantity allowed for each pricing unit (hours, one event, or plates). */
export function maxQuantity(unit: string) {
  if (unit === "event") return 1;
  if (unit === "plate") return 5000;
  return 12;
}

/** Hourly (or per-event/plate) rate and travel + stay for a city. Same rules on the page and the server. */
export function artistCityPrice(artist: PricedArtist, city: string) {
  const local = cityRate(artist.city_rates, city);
  const rate = local?.rate ?? artist.rate_inr;
  let travel = 0, stay = 0;
  if (local) {
    if (local.travel === "separate") { travel = local.travel_charge ?? 0; stay = local.stay_charge ?? 0; }
  } else if (artist.travel_setting === "excluding") {
    travel = artist.travel_charge_inr || 0; stay = artist.stay_charge_inr || 0;
  }
  return { rate, travel: travel + stay, travelOnly: travel, stay };
}

export function priceBooking(artist: PricedArtist, req: Pick<BookingRequest, "quantity" | "city">) {
  const { rate, travelOnly: travel, stay } = artistCityPrice(artist, req.city);
  if (!Number.isInteger(rate) || rate <= 0) throw new Error("This artist has not set a price yet.");
  const qty = Math.min(req.quantity, maxQuantity(artist.pricing_unit));
  if (qty !== req.quantity) throw new Error("Choose a shorter booking.");
  const performance = rate * qty;
  const subtotal = performance + travel + stay;
  const fee = serviceFee(rate);
  return {
    rate,
    quantity: qty,
    performance,
    travel,
    stay,
    subtotal,
    fee,
    patronPays: subtotal + fee,
    artistNet: subtotal - fee,
  };
}

/** Two different random four-digit codes, from a cryptographic random source. */
export function newBookingCodes(rand: (n: number) => number = secureInt) {
  const arrival = String(rand(10000)).padStart(4, "0");
  let closing = arrival;
  while (closing === arrival) closing = String(rand(10000)).padStart(4, "0");
  return { arrival, closing };
}

function secureInt(n: number) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf); while ((buf[0] ?? 0) >= limit);
  return (buf[0] ?? 0) % n;
}

/** Codes stay valid until two days after the event. */
export function codesExpireAt(eventDate: string, now = Date.now()) {
  const t = Date.parse(eventDate + "T23:59:59+05:30");
  const base = Number.isFinite(t) ? t : now + 30 * 86400000;
  return new Date(Math.max(base, now) + 2 * 86400000).toISOString();
}

/** Constant-time comparison for signatures. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
