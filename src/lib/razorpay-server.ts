// Server-only helpers for the Razorpay routes. Never reads env at module scope.

/** Returns the signed-in user's id from the Authorization bearer token, or null. */
export async function callerId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

/** HMAC-SHA256 hex digest via Web Crypto (workerd-safe, no Node crypto). */
export async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Signed-in user (id + email) from the bearer token, or null. */
export async function callerUser(request: Request): Promise<{ id: string; email: string } | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id, email: (data.user.email ?? "").toLowerCase() };
}

/**
 * Payments stay OFF unless the secret KALZO_PAYMENTS is set to "live".
 * KALZO_PAYMENT_TESTERS (comma-separated emails) may pay while payments are off, for a real test booking.
 */
export function paymentsOpenFor(email: string): boolean {
  if ((process.env["KALZO_PAYMENTS"] ?? "").trim().toLowerCase() === "live") return true;
  const testers = (process.env["KALZO_PAYMENT_TESTERS"] ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return !!email && testers.includes(email);
}

/** Razorpay keys: live keys first, then test keys. Read at call time only. */
export function razorpayKeys(): { id: string; secret: string } | null {
  const id = process.env["RAZORPAY_LIVE_KEY_ID"] || process.env["RAZORPAY_KEY_ID"] || "";
  const secret = process.env["RAZORPAY_LIVE_KEY_SECRET"] || process.env["RAZORPAY_KEY_SECRET"] || "";
  return id && secret ? { id, secret } : null;
}

/** Calls the Razorpay REST API with the server's keys. */
export async function razorpayApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const k = razorpayKeys();
  if (!k) throw new Error("Payment keys are not configured.");
  const res = await fetch("https://api.razorpay.com/v1" + path, {
    method: init?.method ?? "GET",
    headers: { Authorization: "Basic " + btoa(k.id + ":" + k.secret), "Content-Type": "application/json" },
    body: init?.body === undefined ? null : JSON.stringify(init.body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(json.error?.description || `Razorpay request failed (${res.status}).`);
  return json;
}

export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string };
