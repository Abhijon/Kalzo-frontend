import { api, unwrapData } from "@/lib/api";

export type BookingDetail = {
  artist_ref: string;
  artist_name: string;
  event_date: string;
  slot?: string;
  address: string;
  guests: string;
  note: string;
  amount_inr: number;
};

/** Creates a booking request (no payment, no time slots). */
export async function saveBooking(d: BookingDetail): Promise<string | null> {
  const { data } = await api.auth.getUser();
  if (!data?.user) return null;

  const res = await api.bookings.create({
    artistId: d.artist_ref,
    eventDate: d.event_date,
    address: d.address,
    guests: d.guests || undefined,
    note: d.note || undefined,
    amountInr: d.amount_inr,
  });

  if (res.error) {
    console.error("Booking save failed", res.error.message);
    return null;
  }

  const payload = unwrapData(res.data) as { booking?: { id?: string }; id?: string } | null;
  return payload?.booking?.id ?? payload?.id ?? null;
}
