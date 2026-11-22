import { describe, it, expect } from "vitest";
import { bookingGroup } from "./bookingGroups";
const t = "2026-11-13";
describe("bookingGroup", () => {
  it("arrived artist is current", () => expect(bookingGroup({ event_date: "2026-11-20", workflow_stage: "arrived" }, t)).toBe("current"));
  it("today's booking is current", () => expect(bookingGroup({ event_date: t, workflow_stage: "accepted" }, t)).toBe("current"));
  it("future booking is upcoming", () => expect(bookingGroup({ event_date: "2026-12-01", workflow_stage: "accepted" }, t)).toBe("upcoming"));
  it("completed booking is past", () => expect(bookingGroup({ event_date: "2026-12-01", workflow_stage: "completed" }, t)).toBe("past"));
  it("old date is past", () => expect(bookingGroup({ event_date: "2026-10-01", workflow_stage: "accepted" }, t)).toBe("past"));
  it("pending invitation is current", () => expect(bookingGroup({ event_date: "2026-12-01", workflow_stage: "pending" }, t)).toBe("current"));
});
