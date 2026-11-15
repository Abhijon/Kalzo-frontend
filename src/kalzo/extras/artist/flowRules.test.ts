import { expect, it } from "vitest";
import { FACE_SECONDS, VENUE_SECONDS, patronCodeSchema, normalizedCityRate, canRequestCancellation, bookingGroup, isAcceptedBooking } from "./flowRules";
it("requires four digits for patron OTP", () => {
  expect(patronCodeSchema.safeParse("1234").success).toBe(true);
  expect(patronCodeSchema.safeParse("123456").success).toBe(false);
  expect(patronCodeSchema.safeParse("123").success).toBe(false);
});
it("records a ten-second face video", () => expect(FACE_SECONDS).toBe(10));
it("keeps accepted bookings in the artist current flow until completion", () => {
  expect(isAcceptedBooking("accepted")).toBe(true);
  expect(isAcceptedBooking("finished")).toBe(true);
  expect(isAcceptedBooking("paid")).toBe(false);
  expect(isAcceptedBooking("completed")).toBe(false);
});
it("caps venue recording at fifteen seconds", () => expect(VENUE_SECONDS).toBe(15));
it("removes travel and accommodation charges when not needed", () => {
  expect(normalizedCityRate({ rate: 2000, travel: "not_needed", travel_charge: 500, stay_charge: 700 })).toEqual({ rate: 2000, travel: "not_needed", travel_charge: 0, stay_charge: 0 });
});
it("retains separately charged travel and accommodation", () => {
  expect(normalizedCityRate({ rate: 2000, travel: "separate", travel_charge: 500, stay_charge: 700 }).stay_charge).toBe(700);
});
it("allows cancellation review before performance but not after", () => {
  expect(canRequestCancellation("accepted")).toBe(true);
  expect(canRequestCancellation("performing")).toBe(false);
  expect(canRequestCancellation("completed")).toBe(false);
});
it("separates past current and upcoming bookings", () => {
  const now = Date.parse("2026-11-13T10:45:00Z");
  expect(bookingGroup({ workflow_stage: "completed", event_at: null, event_date: "2026-11-13" }, now)).toBe("past");
  expect(bookingGroup({ workflow_stage: "accepted", event_at: "2026-11-20T10:00:00Z", event_date: "2026-11-20" }, now)).toBe("upcoming");
  expect(bookingGroup({ workflow_stage: "performing", event_at: null, event_date: "2026-11-13" }, now)).toBe("current");
});