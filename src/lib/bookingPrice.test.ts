import { describe, expect, it } from "vitest";
import { artistCityPrice, bookingRequestSchema, codesExpireAt, newBookingCodes, priceBooking, safeEqual } from "./bookingPrice";

const base = {
  rate_inr: 3000,
  pricing_unit: "hour",
  travel_setting: "including",
  travel_charge_inr: 0,
  stay_charge_inr: 0,
  city_rates: {},
};

describe("booking price (flat fee bands)", () => {
  it("charges rate x hours plus the ₹199 band fee for a ₹3,000 rate", () => {
    const p = priceBooking(base, { quantity: 3, city: "" });
    expect(p.subtotal).toBe(9000);
    expect(p.fee).toBe(199);
    expect(p.patronPays).toBe(9199);
    expect(p.artistNet).toBe(8801);
  });
  it("uses the ₹99, ₹299 and ₹500 bands", () => {
    expect(priceBooking({ ...base, rate_inr: 2500 }, { quantity: 1, city: "" }).fee).toBe(99);
    expect(priceBooking({ ...base, rate_inr: 7500 }, { quantity: 1, city: "" }).fee).toBe(299);
    expect(priceBooking({ ...base, rate_inr: 9000 }, { quantity: 1, city: "" }).fee).toBe(500);
  });
  it("adds travel and stay when the artist charges them separately", () => {
    const p = priceBooking({ ...base, travel_setting: "excluding", travel_charge_inr: 2000, stay_charge_inr: 1500 }, { quantity: 2, city: "" });
    expect(p.subtotal).toBe(6000 + 3500);
    expect(p.patronPays).toBe(9500 + 199);
  });
  it("uses the artist's own price for a city (any letter case)", () => {
    const artist = { ...base, city_rates: { Jaipur: { rate: 4000, travel: "separate", travel_charge: 1000, stay_charge: 0 } } };
    expect(artistCityPrice(artist, "jaipur")).toMatchObject({ rate: 4000, travel: 1000 });
    expect(priceBooking(artist, { quantity: 1, city: "JAIPUR" }).patronPays).toBe(4000 + 1000 + 199);
    expect(artistCityPrice(artist, "Udaipur").rate).toBe(3000);
  });
  it("one booking per event for event pricing", () => {
    expect(() => priceBooking({ ...base, pricing_unit: "event" }, { quantity: 2, city: "" })).toThrow();
  });
  it("refuses an artist without a price", () => {
    expect(() => priceBooking({ ...base, rate_inr: 0 }, { quantity: 1, city: "" })).toThrow();
  });
});

describe("booking request", () => {
  it("needs a real date and a full address", () => {
    const ok = { artist_id: "6f1f2b1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", event_date: "2026-11-20", slot: "7:00 PM", quantity: 2, city: "", address: "12 Lake Road, Udaipur" };
    expect(bookingRequestSchema.safeParse(ok).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ ...ok, address: "short" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...ok, event_date: "20 Nov" }).success).toBe(false);
  });
});

describe("booking codes", () => {
  it("makes two different four-digit codes", () => {
    let n = 0;
    const seq = [42, 42, 7]; // forces a repeat, which must be replaced
    const c = newBookingCodes(() => seq[n++] ?? 1);
    expect(c).toEqual({ arrival: "0042", closing: "0007" });
    const r = newBookingCodes();
    expect(r.arrival).toMatch(/^\d{4}$/);
    expect(r.closing).toMatch(/^\d{4}$/);
    expect(r.arrival).not.toBe(r.closing);
  });
  it("keeps codes valid until two days after the event", () => {
    const now = Date.parse("2026-11-13T10:00:00Z");
    expect(Date.parse(codesExpireAt("2026-11-20", now))).toBeGreaterThan(Date.parse("2026-11-22T00:00:00Z"));
  });
  it("compares signatures safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});
