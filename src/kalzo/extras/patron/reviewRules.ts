import { z } from "zod";

export const completionReviewSchema = z.object({
  booking: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1, "Please write your review.").max(2000),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .optional()
    .default([]),
});
