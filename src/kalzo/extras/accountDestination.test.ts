import { expect, it } from "vitest";
import { accountDestination } from "./accountDestination";
it("opens the artist panel for existing artist credentials", () => {
  expect(accountDestination(true, "patron")).toBe("/artist");
});
it("opens the client account for client credentials", () => {
  expect(accountDestination(false, "patron")).toBe("/account");
});
it("opens artist onboarding before a new artist submits their profile", () => {
  expect(accountDestination(false, "artist")).toBe("/artist");
});