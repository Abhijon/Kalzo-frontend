import { isEmail, isIndianMobile } from "./validate";

export type AccountAudience = "patron" | "artist";
export type SignupFields = { name: string; email: string; phone: string; city: string; type: string; industry: string; reason: string };

export function signupError(p: SignupFields, audience: AccountAudience): string {
  if (audience === "patron") {
    if (!p.name.trim() || !p.city.trim()) return "Add your name and location.";
    if (!p.type) return "Choose your profile type.";
    if (!p.reason) return "Choose your booking category.";
    if (p.type !== "Individual / family" && !p.industry.trim()) return "Tell us your business or purpose.";
  }
  if (!isEmail(p.email)) return "Enter a valid email.";
  if (!isIndianMobile(p.phone)) return "Enter a 10-digit mobile number.";
  return "";
}

export function signupMetadata(p: SignupFields, audience: AccountAudience) {
  if (audience === "artist") return { phone: "+91" + p.phone, account_audience: "artist" };
  return { full_name: p.name.trim(), city: p.city.trim(), phone: "+91" + p.phone, patron_type: p.type, industry: p.industry.trim(), reason: p.reason, account_audience: "patron" };
}

/** Six-digit code from the sign-in email; keeps digits only. */
export function cleanEmailCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

/** Friendly messages for email-code errors from the auth service. */
export function emailCodeError(message: string, step: "send" | "verify", mode: "create" | "login"): string {
  const m = message.toLowerCase();
  if (step === "send" && mode === "login" && (m.includes("signups not allowed") || m.includes("user not found")))
    return "We couldn't find an account with this email. Tap CREATE ACCOUNT to make one.";
  if (m.includes("rate limit") || m.includes("security purposes") || m.includes("too many"))
    return "Please wait a minute before asking for another code.";
  if (step === "verify" && (m.includes("expired") || m.includes("invalid") || m.includes("token")))
    return "That code is wrong or has expired. Check the latest email, or tap RESEND CODE.";
  return step === "send" ? "We couldn't send the code. Please check the email and try again." : "We couldn't check that code. Please try again.";
}
