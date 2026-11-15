import { expect, it } from "vitest";
import { completionReviewSchema } from "./reviewRules";
const review = { booking: "11111111-1111-4111-8111-111111111111", rating: 5, body: "Wonderful performance" };
it("requires a written completion review", () => {
  expect(completionReviewSchema.safeParse({ ...review, body: " " }).success).toBe(false);
  expect(completionReviewSchema.safeParse(review).success).toBe(true);
});
it("requires a rating between one and five", () => {
  expect(completionReviewSchema.safeParse({ ...review, rating: 0 }).success).toBe(false);
  expect(completionReviewSchema.safeParse({ ...review, rating: 6 }).success).toBe(false);
});