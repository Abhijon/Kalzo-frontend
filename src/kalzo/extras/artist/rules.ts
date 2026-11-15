export const ADVANCE_SHARE = 0.25;
export const REJECT_WARNING =
  "If you reject, keep in mind: continuous rejections may lower your profile's visibility to patrons.";
export const ACCEPT_MESSAGE = (amount: number) =>
  `Congratulations! Your 25% advance of ₹${advanceFor(amount).toLocaleString("en-IN")} will reach your wallet within the next 48 hours.`;
export const COMPLETE_MESSAGE =
  "Congratulations, you had an amazing performance today! Your payment will be released in the next 48 to 72 hours.";
export function advanceFor(amount: number) {
  return Math.round(amount * ADVANCE_SHARE);
}
export function balanceFor(amount: number) {
  return amount - advanceFor(amount);
}
export type WalletEntry = { amount_inr: number; status: string; kind: string };
export function walletTotals(entries: WalletEntry[]) {
  const sum = (f: (e: WalletEntry) => boolean) =>
    entries.filter(f).reduce((t, e) => t + e.amount_inr, 0);
  return {
    total: sum(() => true),
    pending: sum((e) => e.status === "pending"),
    released: sum((e) => e.status === "released"),
    available: sum((e) => e.status === "available"),
    held: sum((e) => e.status === "on_hold"),
  };
}
export const ART_FORMS: Record<string, string[]> = {
  Musicians: ["Classical vocalist", "Ghazal singer", "Sufi singer", "Guitarist", "Tabla player", "Flautist", "Sitar player", "Keyboard player", "Band"],
  "Folk singers": ["Rajasthani folk", "Punjabi folk", "Baul", "Lavani", "Bhajan / devotional"],
  Dancers: ["Kathak", "Bharatanatyam", "Odissi", "Bollywood", "Contemporary", "Folk dance"],
  DJs: ["Wedding DJ", "Club DJ", "Bollywood DJ"],
  "Band baja": ["Brass band", "Dhol", "Shehnai"],
  Poets: ["Shayari", "Spoken word", "Kavi sammelan"],
  Comedians: ["Stand-up", "Mimicry", "Improv"],
  Magicians: ["Stage magic", "Close-up magic", "Kids' magic"],
  "Special acts": ["Fire act", "Puppetry", "Acrobatics"],
  "Mehendi artists": ["Bridal mehendi", "Arabic mehendi"],
  Anchors: ["Wedding anchor", "Corporate host"],
  Artists: ["Live painter", "Caricaturist", "Sketch artist"],
};
export const OTHER = "Other – write your own";
