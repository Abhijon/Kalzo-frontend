import { useEffect, useState } from "react";
import { InvitationDelivery } from "./InvitationDelivery";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, MailOpen, MapPin, PartyPopper, Wallet, CheckCircle2 } from "lucide-react";
import { artistPanelData } from "@/lib/artistPanel.functions";
import { bookingStep, requestArtistCancellation } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { ACCEPT_MESSAGE, REJECT_WARNING } from "@/kalzo/extras/artist/rules";
import {
  bookingGroup,
  canRequestCancellation,
  patronCodeSchema,
  isAcceptedBooking,
} from "@/kalzo/extras/artist/flowRules";
import { LiveRecorder } from "@/kalzo/extras/artist/LiveRecorder";
import { matchesBookingView } from "./bookingViews";
import { invitationDeadline } from "./invitationDeadline";
type B = Awaited<ReturnType<typeof artistPanelData>>["bookings"][number];
type Action =
  | "accept"
  | "decline"
  | "arrive"
  | "arrival_code"
  | "venue_video"
  | "start"
  | "finish"
  | "closing_code";
const STEPS = [
  ["paid", "Invitation"],
  ["accepted", "Reach venue"],
  ["arrived", "Arrival OTP"],
  ["arrival_confirmed", "Live video"],
  ["performing", "Performance"],
  ["finished", "Closing OTP"],
  ["completed", "Payment"],
] as const;
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export function ArtistBookings({ requestsOnly = false }: { requestsOnly?: boolean }) {
  const read = useServerFn(artistPanelData);
  const [list, setList] = useState<B[] | null>(null),
    [err, setErr] = useState(""),
    [filter, setFilter] = useState("all");
  const load = () =>
    read()
      .then((d) => setList(d.bookings))
      .catch((e) => setErr(e.message));
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [read]);
  if (err) return <p className="kl-error">{err}</p>;
  if (!list) return <p>Loading…</p>;
  const visible = list.filter((b) => matchesBookingView(b, filter));
  const accepted = list
    .filter(
      (b) =>
        b.status === "paid" &&
        !["paid", "declined", "cancellation_requested", "cancelled"].includes(b.workflow_stage),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <>
      <div className="kl-summary">
        <Button variant="outline" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          <strong>{list.length}</strong> total bookings
        </Button>
        <Button variant="outline" aria-pressed={filter === "awaiting"} onClick={() => setFilter("awaiting")}>
          <strong>
            {list.filter((b) => b.status === "paid" && b.workflow_stage === "paid").length}
          </strong>{" "}
          awaiting your response
        </Button>
        <Button variant="outline" aria-pressed={filter === "completed"} onClick={() => setFilter("completed")}>
          <strong>{list.filter((b) => b.workflow_stage === "completed").length}</strong> completed
        </Button>
        <Button variant="outline" aria-pressed={filter === "current"} onClick={() => setFilter("current")}><strong>{list.filter(b => b.status === "paid" && isAcceptedBooking(b.workflow_stage)).length}</strong> current bookings</Button>
      </div>
      {requestsOnly && <div className="ka-history-tabs" role="group" aria-label="Booking request views">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Booking invitations</Button>
        <Button variant={filter === "current" ? "default" : "outline"} onClick={() => setFilter("current")}>Current bookings</Button>
      </div>}
      <div className="ka-section-title">
        {requestsOnly ? <MailOpen size={26} /> : <CalendarDays size={26} />}
        <h2>{requestsOnly ? "Your invitations to the stage" : "Every mehfil, in one place"}</h2>
      </div>
      {!requestsOnly && (
        <div className="ka-history-tabs" role="group" aria-label="Booking history filters">
          {["all", "current", "upcoming", "past"].map((f) => (
            <Button
              key={f}
              variant="outline"
              aria-pressed={filter === f}
              className={filter === f ? "on" : ""}
              onClick={() => setFilter(f)}
            >
              {f[0]?.toUpperCase()}
              {f.slice(1)}
            </Button>
          ))}
        </div>
      )}
      {!visible.length ? (
        <InvitationDelivery empty>
          <MailOpen size={44} />
          <h3>{requestsOnly ? "Your bookings are on the way." : "No bookings here yet"}</h3>
          <p>
            {requestsOnly
              ? "Your booking invitations will be delivered here."
              : "Your performances will appear in the matching booking history."}
          </p>
        </InvitationDelivery>
      ) : (
        visible.map((b) => (
          <InvitationDelivery key={b.id}>
            <BookingCard
              b={b}
              reload={load}
              bookingNumber={accepted.findIndex((a) => a.id === b.id) + 1 || accepted.length + 1}
            />
          </InvitationDelivery>
        ))
      )}
    </>
  );
}
function BookingCard({
  b,
  reload,
  bookingNumber,
}: {
  b: B;
  reload: () => Promise<unknown>;
  bookingNumber: number;
}) {
  const step = useServerFn(bookingStep),
    cancel = useServerFn(requestArtistCancellation);
  const [busy, setBusy] = useState(false),
    [err, setErr] = useState(""),
    [code, setCode] = useState(""),
    [confirmation, setConfirmation] = useState<"reject" | "cancel" | null>(null);
  async function act(action: Action, video = "") {
    setBusy(true);
    setErr("");
    try {
      await step({ data: { id: b.id, action, code, video } });
      setCode("");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update booking.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: Blob) {
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.auth.getUser();
      if (!data?.user) throw new Error("Please sign in again.");
      const ext = file.type.includes("mp4") ? "mp4" : "webm";
      const path = `${data.user.id}/venue-${crypto.randomUUID()}.${ext}`;
      const { error } = await api.storage
        .from("kalzo-media")
        .upload(path, file);
      if (error) throw error;
      await act("venue_video", path);
      await act("start");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit venue video.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const run = (action: Action) => {
    void act(action).catch(() => {});
  };
  async function confirm() {
    if (confirmation === "reject") {
      run("decline");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await cancel({ data: { id: b.id } });
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not request cancellation.");
    } finally {
      setBusy(false);
    }
  }
  const s = b.workflow_stage;
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 10_000); return () => window.clearInterval(timer); }, []);
  const deadline = b.invitation_sent_at ? invitationDeadline(b.invitation_sent_at, clock) : "waiting";
  const idx = s === "checked_in" ? 4 : STEPS.findIndex(([key]) => key === s);
  return (
    <article className="ka-booking">
      <header>
        <div>
          <strong>
            {b.event_date} · {b.slot}
          </strong>
          <p>
            <MapPin size={15} /> {b.address} · {b.guests} guests
          </p>
        </div>
        <b>{inr(b.amount_inr)}</b>
      </header>
      {idx >= 0 && (
        <ol className="ka-steps">
          {STEPS.map(([key, label], i) => (
            <li key={key} className={i < idx ? "done" : i === idx ? "now" : ""}>
              {label}
            </li>
          ))}
        </ol>
      )}
      {b.note && <p className="kl-note">“{b.note}”</p>}
      {s === "paid" && b.invitation_sent_at && <p className="kl-note">{deadline === "expired" ? "Invitation closed — the 30-minute response deadline has passed." : deadline === "reminder" ? "Final reminder: please respond before the 30-minute deadline." : "Please accept or decline within 30 minutes. A reminder arrives after 25 minutes."}</p>}
      {b.status !== "paid" ? (
        <p className="kl-note">Waiting for the patron's verified payment.</p>
      ) : (
        <div className="ka-stage">
          {s === "paid" && (
            <div className="kl-actions">
              <Button disabled={busy || deadline === "expired"} onClick={() => run("accept")}>
                <CheckCircle2 size={16} />
                Accept booking request
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setConfirmation("reject")}>
                Reject
              </Button>
            </div>
          )}
          {s === "accepted" && (
            <>
              <div className="ka-celebrate">
                <PartyPopper size={28} />
                <h3>Congratulations! Booking #{bookingNumber} is yours.</h3>
                <p>{ACCEPT_MESSAGE(b.amount_inr)}</p>
              </div>
              <p>
                Reach the venue on {b.event_date} at {b.slot}. Confirm arrival only when you are
                there.
              </p>
              <Button disabled={busy} onClick={() => run("arrive")}>
                <MapPin size={16} />I have reached the venue
              </Button>
            </>
          )}
          {(s === "arrived" || s === "finished") && (
            <>
              <h3>
                {s === "arrived"
                  ? "Confirm arrival with your patron"
                  : "One last step after your performance"}
              </h3>
              <p>
                {s === "arrived"
                  ? "Get the four-digit arrival OTP from the patron's booking screen."
                  : "Once your performance is done, get the four-digit closing OTP from the patron."}
              </p>
              <div className="kl-actions">
                <input
                  className="ka-otp"
                  aria-label="Patron OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                />
                <Button
                  disabled={busy || !patronCodeSchema.safeParse(code).success}
                  onClick={() => run(s === "arrived" ? "arrival_code" : "closing_code")}
                >
                  Submit OTP
                </Button>
              </div>
            </>
          )}
          {s === "arrival_confirmed" && (
            <>
              <h3>A quick glimpse of your venue</h3>
              <p>
                Record a live 15-second clip of your venue and performance space so Kalzo can
                review proof of your arrival and performance space if the patron does not provide
                the final OTP. This supports a payment dispute review; it does not guarantee payment.
              </p>
              <LiveRecorder kind="venue" busy={busy} onDone={upload} />
            </>
          )}
          {s === "checked_in" && (
            <Button disabled={busy} onClick={() => run("start")}>
              Start performance
            </Button>
          )}
          {s === "performing" && (
            <>
              <CheckCircle2 size={28} />
              <h3>Your venue clip is submitted</h3>
              <p>Enjoy your performance. When you finish, ask your patron for the closing OTP.</p>
              <Button disabled={busy} onClick={() => run("finish")}>
                Performance complete · get closing OTP
              </Button>
            </>
          )}
          {s === "completed" && (
            <>
              <div className="ka-celebrate">
                <PartyPopper size={32} />
                <h3>Woohoo! You completed your booking today.</h3>
                <p>
                  Your closing OTP is confirmed. Your payment is queued for settlement, not yet paid
                  into your bank.
                </p>
                <p>Your remaining earnings are due within 48–72 hours (two to three days), subject to bank settlement setup.</p>
              </div>
              <PaymentBreakdown booking={b} />
            </>
          )}
          {canRequestCancellation(s) && (
            <Button variant="outline" disabled={busy} onClick={() => setConfirmation("cancel")}>
              Request cancellation
            </Button>
          )}
        </div>
      )}
      {s === "declined" && (
        <p>You rejected this invitation. The patron's refund is under review.</p>
      )}
      {s === "cancellation_requested" && (
        <p>
          Cancellation requested. Kalzo will review the refund and payment adjustments; unreleased
          earnings are on hold.
        </p>
      )}
      {err && (
        <p className="kl-error" role="alert">
          {err}
        </p>
      )}
      <AlertDialog open={!!confirmation} onOpenChange={(open) => !open && setConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "reject" ? "Reject this booking?" : "Request cancellation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "reject"
                ? REJECT_WARNING
                : "Kalzo will review the cancellation, refund and any advance already released. Unreleased payments will be put on hold. This is not an automatic refund."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirm()}>
              {confirmation === "reject" ? "Reject booking" : "Request cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
function PaymentBreakdown({ booking: b }: { booking: B }) {
  return (
    <div className="ka-payment-breakdown">
      <h3>
        <Wallet size={21} />
        Your payment breakdown
      </h3>
      <dl>
        <div>
          <dt>Booking amount</dt>
          <dd>{inr(b.amount_inr)}</dd>
        </div>
        <div>
          <dt>Performance subtotal</dt>
          <dd>
            {b.performance_subtotal_inr === null
              ? "Awaiting confirmed breakdown"
              : inr(b.performance_subtotal_inr)}
          </dd>
        </div>
        <div>
          <dt>Kalzo artist service charge</dt>
          <dd>
            {b.artist_fee_inr === null
              ? "Awaiting confirmed breakdown"
              : `− ${inr(b.artist_fee_inr)}`}
          </dd>
        </div>
        <div>
          <dt>Net artist earnings</dt>
          <dd>
            {b.artist_net_inr === null ? "Awaiting confirmed breakdown" : inr(b.artist_net_inr)}
          </dd>
        </div>
      </dl>
      <p>
        Settlement status:{" "}
        {b.payout_status === "released" ? "Released to bank" : "Pending bank settlement"}. Bank
        transfers are not active yet; no settlement is shown as successful before it is confirmed.
      </p>
    </div>
  );
}
