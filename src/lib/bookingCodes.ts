/** Rejection sampling prevents modulo bias; generate only inside a verified paid-booking handler. */
export function newBookingCode() {
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while ((bytes[0] ?? 0) >= 4294960000);
  return String((bytes[0] ?? 0) % 10000).padStart(4, "0");
}
export function newBookingCodes() {
  const arrival = newBookingCode();
  let closing = newBookingCode();
  while (closing === arrival) closing = newBookingCode();
  return { arrival, closing };
}
