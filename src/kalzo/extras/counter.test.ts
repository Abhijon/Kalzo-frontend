import { describe, it, expect } from "vitest";
import { houseCount } from "./BrandMark";
describe("actual enrollments", () => {
  it("starts at zero real enrollments", () => expect(houseCount(0)).toBe(0));
  it("shows the supplied number of enrolled people", () => expect(houseCount(3)).toBe(3));
  it("increases only with the real enrollment total", () => {
    expect(houseCount(3)).toBe(3);
    expect(houseCount(4)).toBe(4);
  });
});
