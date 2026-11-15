import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { bookingMoney } from "./fees";
import {
  ARRIVAL_CODE,
  CLOSING_CODE,
  accept,
  decline,
  endShow,
  enterArrival,
  enterClosing,
  initialFlow,
  markArrived,
  patronCodeToShow,
  recordVideo,
  startShow,
  type FlowState,
} from "./bookingFlow";

const DEMO = bookingMoney(10500, 3500);
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const STAGE_LABEL: Record<string, string> = {
  requested: "Waiting for the artist",
  accepted: "Accepted · fee held by Kalzo",
  arrived: "Artist at your door",
  checked_in: "Checked in · proof saved",
  show_on: "Show in progress",
  show_done: "Show over",
  released: "Confirmed · payout within 48 hours",
  declined: "Declined · refunded",
};

export function BookingRoom() {
  const [s, setS] = useState<FlowState>(initialFlow);
  const [aCode, setACode] = useState("");
  const [cCode, setCCode] = useState("");
  const [rec, setRec] = useState<number | null>(null);

  useEffect(() => {
    if (rec === null) return;
    if (rec >= 100) {
      setS((cur) => recordVideo(cur));
      setRec(null);
      return;
    }
    const t = setTimeout(() => setRec(rec + 5), 55);
    return () => clearTimeout(t);
  }, [rec]);

  const show = patronCodeToShow(s);
  const reset = () => {
    setS(initialFlow());
    setACode("");
    setCCode("");
    setRec(null);
  };

  const codeBox = (label: string, code: string, live: boolean, shared: boolean) => (
    <div className="kr-code-wrap">
      <p className="kr-h">{label}</p>
      <p className={"kr-code" + (live ? " is-live" : "")}>{live ? code : shared ? "shared ✓" : "• • • •"}</p>
    </div>
  );

  return (
    <div className="kr-room">
      <p className="kx-eyebrow">PRACTICE MODE · NO MONEY MOVES</p>
      <h3 className="kx-h3">Try both sides of a booking</h3>
      <p className="kx-small">
        Sample booking · arrival <b>{ARRIVAL_CODE}</b> · closing <b>{CLOSING_CODE}</b>.
      </p>

      <div className="kr-pair">
        {/* ---------- patron side ---------- */}
        <div className="kr-phone" key={"patron-" + s.stage}>
          <p className="kr-h">YOUR PHONE · PATRON</p>
          <p className="kr-stage">{STAGE_LABEL[s.stage]}</p>
          <p className="kr-msg" aria-live="polite">{s.stage === "requested" ? "Your invitation has been sent. Waiting for the artist to accept." : s.stage === "accepted" ? "Your artist accepted. Payment stays with Kalzo until the booking is completed." : s.stage === "arrived" ? "Your artist has arrived. Share your arrival code at the venue." : s.stage === "checked_in" ? "Arrival confirmed. Check-in proof saved." : s.stage === "show_on" ? "Your performance is underway. The closing code stays hidden until the show ends." : s.stage === "show_done" ? "The show has ended. Share the closing code to confirm completion and authorize payout." : s.stage === "released" ? "Completion confirmed. Artist payout is due within 48 hours." : "Invitation declined. Full refund and alternative artists."}</p>
          {codeBox("ARRIVAL CODE", ARRIVAL_CODE, show === "arrival", s.arrivalOk)}
          {codeBox("CLOSING CODE", CLOSING_CODE, show === "closing", s.closingOk)}
          <p className="kr-msg">
            {inr(DEMO.patronPays)} held by Kalzo · {inr(DEMO.net)} reaches the artist after the show. You never pay anyone directly.
          </p>
        </div>

        {/* ---------- artist side ---------- */}
        <div className="kr-phone" key={"artist-" + s.stage + s.arrivalOk}>
          <p className="kr-h">ARTIST&apos;S PHONE · DJ ARJUN</p>

          {s.stage === "requested" && (
            <>
              <p className="kr-stage">New invitation</p>
              <p className="kr-msg">
                Wedding · Sat 14 · 7:00 PM onwards<br />
               Venue: 12 Palm Grove, Jaipur<br />
                Fee held by Kalzo: {inr(DEMO.patronPays)}
              </p>
              <div className="kx-row">
                <Button variant="ghost" className="kx-btn" onClick={() => setS(accept(s))}>ACCEPT</Button>
                <Button variant="ghost" className="kx-btn kx-ghost" onClick={() => setS(decline(s))}>DECLINE</Button>
              </div>
            </>
          )}

          {s.stage === "accepted" && (
            <>
              <p className="kr-stage">You accepted</p>
              <p className="kr-msg">Head to the venue. When you arrive, ask the patron for the arrival code.</p>
              <Button variant="ghost" className="kx-btn" onClick={() => setS(markArrived(s))}>I HAVE ARRIVED</Button>
            </>
          )}

          {s.stage === "arrived" && !s.arrivalOk && (
            <>
              <p className="kr-stage">Enter the arrival code</p>
              <div className="kx-row">
                <input
                  className="kx-input"
                  inputMode="numeric"
                  aria-label="Arrival code"
                  value={aCode}
                  onChange={(e) => setACode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit code"
                />
                <Button variant="ghost" className="kx-btn" onClick={() => setS(enterArrival(s, aCode))}>CONFIRM ARRIVAL</Button>
              </div>
            </>
          )}

          {s.stage === "arrived" && s.arrivalOk && (
            <>
              <p className="kr-stage">Record the check-in video</p>
              <p className="kr-msg">A short live clip at the venue is your proof of arrival.</p>
              {rec === null ? (
                <Button variant="ghost" className="kx-btn" onClick={() => setRec(0)}>RECORD 20-SECOND VIDEO</Button>
              ) : (
                <div className="kr-bar" aria-label="Recording"><i style={{ width: rec + "%" }} /></div>
              )}
            </>
          )}

          {s.stage === "checked_in" && (
            <>
              <p className="kr-ok">Live check-in video saved as proof of arrival.</p>
              <Button variant="ghost" className="kx-btn" onClick={() => setS(startShow(s))}>START THE SHOW</Button>
            </>
          )}

          {s.stage === "show_on" && (
            <>
              <p className="kr-stage">Show in progress</p>
              <Button variant="ghost" className="kx-btn" onClick={() => setS(endShow(s))}>THE SHOW IS OVER</Button>
            </>
          )}

          {s.stage === "show_done" && (
            <>
              <p className="kr-stage">Enter the closing code</p>
              <div className="kx-row">
                <input
                  className="kx-input"
                  inputMode="numeric"
                  aria-label="Closing code"
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit code"
                />
                <Button variant="ghost" className="kx-btn" onClick={() => setS(enterClosing(s, cCode))}>ENTER CLOSING CODE</Button>
              </div>
            </>
          )}

          {s.stage === "released" && (
            <>
              <p className="kr-ok">Both sides confirmed. {inr(DEMO.net)} reaches you within 48 hours.</p>
              <p className="kr-msg">Wallet advance of {inr(DEMO.advance)} is already credited; the rest lands on payout.</p>
            </>
          )}

          {s.stage === "declined" && (
            <p className="kr-bad">Declined. The patron is refunded in full and shown similar artists.</p>
          )}

          {s.error && <p className="kr-err">{s.error}</p>}

          <div className="kx-row">
            <Button variant="ghost" className="kx-btn kx-ghost" onClick={reset}>START AGAIN</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
