import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PatronGate } from "./PatronGate";

/** Saves the artist's profile to their account; Kalzo reviews it before it goes live. */
export function ArtistSave({ rate, base }: { rate: number; base: string }) {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [f, setF] = useState({ stage_name: "", discipline: "", bio: "" });
  const [msg, setMsg] = useState(""), [ask, setAsk] = useState(false), [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async (id: string | null) => {
      setUid(id);
      if (!id) return;
      const { data } = await api.from("artist_profiles").select("stage_name, discipline, bio").eq("owner_id", id).maybeSingle();
      if (data) setF(data);
    };
    api.auth.getUser().then(({ data }) => load(data?.user?.id ?? null));
    const { data: sub } = api.auth.onAuthStateChange((_e, s) => { load(s?.user?.id ?? null); if (s) setAsk(false); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const save = async () => {
    if (!uid) return setAsk(true);
    if (!f.stage_name.trim() || !f.discipline.trim()) return setMsg("Add your stage name and art form.");
    setBusy(true);
    const row = { owner_id: uid, stage_name: f.stage_name.trim(), discipline: f.discipline.trim(), bio: f.bio.trim(), base_city: base, rate_inr: rate, status: "pending_review", updated_at: new Date().toISOString() };
    const { error } = await api.from("artist_profiles").upsert(row, { onConflict: "owner_id" });
    setBusy(false);
    setMsg(error ? "Couldn't save: " + error.message : "Saved. Kalzo will review your profile before it goes live.");
  };

  return (
    <section className="kx-card">
      {ask && <PatronGate onBack={() => setAsk(false)} />}
      <p className="kx-eyebrow">SAVE YOUR ARTIST PROFILE</p>
      <div className="kp-grid">
        <label>Stage name<input className="kx-input" value={f.stage_name} onChange={(e) => setF({ ...f, stage_name: e.target.value })} /></label>
        <label>Art form<input className="kx-input" value={f.discipline} onChange={(e) => setF({ ...f, discipline: e.target.value })} placeholder="e.g. Retro vinyl DJ" /></label>
        <label className="kp-wide">About you<textarea className="kx-input" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
      </div>
      <button className="kx-btn" disabled={busy} onClick={save}>{uid ? "SAVE MY PROFILE" : "LOG IN TO SAVE"}</button>
      {msg && <p className="kx-small" role="status">{msg}</p>}
    </section>
  );
}
