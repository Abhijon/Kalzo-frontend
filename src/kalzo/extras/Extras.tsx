import { useEffect, useRef, useState } from "react";
import { FEE_TIERS, bookingMoney, serviceFee } from "./fees";
import { checkMessage } from "./moderation";

export type FlowInfo = { name: string; first: string; city: string; unit: string; rate: number; travel: number; subtotal: number; qtyText: string };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function OffPlatformWarning({ onOk }: { onOk: () => void }) {
  return (
    <div className="kx-modal" role="dialog" aria-modal="true" aria-labelledby="kx-warn-title">
      <div className="kx-modal-card">
        <p className="kx-eyebrow">BEFORE YOU TALK</p>
        <h3 id="kx-warn-title" className="kx-h3">Keep every deal on Kalzo</h3>
        <p>Sharing phone numbers, asking to “talk after this call”, or booking offline is not allowed. Such messages are flagged for review and can lead to <b>account suspension</b>.</p>
        <p className="kx-small">Your money is only protected when you book and pay on Kalzo.</p>
        <button className="kx-btn" onClick={onOk}>I UNDERSTAND</button>
      </div>
    </div>
  );
}

type Msg = { from: "me" | "them"; text: string; flag?: string | undefined };

export function KalzoTalk({ info }: { info?: FlowInfo }) {
  const [mode, setMode] = useState<"none" | "chat" | "call">("none");
  const [warned, setWarned] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [call, setCall] = useState<"idle" | "ringing" | "live" | "ended">("idle");
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  if (!info) return null;
  const vendor = info.unit !== "hour";
  const open = (m: "chat" | "call") => { setMode(m); };
  const send = () => {
    const text = draft.trim(); if (!text) return;
    const flag = checkMessage(text) || undefined;
    setMsgs((m) => [...m, { from: "me", text, flag }, { from: "them", text: flag ? "Let’s keep everything on Kalzo please — that’s how both of us stay protected." : `Thank you! Happy to discuss — share the event details and I’ll confirm the plan here.` }]);
    setDraft("");
  };
  const startCall = () => {
    setCall("ringing"); setSecs(0);
    setTimeout(() => { setCall("live"); timer.current = setInterval(() => setSecs((s) => s + 1), 1000); }, 1600);
  };
  const endCall = () => { if (timer.current) clearInterval(timer.current); setCall("ended"); };

  return (
    <div className="kx-panel">
      {mode !== "none" && !warned && <OffPlatformWarning onOk={() => setWarned(true)} />}
      <p className="kx-eyebrow">TALK BEFORE YOU BOOK</p>
      <h3 className="kx-h3">Chat or call {info.first} through Kalzo</h3>
      <div className="kx-terms">
        <div><span className="kx-k">PRICE</span> {vendor ? <>Starting from <b>{inr(info.rate)}</b> {info.unit === "plate" ? "per plate" : "per event"} — final price depends on the work (e.g. number of balloons or dishes), so discuss it first.</> : <><b>{inr(info.rate)}</b> per hour</>}</div>
        <div><span className="kx-k">TRAVEL &amp; STAY</span> {info.travel === 0 ? <>Not needed — {info.first} is already in {info.city}.</> : <>Excluded from the rate · {inr(info.travel)} travel &amp; stay added.</>}</div>
      </div>
      <div className="kx-row">
        <button className={"kx-btn" + (mode === "chat" ? "" : " kx-ghost")} onClick={() => open("chat")}>CHAT</button>
        <button className={"kx-btn" + (mode === "call" ? "" : " kx-ghost")} onClick={() => open("call")}>CALL VIA KALZO</button>
      </div>
      {mode === "chat" && warned && (
        <div className="kx-chat">
          <div className="kx-msgs" aria-live="polite">
            {msgs.length === 0 && <p className="kx-small">Ask about timings, songs, or setup. Try typing a phone number to see the safety check.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={"kx-msg " + (m.from === "me" ? "kx-me" : "kx-them")}>
                {m.text}
                {m.flag && <span className="kx-flag">⚑ Flagged for review · {m.flag}. Taking deals outside Kalzo can suspend your account.</span>}
              </div>
            ))}
          </div>
          <form className="kx-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="kx-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${info.first}…`} aria-label="Message" />
            <button className="kx-btn" type="submit">SEND</button>
          </form>
        </div>
      )}
      {mode === "call" && warned && (
        <div className="kx-call">
          <p className="kx-small">Neither side sees the other’s real number. Calls connect through a Kalzo line and may be recorded for safety.</p>
          {call === "idle" && <button className="kx-btn" onClick={startCall}>📞 CONNECT ME TO {info.first.toUpperCase()}</button>}
          {call === "ringing" && <p>Connecting via Kalzo line <b>+91 80 4XXX XX21</b>…</p>}
          {call === "live" && <><p>On call with {info.first} · {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}</p><button className="kx-btn" onClick={endCall}>END CALL</button></>}
          {call === "ended" && <p>Call ended. Happy with the plan? Fill in the invitation below to book safely.</p>}
        </div>
      )}
    </div>
  );
}

export function KalzoFees({ info }: { info?: FlowInfo }) {
  if (!info) return null;
  const m = bookingMoney(info.subtotal, info.rate);
  const fee = serviceFee(info.rate);
  return (
    <div className="kx-panel kx-wide">
      <p className="kx-eyebrow">HOW THE MONEY MOVES</p>
      <h3 className="kx-h3">Clear fees for both sides</h3>
      <div className="kx-grid2">
        <div>
          <p className="kx-k">YOU (PATRON)</p>
          <dl className="kx-dl">
            <dt>Performance ({info.qtyText}){info.travel ? " + travel & stay" : ""}</dt><dd>{inr(info.subtotal)}</dd>
            <dt>Kalzo service fee</dt><dd>{inr(fee)}</dd>
            <dt><b>Pay now, 100% upfront</b></dt><dd><b>{inr(m.patronPays)}</b></dd>
          </dl>
          <p className="kx-small">Held safely by Kalzo — never sent straight to the artist.</p>
        </div>
        <div>
          <p className="kx-k">{info.first.toUpperCase()} (ARTIST)</p>
          <dl className="kx-dl">
            <dt>Booking amount</dt><dd>{inr(info.subtotal)}</dd>
            <dt>Kalzo service fee</dt><dd>− {inr(fee)}</dd>
            <dt>25% advance on reconfirming</dt><dd>{inr(m.advance)}</dd>
            <dt>Balance after closing OTP</dt><dd>{inr(m.balance)}</dd>
            <dt><b>Artist receives</b></dt><dd><b>{inr(m.net)}</b></dd>
          </dl>
          <p className="kx-small">Paid into the artist’s Kalzo wallet; the advance can be withdrawn after 48 hours.</p>
        </div>
      </div>
      <p className="kx-k" style={{ marginTop: 18 }}>FEE BY ARTIST’S RATE</p>
      <div className="kx-tiers">
        {FEE_TIERS.map((t) => <div key={t.fee} className={"kx-tier" + (t.fee === fee ? " kx-on" : "")}><span>{t.label}</span><b>{inr(t.fee)}</b></div>)}
      </div>
    </div>
  );
}
