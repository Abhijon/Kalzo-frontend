import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { artistPanelData } from "@/lib/artistPanel.functions";
import { walletTotals } from "@/kalzo/extras/artist/rules";
import { PayoutForm } from "@/kalzo/extras/artist/PayoutForm";
import { kalzoHead } from "@/lib/routeHead";
export const Route = createFileRoute("/artist/wallet")({
  staticData: { sitemap: false },
  head: () => kalzoHead("My earnings", "Kalzo artist wallet and bank payouts.", true),
  component: Wallet,
});
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
function Wallet() {
  const read = useServerFn(artistPanelData);
  const [d, setD] = useState<Awaited<ReturnType<typeof artistPanelData>> | null>(null),
    [err, setErr] = useState("");
  useEffect(() => void read().then(setD).catch((e) => setErr(e.message)), [read]);
  if (err) return <p className="kl-error">{err}</p>;
  if (!d) return <p>Loading…</p>;
  const t = walletTotals(d.wallet);
  const names = Object.fromEntries(d.bookings.map((b) => [b.id, `${b.event_date} · ${b.slot}`]));
  return (
    <>
      <div className="ka-wallet">
        <div><small>Available balance</small><strong>{inr(t.available)}</strong></div>
        <div><small>Total earned</small><strong>{inr(t.total)}</strong></div>
        <div><small>Money on the way</small><strong>{inr(t.pending)}</strong></div>
        <div><small>Settled to bank</small><strong>{inr(t.released)}</strong></div>
      </div>
      {t.held > 0 && <p>On hold for cancellation review: {inr(t.held)}</p>}
      <p className="kl-note">Balances reflect confirmed wallet entries. Bank settlement is not active yet.</p>
      <h2>Wallet history</h2>
      {d.wallet.length === 0 ? (
        <p className="kl-note">No earnings yet. Your 25% advance appears here when you accept a paid booking.</p>
      ) : (
        <ul className="ka-notes">
          {d.wallet.map((w) => (
            <li key={w.id}>
              <small>{names[w.booking_id] ?? "Booking"}</small>
              <strong>{w.kind === "advance" ? "25% advance" : "Remaining payment"} · {inr(w.amount_inr)}</strong>
              <p>
                {w.status === "released"
                  ? "Released to your bank account."
                  : w.status === "available" ? "Available in your Kalzo wallet — not settled to bank." : w.status === "on_hold" ? "On hold for cancellation review." : `On the way — scheduled for ${new Date(w.release_after).toLocaleString("en-IN")}; not yet settled.`}
              </p>
            </li>
          ))}
        </ul>
      )}
      <h2>Bank account</h2>
      <PayoutForm />
    </>
  );
}
