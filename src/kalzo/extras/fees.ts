// Kalzo service fee, charged to the artist and the same amount to the patron.
export function serviceFee(rate: number): number {
  if (rate <= 2500) return 99;
  if (rate <= 5000) return 199;
  if (rate <= 7500) return 299;
  return 500;
}
export const FEE_TIERS = [
  { label: "₹1 – ₹2,500", fee: 99, max: 2500 },
  { label: "₹2,501 – ₹5,000", fee: 199, max: 5000 },
  { label: "₹5,001 – ₹7,500", fee: 299, max: 7500 },
  { label: "Above ₹7,500", fee: 500, max: Infinity },
];
export const ADVANCE_SHARE = 0.25;
export function bookingMoney(subtotal: number, rate: number) {
  const fee = serviceFee(rate);
  const net = subtotal - fee;
  const advance = Math.round(subtotal * ADVANCE_SHARE);
  return { fee, patronPays: subtotal + fee, net, advance, balance: net - advance, kalzoKeeps: fee * 2 };
}
