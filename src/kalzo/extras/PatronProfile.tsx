import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserRound, Heart, CalendarDays, MessageSquare, Star, Save, Sparkles, Hourglass, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, unwrapData } from "@/lib/api";
import {
  bookingGroup,
  normalizePatronBooking,
  type BookingGroup,
} from "./patron/bookingGroups";
import { ConversationList } from "./conversations/Conversations";
import { FavouriteSalon } from "./patron/FavouriteSalon";

export function PatronProfile({ initialTab }: { initialTab?: string | undefined } = {}) {
  const [d, setD] = useState<{ profile?: any; favorites?: any[]; reviews?: any[] } | null>(null),
    [b, setB] = useState<{ bookings?: any[]; isAdmin?: boolean } | null>(null),
    [tab, setTab] = useState(initialTab ?? "Bookings"),
    [group, setGroup] = useState<BookingGroup>("current"),
    [message, setMessage] = useState(""),
    [userEmail, setUserEmail] = useState(""),
    [isEditing, setIsEditing] = useState(false),
    [saving, setSaving] = useState(false),
    [form, setForm] = useState({
      full_name: "",
      phone: "",
      city: "",
      patron_type: "Individual / family",
      industry: "",
      reason: "",
    });

  const load = async () => {
    try {
      const { data } = await api.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
      if (data?.profile) {
        const p = data.profile;
        const profileData = {
          full_name: p.fullName || p.full_name || "",
          phone: p.mobileNumber || p.phone || "",
          city: p.location || p.city || "",
          patron_type: p.customerType || p.patron_type || "Individual / family",
          industry: p.businessName || p.industry || "",
          reason: p.reasonForBooking || p.reason || "",
        };
        setForm(profileData);
        setD({ profile: profileData, favorites: [], reviews: [] });
      }
      if (data?.user?.role === "ADMIN") {
        setB((prev) => ({ ...(prev ?? {}), isAdmin: true }));
      }
    } catch { }

    // Load bookings from GET /api/v1/bookings (paginated; high limit keeps ledger groups intact)
    try {
      const res = await api.bookings.list({ page: 1, limit: 100 });
      if (!res.error && res.data) {
        const data = unwrapData(res.data) as any;
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.bookings)
            ? data.bookings
            : [];
        setB((prev) => ({
          ...(prev ?? {}),
          bookings: rows.map(normalizePatronBooking).filter((x: { id: string }) => x.id),
        }));
      }
    } catch { }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await api.auth.updateProfile({
        fullName: form.full_name,
        mobileNumber: form.phone,
        location: form.city,
        customerType: form.patron_type,
        businessName: form.industry,
        reasonForBooking: form.reason,
      });
      if (res.error) {
        setMessage(res.error.message || "Your account details are saved locally.");
      } else {
        setMessage("Your profile details have been saved.");
        setIsEditing(false);
        setD((prev) => ({ ...(prev ?? {}), profile: form }));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error saving profile.");
    } finally {
      setSaving(false);
    }
  };
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
      {message && (
        <div className="kv-status-banner" role="status">
          <Sparkles size={16} color="#8A6D3B" />
          <span>{message}</span>
        </div>
      )}
      {b?.isAdmin && <Link to="/admin">Open admin dashboard →</Link>}
      {tab === "My profile" && (
        <div className="kv-profile-wrap">
          <div className="kv-card">
            {!isEditing ? (
              <>
                {/* Profile Details Grid */}
                <div className="kv-ledger">
                  <div className="kv-ledger-row">
                    <span className="kv-label">FULL NAME</span>
                    <span className="kv-value">{form.full_name.trim() || "—"}</span>
                  </div>
                  <div className="kv-ledger-row">
                    <span className="kv-label">REGISTERED EMAIL</span>
                    <span className="kv-value">{userEmail.trim() || "—"}</span>
                  </div>
                  <div className="kv-ledger-row">
                    <span className="kv-label">CONTACT NUMBER</span>
                    <span className="kv-value">{form.phone.trim() || "—"}</span>
                  </div>
                  <div className="kv-ledger-row">
                    <span className="kv-label">CITY / RESIDENCE</span>
                    <span className="kv-value">{form.city.trim() || "—"}</span>
                  </div>
                  <div className="kv-ledger-row">
                    <span className="kv-label">ACCOUNT CATEGORY</span>
                    <span className="kv-value">{form.patron_type.trim() || "—"}</span>
                  </div>
                  <div className="kv-ledger-row">
                    <span className="kv-label">BUSINESS / ESTABLISHMENT</span>
                    <span className="kv-value">{form.industry.trim() || "—"}</span>
                  </div>
                  <div className="kv-ledger-row kv-full">
                    <span className="kv-label">PURPOSE OF INVITATION</span>
                    <span className="kv-value">{form.reason.trim() || "—"}</span>
                  </div>
                </div>

                <div className="kv-divider" />

                {/* Bottom: Update Profile Action */}
                <div className="kv-footer-action">
                  <button
                    type="button"
                    className="kv-btn-vintage"
                    onClick={() => setIsEditing(true)}
                  >
                    UPDATE PROFILE
                  </button>
                </div>
              </>
            ) : (
              <form className="kv-edit-section" onSubmit={handleSave}>
                <div className="kv-edit-grid">
                  <label className="kv-field">
                    <span className="kv-field-label">FULL NAME</span>
                    <input
                      className="kv-input"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="e.g. Aarti Sharma"
                      required
                    />
                  </label>

                  <label className="kv-field">
                    <span className="kv-field-label">MOBILE NUMBER</span>
                    <input
                      className="kv-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </label>

                  <label className="kv-field">
                    <span className="kv-field-label">CITY</span>
                    <input
                      className="kv-input"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Jaipur, Mumbai"
                      required
                    />
                  </label>

                  <label className="kv-field">
                    <span className="kv-field-label">ACCOUNT TYPE</span>
                    <select
                      className="kv-input kv-select"
                      value={form.patron_type}
                      onChange={(e) => setForm({ ...form, patron_type: e.target.value })}
                    >
                      <option value="Individual / family">Individual / family</option>
                      <option value="Hotel or resort">Hotel or resort</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Café or restaurant">Café or restaurant</option>
                      <option value="Event company">Event company</option>
                      <option value="Other business">Other business</option>
                    </select>
                  </label>

                  <label className="kv-field">
                    <span className="kv-field-label">BUSINESS / INDUSTRY</span>
                    <input
                      className="kv-input"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      placeholder="Optional (for corporate/business)"
                    />
                  </label>

                  <label className="kv-field">
                    <span className="kv-field-label">REASON FOR BOOKING</span>
                    <input
                      className="kv-input"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="e.g. Wedding, Birthday, House gathering"
                    />
                  </label>
                </div>

                <div className="kv-divider" />

                <div className="kv-edit-actions">
                  <button type="submit" className="kv-btn-vintage" disabled={saving}>
                    {saving ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                  <button
                    type="button"
                    className="kv-btn-ghost"
                    onClick={() => {
                      setIsEditing(false);
                      if (d?.profile) setForm(d.profile);
                    }}
                    disabled={saving}
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
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
              <ul className="kb-row-list">
                {list.map((x) => (
                  <li key={x.id} className="kb-row-card">
                    <div className="kb-row-main">
                      <div className="kb-row-top">
                        <strong>{x.artist_name}</strong>
                        <span
                          className={`kb-detail-status kb-status-${(x as { display_status?: string }).display_status ?? x.workflow_stage}`}
                        >
                          {(x as { display_status_label?: string }).display_status_label ??
                            String(x.workflow_stage).replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="kb-row-meta">
                        {[x.slot, x.event_date, x.address].filter(Boolean).join(" · ")}
                      </p>
                      <p className="kb-row-amount">
                        ₹{Number(x.amount_inr || 0).toLocaleString("en-IN")}
                      </p>
                      {(x.workflow_stage === "arrived" || x.workflow_stage === "finished") && (
                        <Link
                          to="/bookings/$bookingId"
                          params={{ bookingId: x.id }}
                          className="kl-code-alert"
                        >
                          {x.workflow_stage === "arrived"
                            ? "Your artist has arrived · tap to see your arrival code"
                            : "Show finished · tap to see your closing code"}
                        </Link>
                      )}
                    </div>
                    <div className="kb-row-action">
                      <Link
                        to="/bookings/$bookingId"
                        params={{ bookingId: x.id }}
                        className="kb-row-review"
                      >
                        Review
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
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
        <Link to="/for-artists">Become a Kalzo artist →</Link>
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
