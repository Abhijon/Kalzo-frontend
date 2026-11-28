import { expect, it } from "vitest";
import { completionReviewSchema } from "./reviewRules";
import { collectReviewTags } from "./reviewTags";
const review = { booking: "11111111-1111-4111-8111-111111111111", rating: 5, body: "Wonderful performance" };
it("requires a written completion review", () => {
  expect(completionReviewSchema.safeParse({ ...review, body: " " }).success).toBe(false);
  expect(completionReviewSchema.safeParse(review).success).toBe(true);
});
it("requires a rating between one and five", () => {
  expect(completionReviewSchema.safeParse({ ...review, rating: 0 }).success).toBe(false);
  expect(completionReviewSchema.safeParse({ ...review, rating: 6 }).success).toBe(false);
});
it("accepts optional tags", () => {
  expect(
    completionReviewSchema.safeParse({ ...review, tags: ["Punctual", "Soulful"] }).success,
  ).toBe(true);
});
it("merges preset and custom tags without duplicates", () => {
  expect(collectReviewTags({ Punctual: true, Professional: true }, "  punctual  ")).toEqual([
    "Punctual",
    "Professional",
  ]);
  expect(collectReviewTags({ Punctual: true }, "Crowd Favourite")).toEqual([
    "Punctual",
    "Crowd Favourite",
  ]);
});