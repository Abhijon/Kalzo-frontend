import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { isEmail } from "./validate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, UsersRound } from "lucide-react";
import { VintageFilterSelect } from "./VintageFilterSelect";
import "./gate.css";
import "./vintage-dropdowns.css";
import { cleanEmailCode, signupError, type AccountAudience } from "./signupRules";

type Patron = { name: string; email: string; phone: string; city: string; type: string; industry: string; reason: string };
const TYPES = ["Individual / family", "Hotel or resort", "Corporate", "Café or restaurant", "Event company", "Other business"];
const REASONS = ["Wedding or sangeet", "Birthday", "House gathering", "Corporate event", "Restaurant entertainment", "Festival or puja", "Other"];

function GoogleG() {
  return (<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>);
}

export function PatronGate({ onBack, audience: initialAudience = "patron", initialMode = "create", chooseAudience = false }: { onBack?: () => void; audience?: AccountAudience; initialMode?: "create" | "login"; chooseAudience?: boolean }) {
  const [audience, setAudience] = useState<AccountAudience>(initialAudience);
  const [audienceChosen, setAudienceChosen] = useState(!chooseAudience);
  const [ready, setReady] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"create" | "login">(initialMode);
  const [p, setP] = useState<Patron>({ name: "", email: "", phone: "", city: "", type: "", industry: "", reason: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const [code, setCode] = useState(""), [wait, setWait] = useState(0), [reasonOther, setReasonOther] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.auth.getUser().then(({ data }) => setReady(!!data?.user));
    const { data: sub } = api.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  useEffect(() => { if (sent) codeRef.current?.focus(); }, [sent]);
  if (ready !== false) return null;

  const portalRole = audience === "artist" ? "ARTIST" : "CUSTOMER";
  const business = !!p.type && p.type !== TYPES[0];
  const set = (k: keyof Patron) => (e: { target: { value: string } }) => { setP({ ...p, [k]: e.target.value }); setErr(""); };

  const sendCode = async () => {
    const otherReason = p.reason === "Other";
    if (mode === "create" && audience === "patron" && otherReason && !reasonOther.trim()) return setErr("Please write what you are booking for.");
    if (mode === "create" && audience === "patron" && p.type === "Other business" && !p.industry.trim()) return setErr("Please write what kind of business or individual you are.");
    const sendP = otherReason && reasonOther.trim() ? { ...p, reason: "Other: " + reasonOther.trim().slice(0, 200) } : p;

    if (mode === "create") {
      const validation = signupError(sendP, audience);
      if (validation) return setErr(validation);
    } else if (!isEmail(p.email)) return setErr("Enter the email you signed up with.");

    setBusy(true); setErr("");

    if (mode === "create") {
      // ── Signup: POST /api/v1/customer-signup  or  POST /api/v1/artist-signup ──
      let res;
      if (audience === "artist") {
        res = await api.auth.signupArtist({ email: sendP.email.trim(), mobileNumber: sendP.phone });
      } else {
        res = await api.auth.signupCustomer({
          email: sendP.email.trim(),
          fullName: sendP.name.trim(),
          location: sendP.city.trim(),
          customerType: sendP.type,
          reasonForBooking: sendP.reason,
          mobileNumber: sendP.phone,
          businessName: sendP.industry.trim() || undefined,
        });
      }
      setBusy(false);
      if (res.error) {
        const msg =
          res.error.message?.trim() ||
          "Could not create your account. Please try again.";
        setErr(msg);
        return;
      }
    } else {
      // ── Login: POST /api/v1/login (role-gated portal) ─────────────────────────
      const res = await api.auth.login(p.email.trim(), portalRole);
      setBusy(false);
      if (res.error) {
        setErr(res.error.message?.trim() || "Could not log in. Please try again.");
        return;
      }
    }

    setSent(true); setCode(""); setWait(60);
  };

  const resend = async () => {
    // POST /api/v1/resend-otp
    setBusy(true);
    const res = await api.auth.resendOtp(p.email.trim(), portalRole);
    setBusy(false);
    if (res.error) {
      setErr(res.error.message?.trim() || "Could not resend the code.");
      return;
    }
    setWait(60);
  };

  const verify = async () => {
    if (code.length !== 6) return setErr("Enter the 6-digit code from your email.");
    setBusy(true); setErr("");
    // POST /api/v1/verify-otp — role required so wrong portal cannot get a JWT
    const { error } = await api.auth.verifyOtp({
      email: p.email.trim(),
      otp: code,
      role: portalRole,
    });
    setBusy(false);
    if (error) setErr(error.message);
  };
  const google = async () => {
    const r = await api.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setErr("Google sign-in didn't work. Please try again.");
  };
  const switchTo = (m: "create" | "login") => { setMode(m); setErr(""); setSent(false); setCode(""); };
  const changeEmail = () => { setSent(false); setCode(""); setErr(""); };

  return (
    <div className="kx-modal" role="dialog" aria-modal="true" aria-labelledby="kp-title">
      <div className="kx-modal-card kp-card kp-welcome">
        {onBack && (
          <button type="button" className="kp-close" aria-label="Close without signing up" onClick={onBack}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        )}
        {!audienceChosen ? <>
          <p className="kx-eyebrow">JOIN THE HOUSE</p>
          <h3 id="kp-title" className="kx-h3">Your place at Kalzo</h3>
          <div className="kp-audience" aria-label="Account type">
            <Button variant="outline" onClick={() => { setAudience("patron"); setAudienceChosen(true); }}><UsersRound />Client</Button>
            <Button variant="outline" onClick={() => { setAudience("artist"); setAudienceChosen(true); }}><Music />Artist</Button>
          </div>
        </> : <>
        {chooseAudience && !sent && <Button variant="ghost" className="kp-audience-back" onClick={() => { setAudienceChosen(false); setErr(""); }}><ArrowLeft size={16} />Client or Artist</Button>}
        <p className="kx-eyebrow">{audience === "artist" ? "BECOME A KALZO ARTIST" : "YOUR CLIENT ACCOUNT"}</p>
        <div className="kp-tabs" role="tablist">
          <Button variant="outline" type="button" role="tab" aria-selected={mode === "create"} className={mode === "create" ? "kp-on" : ""} onClick={() => switchTo("create")}>CREATE ACCOUNT</Button>
          <Button variant="outline" type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "kp-on" : ""} onClick={() => switchTo("login")}>LOG IN</Button>
        </div>

        {sent ? (
          <div className="kp-code-step">
            <h3 id="kp-title" className="kx-h3">Enter your code</h3>
            <p>We've emailed a 6-digit code to <b>{p.email.trim()}</b>. It may take a minute; check Spam or Promotions too.</p>
            <label className="kp-code-label" htmlFor="kp-code">6-digit code</label>
            <div className="kp-code-wrap" onClick={() => codeRef.current?.focus()}>
              <input
                id="kp-code" ref={codeRef} className="kp-code-input" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} value={code} aria-describedby="kp-code-hint"
                onChange={(e) => { setCode(cleanEmailCode(e.target.value)); setErr(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
              />
              <div className="kp-code-boxes" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className={"kp-code-box" + (i === Math.min(code.length, 5) ? " kp-code-now" : "")}>{code[i] ?? ""}</span>
                ))}
              </div>
            </div>
            <p id="kp-code-hint" className="kx-small">Enter the 6-digit code from your Kalzo email.</p>
            <div className="kp-code-links">
              <button type="button" className="kx-btn kx-ghost" disabled={wait > 0 || busy} onClick={resend}>
                {wait > 0 ? `RESEND CODE IN ${wait}s` : "RESEND CODE"}
              </button>
              <button type="button" className="kx-btn kx-ghost" onClick={changeEmail}>CHANGE EMAIL</button>
            </div>
          </div>
        ) : (
          <>
            <Button variant="outline" type="button" className="kp-google" onClick={google}><GoogleG /> Continue with Google</Button>
            <p className="kx-small kp-email-divider">or with your email</p>
            {mode === "create" ? (
              <>
                <h3 id="kp-title" className="kx-h3">Create your {audience === "patron" ? "client" : "artist"} account</h3>
                <div className="kp-grid">
                  {audience === "patron" && <>
                  <label>Full name<input className="kx-input" value={p.name} onChange={set("name")} /></label>
                  <label>Your location<input className="kx-input" value={p.city} onChange={set("city")} placeholder="City" /></label>
                  <label>
                    You are
                    <VintageFilterSelect
                      variant="field"
                      className="kp-select-trigger"
                      aria-label="You are"
                      value={p.type}
                      options={[
                        { value: "", label: "Choose your profile" },
                        ...TYPES.map((t) => ({ value: t, label: t })),
                      ]}
                      onChange={(e) => {
                        setP({ ...p, type: e.target.value });
                        setErr("");
                      }}
                    />
                  </label>
                  <label>
                    Reason for booking
                    <VintageFilterSelect
                      variant="field"
                      className="kp-select-trigger"
                      aria-label="Reason for booking"
                      value={p.reason}
                      options={[
                        { value: "", label: "Choose the category" },
                        ...REASONS.map((t) => ({ value: t, label: t })),
                      ]}
                      onChange={(e) => {
                        setP({ ...p, reason: e.target.value });
                        setErr("");
                      }}
                    />
                  </label>
                  {business && <label className="kp-wide">{p.type === "Other business" ? "What kind of business or individual are you?" : "Business name"}<input className="kx-input" maxLength={120} value={p.industry} onChange={set("industry")} placeholder={p.type === "Other business" ? "e.g. Wedding planner, college society, individual host" : ""} /></label>}
                  {p.reason === "Other" && <label className="kp-wide">What are you booking for?<textarea className="kx-input" rows={3} maxLength={200} value={reasonOther} onChange={(e) => { setReasonOther(e.target.value); setErr(""); }} placeholder="Tell us exactly what you're looking for" /></label>}
                  </>}
                  <label>Email address<input className="kx-input" type="email" autoComplete="email" value={p.email} onChange={set("email")} /></label>
                  <label>Mobile number<div className="kx-row"><span className="kp-cc">+91</span><input className="kx-input" inputMode="tel" maxLength={10} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value.replace(/\D/g, "") })} /></div></label>
                </div>
                <p className="kx-small">No password needed. We'll email you a 6-digit code.</p>
              </>
            ) : (
              <>
                <h3 id="kp-title" className="kx-h3">Log in to your {audience === "patron" ? "client" : "artist"} account</h3>
                <div className="kp-grid">
                  <label className="kp-wide">Email address<input className="kx-input" type="email" autoComplete="email" value={p.email} onChange={set("email")} onKeyDown={(e) => { if (e.key === "Enter") sendCode(); }} /></label>
                </div>
                <p className="kx-small">We'll email you a 6-digit code to log in.</p>
              </>
            )}
          </>
        )}

        {err && (
          <div className="kp-error" role="alert">
            <p>{err}</p>
            {mode === "create" && /already exists/i.test(err) && (
              <button type="button" className="kx-btn kx-ghost kp-error-login" onClick={() => switchTo("login")}>
                Log in with this email
              </button>
            )}
          </div>
        )}
        <div className="kx-row">
          {sent
            ? <button className="kx-btn" disabled={busy || code.length !== 6} onClick={verify}>{mode === "create" ? "VERIFY & CREATE ACCOUNT" : "VERIFY & LOG IN"}</button>
            : <button className="kx-btn" disabled={busy} onClick={sendCode}>{busy ? "SENDING…" : "SEND CODE"}</button>}
          {onBack && <button className="kx-btn kx-ghost" onClick={onBack}>NOT NOW</button>}
        </div>
        </>}
      </div>
    </div>
  );
}
