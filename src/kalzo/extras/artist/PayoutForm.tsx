import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { artistPanelData, savePayout } from "@/lib/artistPanel.functions";
export function PayoutForm({ onSaved }: { onSaved?: (saved: boolean) => void }) {
  const read = useServerFn(artistPanelData),
    save = useServerFn(savePayout);
  const [saved, setSaved] = useState<{ holder_name: string; account_last4: string; ifsc: string; bank_name: string } | null>(null);
  const [f, setF] = useState({ holder: "", number: "", ifsc: "", bank: "" }),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () => read().then((d) => { setSaved(d.payout); onSaved?.(!!d.payout); }).catch(() => {});
  useEffect(() => void load(), [read]);
  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      await save({ data: f });
      setF({ holder: "", number: "", ifsc: "", bank: "" });
      setMsg("Bank details saved.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message.replace(/^\[.*?\]\s*/, "") : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {saved && (
        <p>
          Saved: <strong>{saved.holder_name}</strong> · {saved.bank_name || "Bank"} · account ending {saved.account_last4} · {saved.ifsc}
        </p>
      )}
      <div className="kl-form">
        <label>Account holder name *<input required value={f.holder} maxLength={100} onChange={(e) => setF({ ...f, holder: e.target.value })} /></label>
        <label>Bank name *<input required value={f.bank} maxLength={100} onChange={(e) => setF({ ...f, bank: e.target.value })} /></label>
        <label>Account number *<input required inputMode="numeric" autoComplete="off" value={f.number} maxLength={18} onChange={(e) => setF({ ...f, number: e.target.value.replace(/\D/g, "") })} /></label>
        <label>IFSC code *<input required value={f.ifsc} maxLength={11} onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase() })} /></label>
      </div>
      <div className="kl-actions">
        <Button variant="outline" disabled={busy || !f.holder || !f.number || !f.ifsc || !f.bank} onClick={() => void submit()}>
          {saved ? "Update bank details" : "Save bank details"}
        </Button>
      </div>
      {msg && <p role="status">{msg}</p>}
    </>
  );
}
