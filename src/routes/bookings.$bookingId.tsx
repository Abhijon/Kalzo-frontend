import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { bookingDetail } from "@/lib/booking.functions";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { api } from "@/lib/api";
import { kalzoHead } from "@/lib/routeHead";
import { patronData } from "@/lib/patron.functions";
import { CompletionReview } from "@/kalzo/extras/patron/CompletionReview";
export const Route = createFileRoute("/bookings/$bookingId")({
  staticData: { sitemap: false },
  head: () => kalzoHead("Booking room", "Private patron and artist booking progress.", true),
  component: () => (
    <AccountShell title="Your booking">
      <Room />
    </AccountShell>
  ),
});
const STAGE_NOTES: Record<string, string> = {
  accepted: "Your artist has accepted. When they reach your venue, your arrival code will appear here.",
  arrival_confirmed: "Arrival confirmed. Your artist is recording a short venue clip before starting.",
  checked_in: "Your artist is checked in and the show is underway. Your closing code will appear here when they finish.",
  completed: "Show complete. Thank you for booking with Kalzo!",
  declined: "This booking was declined by the artist.",
  cancelled: "This booking was cancelled.",
};
function patronStageNote(stage: string) {
  return STAGE_NOTES[stage] ?? "Your booking codes will appear here at the arrival and closing steps.";
}
function Room() {
  const { bookingId } = Route.useParams();
  const read = useServerFn(bookingDetail);
  const readPatron = useServerFn(patronData);
  const [reviewed, setReviewed] = useState<boolean | null>(null);
  const [d, setD] = useState<Awaited<ReturnType<typeof bookingDetail>> | null>(null),
    [err, setErr] = useState(""),
    [video, setVideo] = useState("");
  const load = () =>
    read({ data: { id: bookingId } })
      .then(setD)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [read, bookingId]);
  useEffect(() => {
    if (!d?.booking.venue_video_path) return;
    api.storage
      .from("kalzo-media")
      .createSignedUrl(d.booking.venue_video_path, 600)
      .then(({ data }) => setVideo(data?.signedUrl ?? ""));
  }, [d]);
  const [checking, setChecking] = useState(false), [payNote, setPayNote] = useState("");
  const checkPayment = async () => {
    setChecking(true);
    setPayNote("");
    const { data: sess } = await api.auth.getSession();
    const token = sess?.session?.access_token;
    const res = await fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ booking_id: bookingId }),
    }).catch(() => null);
    const v = res ? ((await res.json().catch(() => null)) as { status?: string; error?: string } | null) : null;
    setChecking(false);
    if (v?.status === "paid") void load();
    else setPayNote(v?.error || "We couldn't check the payment right now. Please try again in a minute.");
  };
  const awaiting = d?.patron && d.booking.status === "awaiting_payment" && !!d.booking.payment_order_id;
  useEffect(() => {
    if (awaiting) void checkPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaiting]);
  const b = d?.booking;
  useEffect(() => {
    if (!d?.patron || d.booking.workflow_stage !== "completed") return;
    void readPatron().then(p => setReviewed(p.reviews.some(r => r.booking_id === bookingId))).catch(e => setErr(e.message));
  }, [d?.patron, d?.booking.workflow_stage, readPatron, bookingId]);
  const codes = (d?.codes ?? {}) as { arrival?: string; closing?: string };
  return (
    <>
      {err && (
        <p role="alert" className="kl-error">
          {err}
        </p>
      )}
      {b && (
        <>
          <h2>{b.artist_name}</h2>
          <p>
            {b.event_date} · {b.slot} · {b.address}
          </p>
          <p>
            Payment: {b.status} · {b.workflow_stage.replaceAll("_", " ")}
          </p>
          {awaiting && (
            <div className="kl-paycheck">
              <p>Waiting for your payment to be confirmed.</p>
              <button type="button" className="ka-cta" disabled={checking} onClick={() => void checkPayment()}>
                {checking ? "CHECKING…" : "CHECK PAYMENT"}
              </button>
              {payNote && <p className="kl-note">{payNote}</p>}
            </div>
          )}
          {b.status === "paid" && b.workflow_stage === "paid" && d.patron && (
            <p className="kl-note">Payment received. Your invitation is with the artist; you'll see here when they accept.</p>
          )}
          {d.patron ? (
            <>
              {codes.arrival || codes.closing ? (
                <section className="kl-codecard" aria-live="polite">
                  <p className="kl-codecard-eyebrow">
                    {codes.closing ? "SHOW FINISHED · CLOSING CODE" : "YOUR ARTIST HAS ARRIVED · ARRIVAL CODE"}
                  </p>
                  <p className="kl-codecard-digits" aria-label={"Code " + (codes.closing ?? codes.arrival ?? "").split("").join(" ")}>
                    {(codes.closing ?? codes.arrival ?? "").split("").map((c, i) => <span key={i}>{c}</span>)}
                  </p>
                  <p className="kl-codecard-say">
                    {codes.closing
                      ? "Share this code only when you are happy the performance is complete."
                      : "Tell this code to your artist now, so they can check in at your venue."}
                  </p>
                  <p className="kl-codecard-warn">Never share it on a call or message before the artist is with you.</p>
                </section>
              ) : (
                <p className="kl-note">{patronStageNote(b.workflow_stage)}</p>
              )}
              <p className="kx-small">This page refreshes by itself. Your code appears here the moment it's needed.</p>
            </>
          ) : (
            <Link to="/artist" className="ka-cta">Open artist booking steps</Link>
          )}
          {video && <video src={video} controls playsInline className="kl-photo" />}
          {b.workflow_stage === "completed" && (
            <p>
              Completion confirmed. Payout setup is required; no bank transfer has been confirmed.
            </p>
          )}
          {d.patron && b.workflow_stage === "completed" && reviewed === false && <CompletionReview booking={bookingId} onSaved={() => setReviewed(true)} />}
          {reviewed && <p role="status">Thank you. Your rating and review are saved.</p>}
        </>
      )}
    </>
  );
}
