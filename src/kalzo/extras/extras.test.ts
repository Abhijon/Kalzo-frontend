import { describe, expect, it } from "vitest";
import { serviceFee, bookingMoney } from "./fees";
import { checkMessage } from "./moderation";
import { isValidAadhaar } from "./aadhaar";

describe("service fee tiers", () => {
  it("₹1–2,500 → ₹99", () => { expect(serviceFee(1)).toBe(99); expect(serviceFee(2500)).toBe(99); });
  it("₹2,501–5,000 → ₹199", () => { expect(serviceFee(2501)).toBe(199); expect(serviceFee(5000)).toBe(199); });
  it("₹5,001–7,500 → ₹299", () => { expect(serviceFee(5001)).toBe(299); expect(serviceFee(7500)).toBe(299); });
  it("above ₹7,500 → ₹500", () => { expect(serviceFee(7501)).toBe(500); });
  it("patron pays fee on top, artist gets fee deducted, 25% advance", () => {
    expect(bookingMoney(4000, 4000)).toMatchObject({ patronPays: 4199, net: 3801, advance: 1000, balance: 2801 });
  });
});
describe("off-platform flags", () => {
  it("flags numbers and offline deals", () => {
    expect(checkMessage("call me on 9876543210")).not.toBeNull();
    expect(checkMessage("let's book it offline")).not.toBeNull();
    expect(checkMessage("pay me on gpay")).not.toBeNull();
  });
  it("allows normal talk", () => { expect(checkMessage("Can you play for 3 hours on Saturday?")).toBeNull(); });
});
describe("aadhaar checksum", () => {
  it("accepts a valid number and rejects a wrong digit", () => {
    expect(isValidAadhaar("2341 2341 2346")).toBe(true);
    expect(isValidAadhaar("2341 2341 2347")).toBe(false);
  });
});
import { isIndianMobile, isEmail, isIFSC, isAccountNumber } from "./validate";
describe("patron and bank details", () => {
  it("needs a 10-digit Indian mobile", () => { expect(isIndianMobile("9876543210")).toBe(true); expect(isIndianMobile("12345")).toBe(false); });
  it("needs a real-looking email", () => { expect(isEmail("a@b.in")).toBe(true); expect(isEmail("abc")).toBe(false); });
  it("checks IFSC and account number", () => { expect(isIFSC("HDFC0001234")).toBe(true); expect(isIFSC("HDFC1234")).toBe(false); expect(isAccountNumber("123456789012")).toBe(true); expect(isAccountNumber("12ab")).toBe(false); });
});
