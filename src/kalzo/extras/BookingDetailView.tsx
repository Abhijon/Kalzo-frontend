import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Info, MapPin, NotebookPen, Users } from "lucide-react";
import { api, unwrapData } from "@/lib/api";
import flourishTop from "@/assets/invitation-flourish-top.png.asset.json";
import flourishBottom from "@/assets/invitation-flourish-bottom.png.asset.json";
import "./artist/invitation-card.css";

const FLOURISH_TOP = `https://kalzo.in${flourishTop.url}`;
const FLOURISH_BOTTOM = `https://kalzo.in${flourishBottom.url}`;

export type BookingReview = {
  id: string;
  rating: number;
  body: string;
  tags: string[];
  createdAt: string;
};

export type BookingDto = {
  id: string;
  eventDate: string;
  day?: string;
  address: string;
  guests: string | null;
  note: string | null;
  amountInr: number;
  status: string;
  paymentStatus: string;
  review: BookingReview | null;
  artist?: { stageName?: string | null; photoUrl?: string | null };
  customer?: {
    fullName?: string | null;
    email?: string | null;
    mobileNumber?: string | null;
    phone?: string | null;
  };
};

/** Normalize GET /bookings/:id so camelCase / snake_case customer fields are usable. */
export function normalizeBookingDetail(raw: any): BookingDto | null {
  if (!raw || typeof raw !== "object") return null;
  const customer = raw.customer ?? {};
  const artist = raw.artist ?? {};
  return {
    id: String(raw.id ?? ""),
    eventDate: String(raw.eventDate ?? raw.event_date ?? ""),
    day: raw.day ?? undefined,
    address: String(raw.address ?? ""),
    guests: raw.guests ?? null,
    note: raw.note ?? null,
    amountInr: Number(raw.amountInr ?? raw.amount_inr ?? 0),
    status: String(raw.status ?? "pending"),
    paymentStatus: String(raw.paymentStatus ?? raw.payment_status ?? "unpaid").toLowerCase(),
    review: raw.review
      ? {
          id: String(raw.review.id ?? ""),
          rating: Number(raw.review.rating ?? 0),
          body: String(raw.review.body ?? ""),
          tags: Array.isArray(raw.review.tags)
            ? raw.review.tags.map((t: unknown) => String(t)).filter(Boolean)
            : [],
          createdAt: String(raw.review.createdAt ?? raw.review.created_at ?? ""),
        }
      : null,
    artist: {
      stageName: artist.stageName ?? artist.stage_name ?? null,
      photoUrl: artist.photoUrl ?? artist.photo_url ?? null,
    },
    customer: {
      fullName: customer.fullName ?? customer.full_name ?? null,
      email: customer.email ?? null,
      mobileNumber:
        customer.mobileNumber ??
        customer.mobile_number ??
        customer.phone ??
        null,
      phone: customer.phone ?? customer.mobileNumber ?? customer.mobile_number ?? null,
    },
  };
}

const PATRON_NOTES: Record<string, string> = {
  payment_pending: "Payment is pending. Complete payment to send this invitation to the artist.",
  pending: "Waiting for the artist to accept your request.",
  accepted: "Your artist accepted. They will mark the job as started on the day.",
  rejected: "This booking was rejected by the artist.",
  job_started: "The performance is underway.",
  completed: "Show complete. Thank you for booking with Kalzo!",
};

const ARTIST_NOTES: Record<string, string> = {
  pending: "A patron has requested this booking. Review the details, then accept or reject.",
  accepted: "You accepted this booking. Mark job started on the day of the event.",
  rejected: "You rejected this booking request.",
  job_started: "The performance is underway.",
  completed: "This booking is complete.",
};

export function formatBookingDate(raw: string) {
  const m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function patronBadge(b: BookingDto) {
  if (b.paymentStatus !== "paid") {
    return { classKey: "payment_pending", label: "payment pending" };
  }
  if (b.status === "completed" && b.review) {
    return { classKey: "completed", label: `rated ${b.review.rating}/5` };
  }
  if (b.status === "completed" && !b.review) {
    return { classKey: "payment_pending", label: "review pending" };
  }
  return { classKey: b.status, label: statusLabel(b.status) };
}

/** Load one booking via GET /bookings/:id — same payload for patron and artist. */
export function useBookingById(bookingId: string) {
  const [b, setB] = useState<BookingDto | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await api.bookings.getById(bookingId);
    if (res.error) {
      setErr(res.error.message);
      setLoading(false);
      return;
    }
    const data = unwrapData(res.data) as { booking?: BookingDto };
    setB(normalizeBookingDetail(data?.booking ?? data) ?? null);
    setErr("");
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void load();
  }, [bookingId]);

  return { b, err, loading, reload: load, setErr };
}

export function BookingDetailView({
  booking: b,
  audience,
  actions,
  foot,
}: {
  booking: BookingDto;
  audience: "patron" | "artist";
  actions?: ReactNode;
  /** Pass `null` to hide the footer. Artist back links live above the card. */
  foot?: ReactNode | null;
}) {
  const notes = audience === "patron" ? PATRON_NOTES : ARTIST_NOTES;
  const badge = audience === "patron" ? patronBadge(b) : { classKey: b.status, label: statusLabel(b.status) };
  const leadKey =
    audience === "patron" && b.paymentStatus !== "paid" ? "payment_pending" : b.status;
  const paid = b.paymentStatus === "paid";
  const footer =
    foot !== undefined
      ? foot
      : audience === "patron"
        ? (
            <Link to="/" className="kb-detail-link">
              Back to home
            </Link>
          )
        : null;
  const title =
    audience === "patron"
      ? b.artist?.stageName || "Artist"
      : b.customer?.fullName || "Patron";
  const customerPhone = b.customer?.mobileNumber || b.customer?.phone || "";
  const customerEmail = b.customer?.email || "";
  const photo = audience === "patron" ? b.artist?.photoUrl || "" : "";
  const occasion = b.note?.replace(/^Occasion:\s*/i, "").trim() || "";
  const amount = `₹${Number(b.amountInr || 0).toLocaleString("en-IN")}`;
  // Patrons have no profile photo — artist review header is text-only.
  const showPhoto = audience === "patron";

  const detail = (
    <article className="kb-detail" aria-labelledby="kb-detail-title">
      <header className={showPhoto ? "kb-detail-head" : "kb-detail-head kb-detail-head-solo"}>
        {showPhoto ? (
          photo ? (
            <img className="kb-detail-photo" src={photo} alt="" width={72} height={72} />
          ) : (
            <div className="kb-detail-photo kb-detail-photo-empty" aria-hidden />
          )
        ) : null}
        <div className="kb-detail-intro">
          <p className="kb-detail-eyebrow">Booking invitation</p>
          <h2 id="kb-detail-title" className="kb-detail-name">
            {title}
          </h2>
          {audience === "artist" && (customerPhone || customerEmail) ? (
            <p className="kb-detail-contact">
              {customerPhone ? <span>Phone number : {customerPhone}</span> : null}
              {customerPhone && customerEmail ? <span className="kb-detail-sep">·</span> : null}
              {customerEmail ? (
                <span>
                  Email : <a href={`mailto:${customerEmail}`}>{customerEmail}</a>
                </span>
              ) : null}
            </p>
          ) : null}
          <span className={`kb-detail-status kb-status-${badge.classKey}`}>{badge.label}</span>
        </div>
      </header>

      <p className="kb-detail-lead">{notes[leadKey] ?? "This booking is in progress."}</p>

      <dl className="kb-detail-facts">
        <div>
          <dt>
            <CalendarDays size={16} aria-hidden />
            Date
          </dt>
          <dd>
            {b.day ? <span className="kb-detail-day">{b.day}</span> : null}
            <span>{formatBookingDate(b.eventDate)}</span>
          </dd>
        </div>
        <div>
          <dt>
            <MapPin size={16} aria-hidden />
            Venue
          </dt>
          <dd>{b.address || "Address to be confirmed"}</dd>
        </div>
        {occasion ? (
          <div>
            <dt>
              <NotebookPen size={16} aria-hidden />
              Occasion
            </dt>
            <dd>{occasion}</dd>
          </div>
        ) : null}
        {b.guests ? (
          <div>
            <dt>
              <Users size={16} aria-hidden />
              Guests
            </dt>
            <dd>{b.guests}</dd>
          </div>
        ) : null}
      </dl>

      <div className="kb-detail-fare">
        <div className="kb-detail-fare-row">
          <span className="kb-detail-fare-label">Booking amount</span>
          <strong className="kb-detail-fare-amount">{amount}</strong>
        </div>
        <p className="kb-detail-fare-note">
          <Info size={15} aria-hidden />
          <span>
            {audience === "patron"
              ? paid
                ? "Held in Kalzo safe-keeping until the show is done. Full refund if the artist declines."
                : "Payment pending — the artist will see this invitation only after you pay."
              : paid
                ? "Payment received and held by Kalzo until the show is done."
                : "No payment collected yet."}
          </span>
        </p>
      </div>

      {b.review ? (
        <div className="kb-detail-review" aria-label="Your review">
          <p className="kb-detail-review-stars">{"★".repeat(b.review.rating)}{"☆".repeat(5 - b.review.rating)}</p>
          {b.review.tags.length ? (
            <div className="kb-detail-review-tags" aria-label="Review tags">
              {b.review.tags.map((t) => (
                <span key={t} className="kpill">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <p className="kb-detail-review-body">“{b.review.body}”</p>
        </div>
      ) : null}

      {actions}

      {footer ? <footer className="kb-detail-foot">{footer}</footer> : null}
    </article>
  );

  if (audience !== "artist") return detail;

  return (
    <div className="ki-invite ki-invite-full">
      <div className="ki-invite-roller ki-invite-roller-top" aria-hidden="true" />
      <div className="ki-invite-frame ki-invite-paper">
        <span className="ki-invite-ornament" aria-hidden="true" />
        <img
          className="ki-invite-flourish"
          src={FLOURISH_TOP}
          alt=""
          width={535}
          height={143}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {detail}
        <img
          className="ki-invite-flourish ki-invite-flourish-bot"
          src={FLOURISH_BOTTOM}
          alt=""
          width={535}
          height={153}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
      <div className="ki-invite-roller ki-invite-roller-bot" aria-hidden="true" />
    </div>
  );
}
