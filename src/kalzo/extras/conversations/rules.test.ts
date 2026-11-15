import { expect, it } from "vitest";
import { offPlatformContact, isFutureMeeting } from "./rules";
it("keeps phone numbers out of private artist chats", () => {
  expect(offPlatformContact("Call +919079290502")).toBe(true);
  expect(offPlatformContact("Can you perform at 7 PM?")).toBe(false);
});
it("allows only future scheduled calls", () => {
  const now = Date.parse("2026-11-13T11:23:00Z");
  expect(isFutureMeeting("2026-11-13T11:23:00Z", now)).toBe(false);
  expect(isFutureMeeting("2026-11-13T11:24:00Z", now)).toBe(true);
});
