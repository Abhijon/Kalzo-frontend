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

/** Accept snake_case or camelCase rows from the Node API / UI. */
function asPricedArtist(raw: PricedArtist | Record<string, unknown>): PricedArtist {
  const r = raw as Record<string, unknown>;
  return {
    rate_inr: Number(r.rate_inr ?? r.rateInr ?? 0),
    pricing_unit: String(r.pricing_unit ?? r.pricingUnit ?? "hour"),
    travel_setting: String(r.travel_setting ?? r.travelSetting ?? "including"),
    travel_charge_inr: Number(r.travel_charge_inr ?? r.travelChargeInr ?? 0) || 0,
    stay_charge_inr: Number(r.stay_charge_inr ?? r.stayChargeInr ?? 0) || 0,
    city_rates: r.city_rates ?? r.cityRates ?? {},
  };
}

type CityRate = { rate: number; travel: "included" | "separate" | "not_needed"; travel_charge?: number; stay_charge?: number };

function cityRate(rates: unknown, city: string): CityRate | null {
  if (!city || !rates || typeof rates !== "object") return null;
  const key = Object.keys(rates as Record<string, unknown>).find((k) => k.trim().toLowerCase() === city.trim().toLowerCase());
  const raw = key ? (rates as Record<string, Record<string, unknown>>)[key] : null;
  if (!raw || typeof raw !== "object") return null;
  const rate = Number(raw.rate);
  if (!Number.isInteger(rate) || rate <= 0) return null;
  const travelRaw = String(raw.travel ?? "");
  const travel =
    travelRaw === "included" || travelRaw === "separate" || travelRaw === "not_needed"
      ? travelRaw
      : "separate";
  const travel_charge = Number(raw.travel_charge ?? raw.travelCharge ?? 0) || 0;
  const stay_charge = Number(raw.stay_charge ?? raw.stayCharge ?? 0) || 0;
  return { rate, travel, travel_charge, stay_charge };
}

function defaultTravelStay(artist: PricedArtist) {
  if (artist.travel_setting !== "excluding") return { travel: 0, stay: 0 };
  return {
    travel: artist.travel_charge_inr || 0,
    stay: artist.stay_charge_inr || 0,
  };
}

/** Highest quantity allowed for each pricing unit (hours, one event, or plates). */
export function maxQuantity(unit: string) {
  if (unit === "event") return 1;
  if (unit === "plate") return 5000;
  return 12;
}

/**
 * Hourly (or per-event/plate) rate and travel + stay for a city.
 * City rates may override the hourly rate; travel/stay stay on the artist default
 * ("charged separately") unless that city explicitly marks travel included / not needed.
 */
export function artistCityPrice(artist: PricedArtist | Record<string, unknown>, city: string) {
  const priced = asPricedArtist(artist);
  const local = cityRate(priced.city_rates, city);
  const rate = local?.rate ?? priced.rate_inr;
  const fallback = defaultTravelStay(priced);

  let travel = fallback.travel;
  let stay = fallback.stay;
  if (local?.travel === "included" || local?.travel === "not_needed") {
    travel = 0;
    stay = 0;
  } else if (local?.travel === "separate") {
    const cityTravel = local.travel_charge ?? 0;
    const cityStay = local.stay_charge ?? 0;
    // Separate with no amounts filled → keep the artist default charges.
    if (cityTravel > 0 || cityStay > 0) {
      travel = cityTravel;
      stay = cityStay;
    }
  }

  return { rate, travel: travel + stay, travelOnly: travel, stay };
}

export function priceBooking(artist: PricedArtist | Record<string, unknown>, req: Pick<BookingRequest, "quantity" | "city">) {
  const priced = asPricedArtist(artist);
  const { rate, travelOnly: travel, stay } = artistCityPrice(priced, req.city);
  if (!Number.isInteger(rate) || rate <= 0) throw new Error("This artist has not set a price yet.");
  const qty = Math.min(req.quantity, maxQuantity(priced.pricing_unit));
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
