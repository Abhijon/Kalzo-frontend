import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { UserRound, Heart, CalendarDays, MessageSquare, Star, Save, Sparkles, Hourglass, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountData } from "@/lib/kalzo.functions";
import { patronData, savePatron, saveReview } from "@/lib/patron.functions";
import { bookingGroup, type BookingGroup } from "./patron/bookingGroups";
import { ConversationList } from "./conversations/Conversations";
import { FavouriteSalon } from "./patron/FavouriteSalon";
export function PatronProfile({ initialTab }: { initialTab?: string | undefined } = {}) {
  const read = useServerFn(patronData),
    bookings = useServerFn(accountData),
    save = useServerFn(savePatron),
    review = useServerFn(saveReview);
  const [d, setD] = useState<Awaited<ReturnType<typeof patronData>> | null>(null),
    [b, setB] = useState<Awaited<ReturnType<typeof accountData>> | null>(null),
    [tab, setTab] = useState(initialTab ?? "Bookings"),
    [group, setGroup] = useState<BookingGroup>("current"),
    [message, setMessage] = useState(""),
    [form, setForm] = useState({
      full_name: "",
      phone: "",
      city: "",
      patron_type: "Individual / family",
      industry: "",
      reason: "",
    });
  const load = () =>
    Promise.all([
      read().then((x) => {
        setD(x);
        if (x.profile) setForm(x.profile);
      }),
      bookings().then(setB),
    ]);
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, [read, bookings]);
  return (
    <>
      <nav className="ka-tabs">
        {[
          { label: "Bookings", icon: CalendarDays },
          { label: "My profile", icon: UserRound },
          { label: "Favourite artists", icon: Heart },
          { label: "Booked artists", icon: Star },
          { label: "Chats & calls", icon: MessageSquare },
        ].map((t) => (
          <Button
            key={t.label}
            variant={tab === t.label ? "default" : "outline"}
            onClick={() => setTab(t.label)}
          >
            <t.icon size={16} />
            {t.label}
          </Button>
        ))}
      </nav>
      {message && <p role="status">{message}</p>}
      {b?.isAdmin && <Link to="/admin">Open admin dashboard →</Link>}
      {tab === "My profile" && (
        <form
          className="kl-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ data: form })
              .then(() => setMessage("Your account details are saved."))
              .catch((e) => setMessage(e.message));
          }}
        >
          {(["full_name", "phone", "city", "patron_type", "industry", "reason"] as const).map(
            (k) => (
              <label key={k}>
                {
                  {
                    full_name: "Full name",
                    phone: "Mobile number",
                    city: "City",
                    patron_type: "Account type",
                    industry: "Business / industry",
                    reason: "Reason for booking",
                  }[k]
                }
                <input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </label>
            ),
          )}
          <Button type="submit">
            <Save size={16} />
            Save profile
          </Button>
        </form>
      )}
      {tab === "Favourite artists" && <FavouriteSalon favorites={d?.favorites ?? []} />}
      {tab === "Chats & calls" && (
        <ConversationList />
      )}
      {(tab === "Bookings" || tab === "Booked artists") && (() => {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const all = b?.bookings ?? [];
        const counts = { current: 0, upcoming: 0, past: 0 };
        all.forEach((x) => counts[bookingGroup(x, today)]++);
        const list =
          tab === "Booked artists"
            ? all.filter((x) => x.workflow_stage === "completed")
            : all.filter((x) => bookingGroup(x, today) === group);
        const sections = [
          { key: "current" as const, label: "Current bookings", icon: Sparkles, empty: "No mehfil is happening right now." },
          { key: "upcoming" as const, label: "Upcoming bookings", icon: Hourglass, empty: "Your next mehfil is yet to be booked." },
          { key: "past" as const, label: "Past bookings", icon: ScrollText, empty: "Your finished mehfils will be kept here as memories." },
        ];
        const active = sections.find((x) => x.key === group) ?? { label: "Current bookings", icon: CalendarDays, empty: "No mehfil is happening right now." };
        return (
          <section className="kb-hall">
            {tab === "Bookings" && (
              <>
                <header className="kb-marquee" aria-hidden="false">
                  <div className="kb-curtain kb-left" />
                  <div className="kb-curtain kb-right" />
                  <div className="kb-lamps">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}</div>
                  <p className="kb-kicker">❦ The Kalzo booking ledger ❦</p>
                  <h2>Your mehfils</h2>
                  <p className="kb-sub">Every booking, from the first invitation to the final bow.</p>
                  <div className="kb-tickets" aria-hidden>
                    <span>ADMIT ONE</span><span>MEHFIL</span><span>ADMIT ONE</span>
                  </div>
                </header>
                <nav className="kb-sections" aria-label="Booking sections">
                  {sections.map((x) => (
                    <button key={x.key} type="button" className={group === x.key ? "on" : ""} aria-pressed={group === x.key} onClick={() => setGroup(x.key)}>
                      <x.icon size={18} />
                      <span>{x.label}</span>
                      <b>{counts[x.key]}</b>
                    </button>
                  ))}
                </nav>
              </>
            )}
            <div className="kb-list" key={tab + group}>
              {list.map((x, i) => (
                <div className="kb-ticket" style={{ animationDelay: `${i * 0.08}s` }} key={x.id}>
            <article className="ka-booking">
              <h2>{x.artist_name}</h2>
              <p>
                {x.event_date} · {x.slot} · {x.address}
              </p>
              <p>
                {x.workflow_stage.replaceAll("_", " ")} · ₹{x.amount_inr.toLocaleString("en-IN")}
              </p>
              {(x.workflow_stage === "arrived" || x.workflow_stage === "finished") && (
                <Link to="/bookings/$bookingId" params={{ bookingId: x.id }} className="kl-code-alert">
                  {x.workflow_stage === "arrived"
                    ? "Your artist has arrived · tap to see your arrival code"
                    : "Show finished · tap to see your closing code"}
                </Link>
              )}
              <Link to="/bookings/$bookingId" params={{ bookingId: x.id }}>
                Open booking & codes →
              </Link>
              {x.workflow_stage === "completed" &&
                !d?.reviews.some((r) => r.booking_id === x.id) && (
                  <ReviewForm
                    onSave={(rating, body) =>
                      review({ data: { booking: x.id, rating, body } })
                        .then(() => load())
                        .then(() => setMessage("Your review is saved."))
                    }
                  />
                )}
            </article>
                </div>
              ))}
              {!list.length && (
                <div className="kb-empty">
                  <div className="kb-seal">{tab === "Bookings" ? <active.icon size={30} /> : <Star size={30} />}</div>
                  <h3>{tab === "Bookings" ? active.label : "Booked artists"}</h3>
                  <p>{tab === "Bookings" ? active.empty : "Artists from your completed mehfils appear here."}</p>
                  <Link to="/" className="kb-cta">Find an artist →</Link>
                </div>
              )}
            </div>
          </section>
        );
      })()}
      <div className="kl-actions">
        <Link to="/support">Support & help →</Link>
        <Link to="/artist">Become a Kalzo artist →</Link>
      </div>
    </>
  );
}
function ReviewForm({ onSave }: { onSave: (rating: number, body: string) => Promise<unknown> }) {
  const [r, setR] = useState(5),
    [body, setBody] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(r, body).catch((e) => setError(e.message));
      }}
    >
      <h3>Your rating and written review are required to finish your booking ledger.</h3>
      <label>
        Your rating
        <select
          aria-label="Performance rating"
          value={r}
          onChange={(e) => setR(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}/5
            </option>
          ))}
        </select>
      </label>
      <label>
        Your review
        <textarea required value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
      </label>
      <Button type="submit" disabled={!body.trim()}>Share review</Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
