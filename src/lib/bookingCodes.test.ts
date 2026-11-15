import { it, expect } from "vitest";
import { newBookingCodes } from "./bookingCodes";
it("generates distinct four-digit arrival and closing codes for each booking", () => {
  const a = newBookingCodes();
  expect(a.arrival).toMatch(/^\d{4}$/);
  expect(a.closing).toMatch(/^\d{4}$/);
  expect(a.arrival).not.toBe(a.closing);
});
