import { api, unwrapData } from "@/lib/api";

export type BookRequest = {
  artist_id: string;
  artist_name: string;
  event_date: string;
  slot?: string;
  quantity: number;
  city: string;
  address: string;
  guests: string;
  note: string;
  expected_total: number;
};

const emit = (type: string, detail?: Record<string, unknown>) =>
  window.dispatchEvent(new CustomEvent(type, { detail }));

/**
 * Direct booking (no payment, no time slots).
 * Uses event_date; artist must have that weekday marked available.
 */
export function startDirectBooking() {
  const onBook = async (e: Event) => {
    const d = (e as CustomEvent<BookRequest>).detail;
    try {
      const { data: sess } = await api.auth.getSession();
      if (!sess?.session?.access_token) {
        emit("kalzo:book-failed", { reason: "Please log in again to book." });
        return;
      }

      const createRes = await api.bookings.create({
        artistId: d.artist_id,
        eventDate: d.event_date,
        address: d.address,
        guests: d.guests || undefined,
        note: d.note || undefined,
        amountInr: d.expected_total || 0,
      });

      if (createRes.error) {
        emit("kalzo:book-failed", { reason: createRes.error.message });
        return;
      }

      const payload = unwrapData(createRes.data) as { booking?: { id?: string } } | null;
      const bookingId = payload?.booking?.id;
      if (!bookingId) {
        emit("kalzo:book-failed", { reason: "Booking was created but no id was returned." });
        return;
      }

      emit("kalzo:booked", { booking_id: bookingId });
      window.location.assign(`/bookings/${bookingId}`);
    } catch (err) {
      emit("kalzo:book-failed", {
        reason: err instanceof Error ? err.message : "The booking failed to start.",
      });
    }
  };

  window.addEventListener("kalzo:book", onBook);
  return () => window.removeEventListener("kalzo:book", onBook);
}
