import { useState } from "react";

type Req = { id: number; who: string; what: string; when: string; status: "new" | "accepted" | "declined" };
const START: Req[] = [
  { id: 1, who: "Aarav Mehta", what: "Sangeet night · 3 hrs", when: "Sat, 14 Nov · 7 PM · Jaipur", status: "new" },
  { id: 2, who: "Hotel Rambagh Events", what: "Lobby evening set · 2 hrs", when: "Sun, 15 Nov · 6 PM · Jaipur", status: "new" },
  { id: 3, who: "Priya Nair", what: "Birthday dinner · 1.5 hrs", when: "Fri, 20 Nov · 8 PM · Udaipur", status: "new" },
];

export function ArtistRequests() {
  const [reqs, setReqs] = useState(START);
  const [declines, setDeclines] = useState(1); // one earlier this month
  const [asking, setAsking] = useState<Req | null>(null);
  const [warn, setWarn] = useState(false);
  const score = Math.max(40, 100 - declines * 12);

  const decline = (r: Req) => {
    if (declines >= 1) { setAsking(r); setWarn(true); } else doDecline(r);
  };
  const doDecline = (r: Req) => {
    setReqs((x) => x.map((q) => (q.id === r.id ? { ...q, status: "declined" } : q)));
    setDeclines((d) => d + 1); setWarn(false); setAsking(null);
  };

  return (
    <section className="kx-panel ka-sec ka-indigo">
      {warn && asking && (
        <div className="kx-modal" role="dialog" aria-modal="true" aria-labelledby="ar-warn">
          <div className="kx-modal-card ar-warn">
            <p className="kx-eyebrow">HEADS UP</p>
            <h3 id="ar-warn" className="kx-h3">This will hurt your visibility</h3>
            <p>You've declined or not answered <b>{declines}</b> request{declines > 1 ? "s" : ""} recently. Declining again lowers where your profile shows in search, and patrons will see fewer of your listings.</p>
            <p className="kx-small">If you don't accept, the patron is refunded in full and offered other artists.</p>
            <div className="ar-row">
              <button className="kx-btn" onClick={() => { setReqs((x) => x.map((q) => (q.id === asking.id ? { ...q, status: "accepted" } : q))); setWarn(false); setAsking(null); }}>Accept instead</button>
              <button className="kx-btn kx-btn-ghost" onClick={() => doDecline(asking)}>Decline anyway</button>
            </div>
          </div>
        </div>
      )}
      <h2 className="kx-h3">Booking requests</h2>
      <p className="kx-small">Patrons have already paid Kalzo in full. Accept quickly — unanswered requests get a reminder about 10 hours before the event, then are refunded.</p>
      <div className="ar-meter" aria-label={`Profile visibility ${score}%`}>
        <span>Profile visibility</span>
        <div className="ar-bar"><div style={{ width: score + "%" }} className={score < 80 ? "is-low" : ""} /></div>
        <b>{score}%</b>
      </div>
      <ul className="ar-list">
        {reqs.map((r) => (
          <li key={r.id} className={"ar-item is-" + r.status}>
            <div><b>{r.who}</b><span>{r.what}</span><span className="kx-small">{r.when}</span></div>
            {r.status === "new" ? (
              <div className="ar-row">
                <button className="kx-btn" onClick={() => setReqs((x) => x.map((q) => (q.id === r.id ? { ...q, status: "accepted" } : q)))}>Accept</button>
                <button className="kx-btn kx-btn-ghost" onClick={() => decline(r)}>Decline</button>
              </div>
            ) : <span className="ar-status">{r.status === "accepted" ? "Accepted ✓" : "Declined · patron refunded"}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
