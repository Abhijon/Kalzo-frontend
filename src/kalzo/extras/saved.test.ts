import { describe, expect, it } from "vitest";
import { nextSaved, savedCounts } from "./saved";

describe("saved lists", () => {
  it("tapping the same mark again takes the artist off the list", () => {
    const once = nextSaved({}, "a3", "look");
    expect(once).toEqual({ a3: "look" });
    expect(nextSaved(once, "a3", "look")).toEqual({});
  });

  it("the to-book mark moves an artist out of to-look", () => {
    const moved = nextSaved({ a3: "look" }, "a3", "book");
    expect(moved).toEqual({ a3: "book" });
    expect(savedCounts(moved)).toEqual({ total: 1, look: 0, book: 1 });
  });

  it("counts both lists separately", () => {
    expect(savedCounts({ a1: "look", a2: "book", a3: "book" })).toEqual({ total: 3, look: 1, book: 2 });
  });
});
