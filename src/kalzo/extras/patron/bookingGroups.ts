export type BookingGroup = "current" | "upcoming" | "past";

const ON_STAGE = new Set([
  "arrived",
  "performing",
  "finished",
  "venue_verified",
  "in_progress",
  "job_started",
]);
const DONE = new Set(["completed", "cancelled", "rejected", "declined", "expired"]);

/** Normalize API booking rows (camelCase or snake_case) for the patron ledger. */
export function normalizePatronBooking(raw: any) {
  const artist = raw?.artist ?? {};
  const paymentStatus = String(
    raw?.paymentStatus ?? raw?.payment_status ?? "unpaid",
  ).toLowerCase();
  const workflow_stage = String(raw?.status ?? raw?.workflow_stage ?? "pending");
  const review = raw?.review ?? null;
  const reviewRating = review ? Number(review.rating ?? 0) : 0;
  let display_status = paymentStatus === "paid" ? workflow_stage : "payment_pending";
  let display_status_label =
    paymentStatus === "paid"
      ? workflow_stage.replaceAll("_", " ")
      : "payment pending";
  if (paymentStatus === "paid" && workflow_stage === "completed") {
    if (review) {
      display_status = "completed";
      display_status_label = `rated ${reviewRating}/5`;
    } else {
      display_status = "payment_pending";
      display_status_label = "review pending";
    }
  }
  return {
    id: String(raw?.id ?? ""),
    artist_name:
      artist.stageName ||
      artist.stage_name ||
      raw?.artist_name ||
      raw?.artistName ||
      "Artist",
    artist_photo: artist.photoUrl || artist.photo_url || raw?.artist_photo || "",
    event_date: String(raw?.eventDate ?? raw?.event_date ?? "").slice(0, 10),
    slot: String(raw?.slot ?? raw?.day ?? ""),
    address: String(raw?.address ?? ""),
    amount_inr: Number(raw?.amountInr ?? raw?.amount_inr ?? 0),
    workflow_stage,
    payment_status: paymentStatus,
    review_rating: review ? reviewRating : null,
    has_review: Boolean(review),
    display_status,
    display_status_label,
    note: raw?.note ?? null,
    guests: raw?.guests ?? null,
  };
}

/**
 * Current = pending invitations + same-day / live work.
 * Past = finished or cancelled / old dates.
 * Else upcoming.
 */
export function bookingGroup(
  b: { event_date?: string; eventDate?: string; workflow_stage?: string; status?: string },
  today: string,
): BookingGroup {
  const stage = String(b.workflow_stage ?? b.status ?? "");
  const date = String(b.event_date ?? b.eventDate ?? "").slice(0, 10);
  if (DONE.has(stage)) return "past";
  // Pending invitations show under Current so patrons see them immediately.
  if (stage === "pending") return "current";
  if (ON_STAGE.has(stage) || (date && date === today)) return "current";
  if (date && date < today) return "past";
  return "upcoming";
}
