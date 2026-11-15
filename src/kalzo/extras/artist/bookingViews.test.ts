import { expect, it } from "vitest";
import { matchesBookingView } from "./bookingViews";
const b = { status: "paid", workflow_stage: "paid", event_at: null, event_date: "2026-11-14" };
it("total bookings includes completed bookings", () => expect(matchesBookingView({ ...b, workflow_stage: "completed" }, "all")).toBe(true));
it("awaiting response shows only paid unanswered invitations", () => {
  expect(matchesBookingView(b, "awaiting")).toBe(true);
  expect(matchesBookingView({ ...b, workflow_stage: "accepted" }, "awaiting")).toBe(false);
});
it("completed count opens only completed bookings", () => {
  expect(matchesBookingView({ ...b, workflow_stage: "completed" }, "completed")).toBe(true);
  expect(matchesBookingView(b, "completed")).toBe(false);
});