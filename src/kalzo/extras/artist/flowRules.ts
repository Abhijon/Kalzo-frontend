import { z } from "zod";
export const FACE_SECONDS = 10;
export const VENUE_SECONDS = 15;
export const patronCodeSchema = z.string().regex(/^\d{4}$/, "Enter the four-digit code from the patron.");
export const cityRateSchema = z.object({
  rate: z.number().int().min(1).max(100000),
  travel: z.enum(["included", "separate", "not_needed"]),
  travel_charge: z.number().int().min(0).max(500000).default(0),
  stay_charge: z.number().int().min(0).max(500000).default(0),
});
export type CityRate = z.infer<typeof cityRateSchema>;
export function normalizedCityRate(value: CityRate): CityRate {
  return { ...value, travel_charge: value.travel === "separate" ? value.travel_charge : 0, stay_charge: value.travel === "separate" ? value.stay_charge : 0 };
}
export function canRequestCancellation(stage: string) {
  return ["accepted", "arrived", "arrival_confirmed", "checked_in"].includes(stage);
}
export function isAcceptedBooking(stage: string) {
  return ["accepted", "arrived", "arrival_confirmed", "checked_in", "performing", "finished"].includes(stage);
}
export function bookingGroup(booking: { workflow_stage: string; event_at: string | null; event_date: string }, now = Date.now()) {
  if (["completed", "declined", "cancelled"].includes(booking.workflow_stage)) return "past";
  const event = Date.parse(booking.event_at || booking.event_date);
  if (Number.isFinite(event) && event > now + 86400000) return "upcoming";
  return "current";
}