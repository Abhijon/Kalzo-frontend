export type Dated = { created_at: string };
/** Count rows per day for the last `days` days, oldest first (UTC dates). */
export function dailyCounts(rows: Dated[], days: number, now = new Date()) {
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push({ day: d.toISOString().slice(0, 10), count: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.day, i]));
  for (const r of rows) {
    const i = idx.get(r.created_at.slice(0, 10));
    const bucket = i === undefined ? undefined : out[i];
    if (bucket) bucket.count++;
  }
  return out;
}
export function inLastDays(rows: Dated[], days: number, now = new Date()) {
  const from = now.getTime() - days * 86400000;
  return rows.filter((r) => new Date(r.created_at).getTime() >= from).length;
}
/** Artists with a face video still waiting on an admin identity decision. */
export function awaitingVerification<
  T extends { verification_status: string; face_video_path: string },
>(a: T[]) {
  return a.filter((x) => x.verification_status === "unverified" && !!x.face_video_path);
}
export function paidRevenue(b: { status: string; amount_inr: number }[]) {
  return b.filter((x) => x.status === "paid").reduce((s, x) => s + x.amount_inr, 0);
}
export function needsRefundReview(b: { refund_status: string }) {
  return ["review_required", "approved_pending_processing"].includes(b.refund_status);
}
