import { describe, expect, it } from "vitest";
import { cleanEmailCode, emailCodeError, signupError, signupMetadata, type SignupFields } from "./signupRules";

const artist: SignupFields = { email: "artist@example.com", phone: "9876543210", name: "", city: "", type: "", industry: "", reason: "" };

describe("artist signup", () => {
  it("accepts email and mobile without patron information", () => {
    expect(signupError(artist, "artist")).toBe("");
    expect(signupError(artist, "patron")).toBe("Add your name and location.");
  });
  it("stores the artist contact number without patron booking metadata", () => {
    expect(signupMetadata({ ...artist, type: "Individual / family", reason: "Wedding or sangeet" }, "artist")).toEqual({ phone: "+919876543210", account_audience: "artist" });
  });
  it("requires a valid email", () => {
    expect(signupError({ ...artist, email: "invalid" }, "artist")).toBe("Enter a valid email.");
  });
  it("requires a valid mobile number", () => {
    expect(signupError({ ...artist, phone: "123" }, "artist")).toBe("Enter a 10-digit mobile number.");
  });
  it("needs no password", () => {
    expect(signupError(artist, "artist")).toBe("");
  });
});

describe("email sign-in code", () => {
  it("keeps only the first six digits", () => {
    expect(cleanEmailCode(" 12 34-56 78")).toBe("123456");
  });
  it("tells a new email to create an account", () => {
    expect(emailCodeError("Signups not allowed for otp", "send", "login")).toContain("CREATE ACCOUNT");
  });
  it("explains a wrong or expired code", () => {
    expect(emailCodeError("Token has expired or is invalid", "verify", "login")).toContain("wrong or has expired");
  });
  it("asks to wait when codes are requested too fast", () => {
    expect(emailCodeError("For security purposes, you can only request this after 42 seconds.", "send", "create")).toContain("wait a minute");
  });
});

describe("client signup choices", () => {
  const client = { ...artist, name: "Guest", city: "Udaipur", type: "Individual / family", reason: "Birthday" };
  it("requires the client to choose their profile type", () => {
    expect(signupError({ ...client, type: "" }, "patron")).toBe("Choose your profile type.");
  });
  it("requires a booking category rather than silently choosing wedding", () => {
    expect(signupError({ ...client, reason: "" }, "patron")).toBe("Choose your booking category.");
  });
  it("accepts the selected restaurant entertainment category", () => {
    expect(signupError({ ...client, reason: "Restaurant entertainment" }, "patron")).toBe("");
    expect(signupMetadata({ ...client, reason: "Restaurant entertainment" }, "patron").reason).toBe("Restaurant entertainment");
  });
});
