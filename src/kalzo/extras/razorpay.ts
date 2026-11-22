/**
 * Razorpay payment is deferred.
 * Booking uses `bookingClick.ts` (direct book, no payment) for now.
 * Re-introduce checkout here when the payment flow is decided.
 */

export type PayRequest = {
  artist_id: string;
  artist_name: string;
  event_date: string;
  slot: string;
  quantity: number;
  city: string;
  address: string;
  guests: string;
  note: string;
  expected_total: number;
};

/** @deprecated Use startDirectBooking from bookingClick.ts — payment comes later. */
export function startRazorpay() {
  return () => {};
}
