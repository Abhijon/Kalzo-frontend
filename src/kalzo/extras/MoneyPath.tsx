import { useEffect, useState } from "react";

const STEPS = [
  { t: "Book & pay in full", d: "Your whole payment goes to Kalzo and is held safely, never straight to the artist.", tag: "100% SECURED", i: "M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3" },
  { t: "Artist accepts", d: "The artist gets your request and accepts it. No reply? A reconfirmation goes out ~10 hours before the event.", tag: "REQUEST SENT", i: "M5 12l4 4 10-10" },
  { t: "Arrives · you share OTP", d: "When the artist reaches your venue, you share your arrival OTP.", tag: "ARRIVAL OTP", i: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 9.5a.5.5 0 1 0 .01 0" },
  { t: "Live check-in video", d: "Before the show, the artist records a short live video as proof of arrival.", tag: "PROOF SAVED", i: "M3 7h12v10H3z M15 10l6-3v10l-6-3" },
  { t: "Show ends · second OTP", d: "After the performance, you share the closing OTP to confirm it's done.", tag: "CLOSING OTP", i: "M15 7a4 4 0 1 0 .01 0 M12.2 11.8L4 20 M7 17l2 2" },
  { t: "Payment released", d: "The artist is paid within 48 hours, or as fast as the bank allows.", tag: "WITHIN 48 HRS", i: "M12 4c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3z M5 7v5c0 1.7 3 3 7 3s7-1.3 7-3V7 M5 12v5c0 1.7 3 3 7 3s7-1.3 7-3v-5" },
];

export function MoneyPath() {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setAt((a) => (a + 1) % STEPS.length), 2600);
    return () => clearInterval(id);
  }, [paused]);
  const pct = (at / (STEPS.length - 1)) * 100;
  return (
    <div className="mp-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mp-track" aria-hidden="true"><div className="mp-fill" style={{ width: pct + "%" }} /><span className="mp-coin" style={{ left: pct + "%" }}>₹</span></div>
      <ol className="mp-steps">
        {STEPS.map((s, k) => (
          <li key={k} className={"mp-step" + (k === at ? " is-on" : k < at ? " is-done" : "")}>
            <button type="button" className="mp-dot" onClick={() => { setAt(k); setPaused(true); }} aria-label={`Step ${k + 1}: ${s.t}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={k < at ? "M5 12l4 4 10-10" : s.i} /></svg>
            </button>
            <span className="mp-n">STEP {String(k + 1).padStart(2, "0")}</span>
            <strong className="mp-t">{s.t}</strong>
            <span className="mp-d">{s.d}</span>
            <span className="mp-tag">{s.tag}</span>
          </li>
        ))}
      </ol>
      <div className="mp-safety">
        <span className="mp-safety-ic" aria-hidden="true">↺</span>
        <div><b>If the artist still doesn't accept</b> after the reconfirmation, your full payment comes straight back to you, and Kalzo suggests similar artists who are free on your date.</div>
      </div>
    </div>
  );
}
