import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDetailView, useBookingById } from "@/kalzo/extras/BookingDetailView";
import { ACCEPT_MESSAGE, REJECT_WARNING } from "@/kalzo/extras/artist/rules";
import { api } from "@/lib/api";
import { kalzoHead } from "@/lib/routeHead";

export const Route = createFileRoute("/artist/bookings/$bookingId")({
  staticData: { sitemap: false },
  head: () => kalzoHead("Booking request", "Review and respond to a patron booking.", true),
  component: ArtistBookingReview,
});

function ArtistBookingReview() {
  const { bookingId } = Route.useParams();
  const { b, err, loading, reload, setErr } = useBookingById(bookingId);
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: string) => {
    if (status === "rejected" && !window.confirm(REJECT_WARNING)) return;
    setBusy(true);
    setErr("");
    const res = await api.bookings.updateStatus(bookingId, status);
    setBusy(false);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    if (status === "accepted") {
      window.alert(ACCEPT_MESSAGE(b?.amountInr ?? 0));
    }
    await reload();
  };

  if (err && !b) {
    return (
      <p role="alert" className="kl-error">
        {err}
      </p>
    );
  }

  if (loading || !b) {
    return <p className="kl-note">Loading booking…</p>;
  }

  const pending = b.status === "pending";

  return (
    <div className="kl-narrow">
      <nav className="kb-detail-back-row" aria-label="Booking navigation">
        <Link to="/artist" className="kb-detail-link">
          ← Booking requests
        </Link>
        <Link to="/artist/bookings" className="kb-detail-link">
          ← All bookings
        </Link>
      </nav>
      {err && (
        <p role="alert" className="kl-error">
          {err}
        </p>
      )}
      <BookingDetailView
        booking={b}
        audience="artist"
        foot={null}
        actions={
          <div className="kb-detail-actions">
            {pending && (
              <>
                <Button disabled={busy} onClick={() => void setStatus("accepted")}>
                  Accept
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void setStatus("rejected")}
                >
                  Reject
                </Button>
              </>
            )}
            {!pending && b.status === "accepted" && (
              <Button disabled={busy} onClick={() => void setStatus("job_started")}>
                Job started
              </Button>
            )}
            {!pending && b.status === "job_started" && (
              <Button disabled={busy} onClick={() => void setStatus("completed")}>
                Mark completed
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
