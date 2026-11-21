import { expect, it } from "vitest";
import { ownsArtistMedia } from "./artistMedia";
it("never signs another artist private media", () => {
  expect(ownsArtistMedia("artist-a", "artist-b/face.webm")).toBe(false);
  expect(ownsArtistMedia("artist-a", "artist-a/photo.jpg")).toBe(true);
});
it("accepts Node/S3 upload keys under artists/ and artist-profile-images/", () => {
  expect(ownsArtistMedia("artist-a", "artists/artist-a/photo.jpg")).toBe(true);
  expect(ownsArtistMedia("artist-a", "artists/artist-b/photo.jpg")).toBe(false);
  expect(ownsArtistMedia("artist-a", "artist-profile-images/artist-a/photo.jpg")).toBe(true);
  expect(ownsArtistMedia("artist-a", "artist-profile-images/artist-b/photo.jpg")).toBe(false);
});
it("rejects traversal and encoded paths", () => {
  expect(ownsArtistMedia("artist-a", "artist-a/../artist-b/video.webm")).toBe(false);
  expect(ownsArtistMedia("artist-a", "artist-a/%2e%2e/video.webm")).toBe(false);
  expect(ownsArtistMedia("artist-a", "artists/artist-a/../artist-b/x.jpg")).toBe(false);
});
