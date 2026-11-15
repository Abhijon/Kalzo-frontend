import { api } from "@/lib/api";

export type BookingDetail = {
  artist_ref: string;
  artist_name: string;
  event_date: string;
  slot: string;
  address: string;
  guests: string;
  note: string;
  amount_inr: number;
};

/** Saves a booking request for the signed-in patron and returns its id. Status stays "awaiting_payment" until the payment is verified. */
export async function saveBooking(d: BookingDetail): Promise<string | null> {
  const { data } = await api.auth.getUser();
  if (!data?.user) return null;

  const res = await api.bookings.create({ ...d, patron_id: data.user.id });
  if (res.error) {
    console.error("Booking save failed", res.error.message);
    return null;
  }
  return res.data?.id ?? (res.data as any)?._id ?? null;
}
