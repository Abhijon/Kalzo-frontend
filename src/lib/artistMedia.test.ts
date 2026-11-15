import { expect, it } from "vitest";
import { ownsArtistMedia } from "./artistMedia";
it("never signs another artist private media", () => {
  expect(ownsArtistMedia("artist-a", "artist-b/face.webm")).toBe(false);
  expect(ownsArtistMedia("artist-a", "artist-a/photo.jpg")).toBe(true);
});
it("rejects traversal and encoded paths", () => {
  expect(ownsArtistMedia("artist-a", "artist-a/../artist-b/video.webm")).toBe(false);
  expect(ownsArtistMedia("artist-a", "artist-a/%2e%2e/video.webm")).toBe(false);
});
