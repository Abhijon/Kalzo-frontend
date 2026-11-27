import { ArtistRequests } from "./ArtistRequests";
import { ArtistSave } from "./ArtistSave";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { serviceFee, FEE_TIERS } from "./fees";
import { isAccountNumber, isIFSC } from "./validate";
import { isValidAadhaar, maskAadhaar } from "./aadhaar";
import { VintageFilterSelect } from "./VintageFilterSelect";
import "./vintage-dropdowns.css";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
type Travel = "including" | "excluding" | "none";
const TRAVEL_LABEL: Record<Travel, string> = { including: "Rate includes travel & stay", excluding: "Travel & stay charged extra", none: "Not needed (I’m already here)" };

function TravelPick({ value, onChange, name }: { value: Travel; onChange: (v: Travel) => void; name: string }) {
  return (
    <div className="kx-opts">
      {(Object.keys(TRAVEL_LABEL) as Travel[]).map((k) => (
        <label key={k}><input type="radio" name={name} checked={value === k} onChange={() => onChange(k)} /> {TRAVEL_LABEL[k]}</label>
      ))}
    </div>
  );
}

function FeePopup({ rate, kind, onClose }: { rate: number; kind: "hour" | "start"; onClose: () => void }) {
  const fee = serviceFee(rate);
  return (
    <div className="kx-modal" role="dialog" aria-modal="true" aria-labelledby="kfee-title" onClick={onClose}>
      <div className="kx-modal-card ka-fee" onClick={(e) => e.stopPropagation()}>
        <p className="kx-eyebrow">YOUR PAYOUT BREAKUP</p>
        <h3 id="kfee-title" className="kx-h3">You pay Kalzo {inr(fee)} as commission</h3>
        <dl className="kx-dl">
          <dt>Your rate {kind === "hour" ? "(per hour)" : "(starting price)"}</dt><dd>{inr(rate)}</dd>
          <dt>Kalzo commission</dt><dd>− {inr(fee)}</dd>
          <dt><b>You receive</b></dt><dd><b>{inr(rate - fee)}</b></dd>
        </dl>
        <p className="kx-small">25% comes to your Kalzo wallet as an advance when you reconfirm; the rest after the closing OTP.</p>
        <p className="kx-k" style={{ marginTop: 10 }}>COMMISSION SLABS</p>
        <div className="kx-tiers">{FEE_TIERS.map((t) => <div key={t.fee} className={"kx-tier" + (t.fee === fee ? " kx-on" : "")}><span>{t.label}</span><b>{inr(t.fee)}</b></div>)}</div>
        <button className="kx-btn" style={{ marginTop: 16 }} onClick={onClose}>GOT IT</button>
      </div>
    </div>
  );
}

const REEL_SLOTS = ["Reel I · Signature act", "Reel II · Live at an event", "Reel III · Optional", "Reel IV · Optional"];

export function ArtistSetup() {
  const [kind, setKind] = useState<"hour" | "start">("hour");
  const [rate, setRate] = useState(2000);
  const [showFee, setShowFee] = useState(false);
  const [base, setBase] = useState("Jaipur");
  const [current, setCurrent] = useState("Udaipur");
  const [currentTravel, setCurrentTravel] = useState<Travel>("none");
  const [generalTravel, setGeneralTravel] = useState<Travel>("excluding");
  const [prefs, setPrefs] = useState<string[]>(["Jodhpur", "Delhi"]);
  const [pref, setPref] = useState("");
  const [reels, setReels] = useState<(string | null)[]>([null, null, null, null]);
  const [verified, setVerified] = useState(false);
  const [bank, setBank] = useState({ holder: "", acc: "", acc2: "", ifsc: "", upi: "" });
  const [bankSaved, setBankSaved] = useState(false);
  const [bankErr, setBankErr] = useState("");
  const [wallet, setWallet] = useState(3801);
  const [txns, setTxns] = useState([{ t: "Balance released · Uma’s birthday booking", a: 2801 }, { t: "25% advance · reconfirmed", a: 1000 }]);
  const [withdrawing, setWithdrawing] = useState(false);
  const fee = serviceFee(rate);
  const reelCount = reels.filter(Boolean).length;

  const setReel = (i: number, f: File | undefined) => { if (!f) return; const r = [...reels]; r[i] = URL.createObjectURL(f); setReels(r); };
  const saveBank = () => {
    if (!bank.holder.trim()) return setBankErr("Add the account holder’s name.");
    if (!isAccountNumber(bank.acc)) return setBankErr("Account number should be 9–18 digits.");
    if (bank.acc !== bank.acc2) return setBankErr("Account numbers don’t match.");
    if (!isIFSC(bank.ifsc)) return setBankErr("IFSC looks wrong (e.g. HDFC0001234).");
    setBankErr(""); setBankSaved(true);
  };
  const withdraw = () => { setTxns([{ t: `Withdrawn to bank ••••${bank.acc.slice(-4)}`, a: -wallet }, ...txns]); setWallet(0); setWithdrawing(false); };

  return (
    <main className="kx-page ka-page">
      {showFee && <FeePopup rate={rate} kind={kind} onClose={() => setShowFee(false)} />}
      <Link to="/" className="kx-small">← Back to Kalzo</Link>
      <header className="ka-hero">
        <p className="ka-stamp">EST. MMXXVI · ARTISTS’ REGISTER</p>
        <h1 className="ka-title">Set up your <em>artist</em> profile</h1>
        <p className="ka-sub">Fill in your rate, travel, reels, identity and bank details. This is a demo, so nothing is saved yet.</p>
      </header>

      <section className="kx-panel ka-sec ka-mustard">
        <p className="kx-eyebrow">I · YOUR RATE</p>
        <div className="kx-row">
          <VintageFilterSelect
            variant="field"
            aria-label="Pricing type"
            value={kind}
            options={[
              { value: "hour", label: "Per hour (performers)" },
              { value: "start", label: "Starting from (caterers, décor, planners)" },
            ]}
            onChange={(e) => setKind(e.target.value as "hour" | "start")}
          />
          <input
            className="kx-input"
            type="number"
            min={1}
            placeholder="e.g. 5000"
            value={rate === 0 ? "" : rate}
            onChange={(e) => {
              const raw = e.target.value.replace(/^0+(?=\d)/, "");
              setRate(raw === "" ? 0 : Math.max(1, Number(raw)));
            }}
            onBlur={() => setShowFee(true)}
            aria-label="Rate in rupees"
          />
          <button className="kx-btn" onClick={() => setShowFee(true)}>SEE BREAKUP</button>
        </div>
        <p>Kalzo commission <b>{inr(fee)}</b> · you receive <b>{inr(rate - fee)}</b></p>
        {kind === "start" && <p className="kx-small">Patrons see “Starting from {inr(rate)}” and agree the final amount with you in chat or call (e.g. by number of balloons or plates).</p>}
      </section>

      <section className="kx-panel ka-sec ka-teal">
        <div className="ka-sec-head"><p className="kx-eyebrow">II · LOCATIONS &amp; TRAVEL</p><VintageCar /></div>
        <div className="kx-grid2">
          <label>Base location<input className="kx-input" value={base} onChange={(e) => setBase(e.target.value)} /></label>
          <label>Current location<input className="kx-input" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
        </div>
        <div className="kx-grid2" style={{ marginTop: 12 }}>
          <div className="ka-ticket"><p className="kx-k">WHILE I’M IN {current.toUpperCase() || "MY CURRENT CITY"}</p><TravelPick name="cur" value={currentTravel} onChange={setCurrentTravel} /></div>
          <div className="ka-ticket"><p className="kx-k">EVERYWHERE ELSE</p><TravelPick name="gen" value={generalTravel} onChange={setGeneralTravel} /></div>
        </div>
        <p className="kx-k" style={{ marginTop: 12 }}>PREFERRED LOCATIONS</p>
        <form className="kx-row" onSubmit={(e) => { e.preventDefault(); if (pref.trim()) { setPrefs([...prefs, pref.trim()]); setPref(""); } }}>
          <input className="kx-input" value={pref} onChange={(e) => setPref(e.target.value)} placeholder="Add a city" aria-label="Add preferred city" />
          <button className="kx-btn" type="submit">ADD</button>
        </form>
        <div className="kx-chips">{prefs.map((p) => <button key={p} className="kx-chip" onClick={() => setPrefs(prefs.filter((x) => x !== p))} aria-label={`Remove ${p}`}>{p} ×</button>)}</div>
      </section>

      <section className="kx-panel ka-sec ka-maroon">
        <p className="kx-eyebrow">III · YOUR REELS · 2 REQUIRED, UP TO 4</p>
        <div className="ka-reels">
          {REEL_SLOTS.map((label, i) => (
            <div key={label} className={"ka-reel" + (i < 2 ? " ka-req" : "")}>
              {reels[i] ? <video src={reels[i]!} controls playsInline /> : (
                <label className="ka-reel-empty">
                  <span className="ka-reel-icon">▶</span>
                  <span>{label}</span>
                  <span className="kx-small">{i < 2 ? "Required" : "Optional"} · tap to upload</span>
                  <input type="file" accept="video/*" className="ka-hidden" onChange={(e) => setReel(i, e.target.files?.[0])} aria-label={`Upload ${label}`} />
                </label>
              )}
              {reels[i] && <button className="kx-chip" onClick={() => { const r = [...reels]; r[i] = null; setReels(r); }}>Replace</button>}
            </div>
          ))}
        </div>
        <p className={reelCount >= 2 ? "kx-ok" : "kx-bad"}>{reelCount} of 4 reels added{reelCount < 2 ? ` · add ${2 - reelCount} more` : ""}</p>
      </section>

      <div className="ka-sec ka-indigo"><AadhaarVerify verified={verified} onVerified={() => setVerified(true)} /></div>

      <ArtistRequests />
      <section className="kx-panel ka-sec ka-green">
        <p className="kx-eyebrow">V · WHERE YOUR MONEY GOES</p>
        {bankSaved ? <p className="kx-ok">✓ {bank.holder} · A/c ••••{bank.acc.slice(-4)} · {bank.ifsc.toUpperCase()}{bank.upi ? " · " + bank.upi : ""} <button className="kx-chip" onClick={() => setBankSaved(false)}>Edit</button></p> : <>
          <div className="kx-grid2">
            <label>Account holder name<input className="kx-input" value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} /></label>
            <label>IFSC code<input className="kx-input" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" /></label>
            <label>Account number<input className="kx-input" inputMode="numeric" value={bank.acc} onChange={(e) => setBank({ ...bank, acc: e.target.value.replace(/\D/g, "") })} /></label>
            <label>Re-enter account number<input className="kx-input" inputMode="numeric" value={bank.acc2} onChange={(e) => setBank({ ...bank, acc2: e.target.value.replace(/\D/g, "") })} /></label>
            <label>UPI ID (optional)<input className="kx-input" value={bank.upi} onChange={(e) => setBank({ ...bank, upi: e.target.value })} placeholder="name@bank" /></label>
          </div>
          {bankErr && <p className="kx-bad" role="alert">{bankErr}</p>}
          <button className="kx-btn" style={{ marginTop: 10 }} onClick={saveBank}>SAVE BANK DETAILS</button>
        </>}

        <div className="ka-wallet">
          <div>
            <p className="kx-k">KALZO WALLET</p>
            <p className="ka-balance">{inr(wallet)}</p>
            <p className="kx-small">Booking money lands here first. Move it to your bank anytime.</p>
          </div>
          <button className="kx-btn" disabled={!bankSaved || wallet === 0} onClick={() => setWithdrawing(true)}>WITHDRAW TO BANK</button>
        </div>
        {!bankSaved && <p className="kx-small">Save your bank details to withdraw.</p>}
        <ul className="ka-txns">{txns.map((t, i) => <li key={i}><span>{t.t}</span><b className={t.a < 0 ? "kx-bad" : "kx-ok"}>{t.a < 0 ? "− " : "+ "}{inr(Math.abs(t.a))}</b></li>)}</ul>
        {withdrawing && (
          <div className="kx-modal" role="dialog" aria-modal="true">
            <div className="kx-modal-card">
              <h3 className="kx-h3">Withdraw {inr(wallet)}?</h3>
              <p>To {bank.holder} · A/c ••••{bank.acc.slice(-4)}. Usually reaches your bank within 1 working day.</p>
              <div className="kx-row"><button className="kx-btn" onClick={withdraw}>CONFIRM WITHDRAWAL</button><button className="kx-btn kx-ghost" onClick={() => setWithdrawing(false)}>CANCEL</button></div>
            </div>
          </div>
        )}
      </section>

      <div className="kx-row" style={{ marginTop: 24 }}>
        <button className="kx-btn" disabled={!verified || reelCount < 2 || !bankSaved}>PUBLISH MY PROFILE</button>
        {(!verified || reelCount < 2 || !bankSaved) && <span className="kx-small">Needs Aadhaar verification, 2 reels and bank details.</span>}
      </div>
      <ArtistSave rate={rate} base={base} />
    </main>
  );
}

function VintageCar() {
  return (
    <svg className="ka-car" viewBox="0 0 120 50" aria-hidden="true">
      <path d="M10 34h100v-6c0-4-4-6-9-7l-14-3-12-10H38c-6 0-10 3-14 9l-4 5c-6 1-10 4-10 8z" fill="currentColor" />
      <path d="M40 12h20v10H33zM64 12h9l10 10H64z" fill="var(--ka-paper)" opacity=".85" />
      <circle cx="32" cy="36" r="8" fill="var(--ka-ink)" /><circle cx="32" cy="36" r="3" fill="var(--ka-paper)" />
      <circle cx="90" cy="36" r="8" fill="var(--ka-ink)" /><circle cx="90" cy="36" r="3" fill="var(--ka-paper)" />
      <rect x="104" y="26" width="6" height="4" fill="var(--ka-gold)" />
    </svg>
  );
}

function AadhaarVerify({ verified, onVerified }: { verified: boolean; onVerified: () => void }) {
  const [step, setStep] = useState(0);
  const [num, setNum] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [phrase] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const checkNumber = () => {
    if (!consent) return setErr("Please give consent first.");
    if (!isValidAadhaar(num)) return setErr("That isn’t a valid Aadhaar number. Check the 12 digits.");
    setErr(""); setStep(1);
  };
  const checkOtp = () => { if (/^\d{6}$/.test(otp)) { setErr(""); setStep(2); } else setErr("Enter the 6-digit code."); };
  const record = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const rec = new MediaRecorder(stream); const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setClip(URL.createObjectURL(new Blob(parts, { type: "video/webm" }))); setRecording(false); setStep(3); };
      setRecording(true); rec.start(); setTimeout(() => rec.stop(), 5000);
    } catch { setErr("Camera not available. Allow camera access and try again."); }
  };

  return (
    <section className="kx-panel">
      <p className="kx-eyebrow">IV · AADHAAR VIDEO VERIFICATION</p>
      {verified ? <p className="kx-ok">✓ Verified · Aadhaar {maskAadhaar(num)} · face matched on live video</p> : <>
        {step === 0 && <>
          <input className="kx-input" inputMode="numeric" maxLength={14} value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, ""))} placeholder="12-digit Aadhaar number" aria-label="Aadhaar number" />
          <label className="kx-opts"><span><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to Kalzo verifying my identity with UIDAI for this profile.</span></label>
          <button className="kx-btn" onClick={checkNumber}>SEND OTP TO MY AADHAAR MOBILE</button>
        </>}
        {step === 1 && <>
          <p>OTP sent to the mobile linked with {maskAadhaar(num)}. <span className="kx-small">(Demo: any 6 digits.)</span></p>
          <div className="kx-row"><input className="kx-input" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} aria-label="OTP" /><button className="kx-btn" onClick={checkOtp}>VERIFY OTP</button></div>
        </>}
        {step === 2 && <>
          <p>Look at the camera and say this number aloud: <b style={{ fontSize: 26 }}>{phrase}</b></p>
          <video ref={videoRef} className="kx-cam" muted playsInline />
          <div className="kx-row"><button className="kx-btn" onClick={record} disabled={recording}>{recording ? "RECORDING 5 SECONDS…" : "START LIVE VIDEO"}</button>
            <button className="kx-btn kx-ghost" onClick={() => setStep(3)}>SKIP (DEMO)</button></div>
        </>}
        {step === 3 && <>
          {clip && <video src={clip} className="kx-cam" controls />}
          <p>Video received. Matching your face with your Aadhaar photo…</p>
          <button className="kx-btn" onClick={onVerified}>SIMULATE: VERIFICATION APPROVED</button>
        </>}
        {err && <p className="kx-bad" role="alert">{err}</p>}
        <p className="kx-small">Demo: the Aadhaar number is checked for real (checksum); the OTP and face match need a licensed provider like DigiLocker to go live.</p>
      </>}
    </section>
  );
}
