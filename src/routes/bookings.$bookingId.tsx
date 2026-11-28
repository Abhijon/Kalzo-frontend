import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { BookingDetailView, useBookingById } from "@/kalzo/extras/BookingDetailView";
import { CompletionReview } from "@/kalzo/extras/patron/CompletionReview";
import { kalzoHead } from "@/lib/routeHead";

export const Route = createFileRoute("/bookings/$bookingId")({
  staticData: { sitemap: false },
  head: () => kalzoHead("Booking room", "Private patron and artist booking progress.", true),
  component: () => (
    <AccountShell
      title="Your booking"
      narrow
      lead={
        <Link to="/account" className="kb-detail-link kb-detail-back">
          ← My bookings
        </Link>
      }
    >
      <Room />
    </AccountShell>
  ),
});

function Room() {
  const { bookingId } = Route.useParams();
  const { b, err, loading, reload } = useBookingById(bookingId);

  useEffect(() => {
    const t = setInterval(() => void reload(), 15000);
    return () => clearInterval(t);
  }, [bookingId]);

  if (err && !b) {
    return (
      <p role="alert" className="kl-error">
        {err}
      </p>
    );
  }

  if (loading || !b) {
    return <p className="kl-note">Loading your booking…</p>;
  }

  const needsReview =
    b.paymentStatus === "paid" && b.status === "completed" && !b.review;

  return (
    <BookingDetailView
      booking={b}
      audience="patron"
      actions={
        needsReview ? (
          <CompletionReview booking={b.id} onSaved={() => void reload()} />
        ) : undefined
      }
    />
  );
}
