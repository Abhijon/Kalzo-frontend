import { describe, expect, it } from "vitest";
import { invitationDeadline } from "./invitationDeadline";
describe("invitation deadlines", () => {
  const sent = "2026-11-14T13:00:00Z";
  it("reminds at 25 minutes, not before", () => {
    expect(invitationDeadline(sent, Date.parse("2026-11-14T13:24:59Z"))).toBe("waiting");
    expect(invitationDeadline(sent, Date.parse("2026-11-14T13:25:00Z"))).toBe("reminder");
  });
  it("closes at 30 minutes after the five minute grace window", () => {
    expect(invitationDeadline(sent, Date.parse("2026-11-14T13:29:59Z"))).toBe("reminder");
    expect(invitationDeadline(sent, Date.parse("2026-11-14T13:30:00Z"))).toBe("expired");
  });
});