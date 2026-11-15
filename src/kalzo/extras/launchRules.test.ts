import { describe, it, expect } from "vitest";
import { reelPaths, canPublishArtist, isSampleArtist, artistDraftSchema } from "./launchRules";
describe("Real launch rules", () => {
  it("requires at least two reels", () => {
    expect(reelPaths.safeParse(["one"]).success).toBe(false);
    expect(reelPaths.safeParse(["one", "two"]).success).toBe(true);
  });
  it("allows only two optional reels, four in total", () => {
    expect(reelPaths.safeParse(["1", "2", "3", "4"]).success).toBe(true);
    expect(reelPaths.safeParse(["1", "2", "3", "4", "5"]).success).toBe(false);
  });
  it("does not publish an artist without an admin-verified face video", () => {
    const base = { photo_path: "photo", face_video_path: "u/face.webm", reels: ["a", "b"] };
    expect(canPublishArtist({ ...base, verification_status: "submitted" })).toBe(false);
    expect(canPublishArtist({ ...base, face_video_path: "", verification_status: "verified" })).toBe(false);
    expect(canPublishArtist({ ...base, verification_status: "verified" })).toBe(true);
  });
  it("recognizes the sample as not a real artist record", () => {
    expect(isSampleArtist("a1")).toBe(true);
    expect(isSampleArtist("c15a96bd-607a-48bb-a523-6c3b72123031")).toBe(false);
  });
});
const completeProfile = { stage_name: "Artist", legal_name: "Artist Legal Name", current_state: "Rajasthan", discipline: "Musicians", subcategory: "Guitarist", bio: "Live music", base_city: "Jaipur", state_name: "Rajasthan", current_city: "Udaipur", rate_inr: 2000, photo_path: "u/photo", art_photo_path: "u/art", face_video_path: "u/face", instagram: "https://instagram.com/artist", reels: ["u/a", "u/b"], primary_reel: 0, pricing_unit: "hour", travel_setting: "including", preferred_cities: ["Udaipur"] };
it("requires the name as per Aadhaar", () => {
  expect(artistDraftSchema.safeParse(completeProfile).success).toBe(true);
  expect(artistDraftSchema.safeParse({ ...completeProfile, legal_name: "" }).success).toBe(false);
});
for (const field of ["current_city", "current_state", "art_photo_path", "face_video_path", "instagram", "bio", "subcategory"] as const) {
  it(`requires ${field} for profile submission`, () => expect(artistDraftSchema.safeParse({ ...completeProfile, [field]: "" }).success).toBe(false));
}
it("requires at least one preferred city", () => expect(artistDraftSchema.safeParse({ ...completeProfile, preferred_cities: [] }).success).toBe(false));
