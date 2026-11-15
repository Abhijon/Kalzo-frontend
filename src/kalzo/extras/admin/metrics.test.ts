import { describe, expect, it } from "vitest";
import { awaitingVerification, dailyCounts, inLastDays, paidRevenue, needsRefundReview } from "./metrics";
const now = new Date("2026-11-13T10:00:00Z");
describe("admin metrics", () => {
  it("keeps approved refunds in the queue until actual processing completes", () => {
    expect(["none", "review_required", "approved_pending_processing", "refunded"].filter(refund_status => needsRefundReview({ refund_status }))).toEqual(["review_required", "approved_pending_processing"]);
  });
  it("buckets rows by day, oldest first", () => {
    const r = dailyCounts(
      [
        { created_at: "2026-11-13T01:00:00Z" },
        { created_at: "2026-11-13T09:00:00Z" },
        { created_at: "2026-11-11T09:00:00Z" },
        { created_at: "2026-10-01T09:00:00Z" },
      ],
      3,
      now,
    );
    expect(r).toEqual([
      { day: "2026-11-11", count: 1 },
      { day: "2026-11-12", count: 0 },
      { day: "2026-11-13", count: 2 },
    ]);
  });
  it("counts only the last 7 days", () => {
    expect(
      inLastDays(
        [{ created_at: "2026-11-10T00:00:00Z" }, { created_at: "2026-11-01T00:00:00Z" }],
        7,
        now,
      ),
    ).toBe(1);
  });
  it("queues only submitted face videos", () => {
    expect(
      awaitingVerification([
        { verification_status: "submitted", face_video_path: "a/v.webm" },
        { verification_status: "verified", face_video_path: "b" },
        { verification_status: "submitted", face_video_path: "" },
      ]),
    ).toHaveLength(1);
  });
  it("sums only verified paid bookings", () => {
    expect(
      paidRevenue([
        { status: "paid", amount_inr: 2000 },
        { status: "awaiting_payment", amount_inr: 5000 },
      ]),
    ).toBe(2000);
  });
});
