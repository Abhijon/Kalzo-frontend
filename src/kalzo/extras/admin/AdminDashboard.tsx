import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Users,
  Palette,
  ScanFace,
  CalendarDays,
  MessageSquare,
  Headset,
  Eye,
  Search,
  RefreshCw,
  ArrowUpRight,
  PanelLeftClose,
  ShieldCheck,
  CircleCheck,
  Clock,
  Inbox,
  IndianRupee,
  Activity,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  adminData,
  adminSupportHistory,
  approveBookingCancellation,
} from "@/lib/kalzo.functions";
import { api, artistFrom, artistListFrom } from "@/lib/api";
import { PatronGate } from "../PatronGate";
import { canPublishArtist } from "../launchRules";
import { awaitingVerification, dailyCounts, inLastDays, paidRevenue, needsRefundReview } from "./metrics";
import "../account.css";
import "./admin.css";
import "../vintage-dropdowns.css";
import { VintageFilterSelect } from "../VintageFilterSelect";
import logoImg from "@/assets/kalzo-logo.png";
import ledger from "@/assets/admin-ledger.png";
import paper from "@/assets/vintage-panel-paper.png.asset.json";
type Data = Awaited<ReturnType<typeof adminData>>;
type Artist = Data["artists"][number];
type Tab =
  | "Overview"
  | "Artists"
  | "Verification"
  | "Patrons"
  | "Bookings"
  | "Inquiries"
  | "Support"
  | "Visits";
const nav = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Artists", icon: Palette },
  { name: "Verification", icon: ScanFace },
  { name: "Patrons", icon: Users },
  { name: "Bookings", icon: CalendarDays },
  { name: "Inquiries", icon: MessageSquare },
  { name: "Support", icon: Headset },
  { name: "Visits", icon: Eye },
] as const;
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const human = (s: string) => s.replaceAll("_", " ");
function Status({ value }: { value: string }) {
  return (
    <span
      className={`kd-status ${["approved", "verified", "paid", "completed"].includes(value) ? "good" : ["failed", "rejected", "declined"].includes(value) ? "bad" : "wait"}`}
    >
      {human(value)}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="kd-empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function textMessage(v: unknown): { role: string; text: string } {
  if (!v || typeof v !== "object") return { role: "Message", text: "" };
  const m = v as { role?: string; parts?: { type?: string; text?: string }[]; content?: string };
  return {
    role: m.role === "user" ? "Customer" : m.role === "assistant" ? "Kalzo support" : "Message",
    text: Array.isArray(m.parts)
      ? m.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join("\n")
      : (m.content ?? ""),
  };
}
export function AdminDashboard() {
  const read = useServerFn(adminData),
    approveCancellation = useServerFn(approveBookingCancellation),
    history = useServerFn(adminSupportHistory);
  const [signed, setSigned] = useState<boolean | null>(null),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview"),
    [collapsed, setCollapsed] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [days, setDays] = useState(7);
  const [artistId, setArtistId] = useState<string | null>(null),
    [thread, setThread] = useState<Data["threads"][number] | null>(null),
    [messages, setMessages] = useState<Awaited<ReturnType<typeof adminSupportHistory>> | null>(
      null,
    ),
    [threadError, setThreadError] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const booking = data?.bookings.find(b => b.id === bookingId);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const base = await read();
      const artistsRes = await api.admin.listArtists({ page: 1, limit: 100 });
      if (artistsRes.error) {
        // Keep dashboard shell data; surface artist-list failure separately.
        setError(artistsRes.error.message);
        setData(base);
      } else {
        setData({ ...base, artists: artistListFrom(artistsRes.data) as Data["artists"] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load the dashboard.");
    } finally {
      setBusy(false);
    }
  }, [read]);
  useEffect(() => {
    api.auth.getUser().then(({ data }) => setSigned(!!data?.user));
    const { data } = api.auth.onAuthStateChange((_e, s) => setSigned(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (signed) void load();
    else setData(null);
  }, [signed, load]);
  const artist = data?.artists.find((a) => a.id === artistId);
  useEffect(() => {
    if (!artistId) return;
    let active = true;
    void (async () => {
      setUrls({});
      const detail = await api.admin.getArtist(artistId);
      if (!active) return;
      let current = data?.artists.find((a) => a.id === artistId);
      if (detail.error) {
        setError(detail.error.message || "Could not load artist details.");
      } else {
        const row = artistFrom(detail.data);
        if (row?.id) {
          current = { ...(current ?? ({} as Artist)), ...row } as Artist;
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  artists: prev.artists.some((a) => a.id === artistId)
                    ? prev.artists.map((a) => (a.id === artistId ? { ...a, ...row } : a))
                    : [...prev.artists, current as Artist],
                }
              : prev,
          );
        }
      }
      if (!current) return;
      const paths = [
        current.photo_path,
        current.art_photo_path,
        current.face_video_path,
        ...(Array.isArray(current.reels)
          ? current.reels.filter((r: unknown): r is string => typeof r === "string")
          : []),
      ].filter(Boolean) as string[];
      const entries = await Promise.all(
        paths.map(async (path) => {
          // Absolute media URLs can be used directly; keys go through /media/url.
          if (/^https?:\/\//i.test(path)) return [path, path] as const;
          const { data: signed } = await api.storage.from("kalzo-media").createSignedUrl(path, 600);
          return [path, signed?.signedUrl ?? ""] as const;
        }),
      );
      if (active) setUrls(Object.fromEntries(entries));
    })();
    return () => {
      active = false;
    };
    // Intentionally keyed on artistId only; list row is a fallback until detail returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);
  useEffect(() => {
    if (!thread) return;
    let active = true;
    setMessages(null);
    setThreadError("");
    history({ data: { id: thread.id } })
      .then((m) => {
        if (active) setMessages(m);
      })
      .catch((e) => {
        if (active) setThreadError(e instanceof Error ? e.message : "Could not open conversation.");
      });
    return () => {
      active = false;
    };
  }, [thread, history]);
  const go = (t: Tab) => {
    setTab(t);
    setSearch("");
    setFilter("all");
  };
  const match = (...s: (string | null)[]) =>
    s.join(" ").toLowerCase().includes(search.toLowerCase());
  async function decision(a: Artist, action: "verified" | "rejected") {
    setBusy(true);
    setError("");
    try {
      if (action === "verified") {
        const res = await api.admin.verifyArtist(a.id);
        if (res.error) throw new Error(res.error.message);
      } else {
        const reason = window.prompt("Rejection comment (required):")?.trim() ?? "";
        if (!reason) {
          setError("A rejection comment is required.");
          return;
        }
        const res = await api.admin.rejectArtist(a.id, reason);
        if (res.error) throw new Error(res.error.message);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }
  if (signed === false)
    return (
      <main className="kl-account">
        <div className="kl-inner">
          <Link to="/">← Kalzo</Link>
          <h1>Kalzo administration</h1>
          <PatronGate audience="artist" onBack={() => window.location.assign("/")} />
        </div>
      </main>
    );
  const queue = data ? awaitingVerification(data.artists) : [];
  const inquiries = data?.threads.filter((t) => t.category === "Booking inquiry") ?? [];
  const open = data?.threads.filter((t) => t.status === "open") ?? [];
  const selectedArtists =
    (tab === "Verification"
      ? data?.artists.filter((a) => a.verification_status !== "verified")
      : data?.artists
    )?.filter(
      (a) =>
        match(a.stage_name, a.legal_name, a.discipline, a.base_city) &&
        (filter === "all" || a.verification_status === filter),
    ) ?? [];
  const selectedPatrons =
    data?.patrons.filter(
      (p) =>
        !data.artists.some((a) => a.owner_id === p.id) &&
        match(p.full_name, p.city, p.phone, p.industry, p.reason),
    ) ?? [];
  const patronCount =
    data?.patrons.filter((p) => !data.artists.some((a) => a.owner_id === p.id)).length ?? 0;
  const selectedBookings =
    data?.bookings.filter(
      (b) =>
        match(b.artist_name, b.address, b.event_date, b.id) &&
        (filter === "all" || (filter === "refund_review" ? needsRefundReview(b) : b.status === filter || b.workflow_stage === filter)),
    ) ?? [];
  const selectedThreads = (tab === "Inquiries" ? inquiries : (data?.threads ?? [])).filter(
    (t) =>
      match(t.title, t.category, data?.patrons.find((p) => p.id === t.owner_id)?.full_name ?? "") &&
      (filter === "all" || t.status === filter),
  );
  const activity = data
    ? [
        ...data.artists.map((a) => ({
          id: a.id,
          title: `${a.stage_name || "Artist"} joined Kalzo`,
          at: a.created_at,
          tab: "Artists" as Tab,
        })),
        ...data.threads.map((t) => ({
          id: t.id,
          title: t.title,
          at: t.created_at,
          tab: "Support" as Tab,
        })),
        ...data.bookings.map((b) => ({
          id: b.id,
          title: `Booking · ${b.artist_name}`,
          at: b.created_at,
          tab: "Bookings" as Tab,
        })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5)
    : [];
  return (
    <main className={`kd ${collapsed ? "kd-collapsed" : ""}`}>
      <img className="kd-paper" src={paper.url} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <aside className="kd-side">
        <Link to="/" className="kd-brand">
          <img src={logoImg} alt="Kalzo" width={72} height={72} />
          <small>THE ADMINISTRATOR'S DESK</small>
        </Link>
        <nav aria-label="Admin sections">
          {nav.map((n) => (
            <Button
              key={n.name}
              variant="ghost"
              title={n.name}
              className={tab === n.name ? "on" : ""}
              onClick={() => go(n.name)}
            >
              <n.icon size={17} />
              <span>{n.name}</span>
              {n.name === "Verification" && queue.length > 0 && <b>{queue.length}</b>}
              {n.name === "Support" && open.length > 0 && <b>{open.length}</b>}
            </Button>
          ))}
        </nav>
        <footer>
          <ShieldCheck size={20} />
          <span>Private administration</span>
          <Link to="/">Return to Kalzo ↗</Link>
        </footer>
      </aside>
      <div className="kd-main">
        <header className="kd-top">
          <div>
            <Button
              variant="ghost"
              size="icon"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed((v) => !v)}
            >
              <PanelLeftClose size={18} />
            </Button>
            <span>Administration / {tab}</span>
          </div>
          <div>
            <span className="kd-date">{date(new Date().toISOString())}</span>
            <ShieldCheck size={17} />
            <span>Kalzo owner</span>
          </div>
        </header>
        <div className="kd-body">
          <div className="kd-heading">
            <img
              className="kd-ledger"
              src={ledger}
              alt=""
              width={1024}
              height={1024}
              loading="lazy"
            />
            <div>
              <span className="kd-eyebrow">KALZO · PRIVATE DESK</span>
              <h1>
                {tab === "Overview"
                  ? "The house, at a glance"
                  : tab === "Verification"
                    ? "Verification desk"
                    : tab === "Visits"
                      ? "Visitor insights"
                      : tab}
              </h1>
              <p>
                {tab === "Overview"
                  ? "Artists, patrons and every mehfil in motion."
                  : tab === "Verification"
                    ? "Profile photographs, live face videos and submitted work."
                    : tab === "Patrons"
                      ? "Registered patrons and their booking details."
                      : tab === "Inquiries"
                        ? "Booking questions from your customers."
                        : tab === "Support"
                          ? "Every saved issue, in one place."
                          : tab === "Artists"
                            ? "The people behind the performances."
                            : tab === "Bookings"
                              ? "Current requests, payments and performance progress."
                              : "Published-site visits and page views."}
              </p>
            </div>
            <div className="kd-tools">
              <Button
                variant="outline"
                size="icon"
                title="Refresh dashboard"
                aria-label="Refresh dashboard"
                disabled={busy}
                onClick={() => void load()}
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
          {error && (
            <div className="kd-error" role="alert">
              {error}
            </div>
          )}
          {!data ? (
            <div className="kd-loading">{error ? "" : "Opening your private dashboard…"}</div>
          ) : (
            <div key={tab} className="kd-opening">
              {tab === "Overview" && (
                <>
                  <div className="kd-metrics">
                    {[
                      {
                        label: "Artists enrolled",
                        value: data.artists.length,
                        note: `${data.artists.filter((a) => a.verification_status === "verified").length} verified`,
                        icon: Palette,
                        to: "Artists" as Tab,
                      },
                      {
                        label: "Awaiting face review",
                        value: queue.length,
                        note: `${data.artists.filter((a) => a.verification_status === "unverified").length} unverified`,
                        icon: ScanFace,
                        to: "Verification" as Tab,
                      },
                      {
                        label: "Registered patrons",
                        value: patronCount,
                        note: `${data.patrons.length} total accounts`,
                        icon: Users,
                        to: "Patrons" as Tab,
                      },
                      {
                        label: "Open support issues",
                        value: open.length,
                        note: `${inquiries.length} booking inquiries`,
                        icon: Headset,
                        to: "Support" as Tab,
                      },
                    ].map((m) => (
                      <Button
                        variant="outline"
                        className="kd-metric !h-auto !block !whitespace-normal"
                        key={m.label}
                        onClick={() => go(m.to)}
                      >
                        <header>
                          {m.label}
                          <m.icon size={18} />
                        </header>
                        <strong className="block my-3">{m.value}</strong>
                        <small>{m.note}</small>
                      </Button>
                    ))}
                  </div>
                  <div className="kd-columns">
                    <section className="kd-section">
                      <div className="kd-section-head">
                        <div>
                          <h2>New activity</h2>
                          <small>
                            {inLastDays(data.artists, days)} artist enrollments ·{" "}
                            {inLastDays(data.threads, days)} support issues
                          </small>
                        </div>
                        <label className="kd-tools">
                          <span className="sr-only">Activity period</span>
                          <VintageFilterSelect
                            variant="field"
                            aria-label="Activity period"
                            value={String(days)}
                            options={[
                              { value: "7", label: "Last 7 days" },
                              { value: "30", label: "Last 30 days" },
                            ]}
                            onChange={(e) => setDays(Number(e.target.value))}
                          />
                        </label>
                      </div>
                      <ActivityChart artists={data.artists} threads={data.threads} patrons={data.patrons.filter(p => !data.artists.some(a => a.owner_id === p.id))} bookings={data.bookings} days={days} />
                      <div className="kd-legend">
                        <span>
                          <i />
                          Artists enrolled
                        </span>
                        <span>
                          <i />
                          Support issues
                        </span>
                        <span><i />Patrons registered</span>
                        <span><i />Bookings</span>
                      </div>
                    </section>
                    <section className="kd-section">
                      <div className="kd-section-head">
                        <h2>Needs your attention</h2>
                        <Clock size={18} />
                      </div>
                      <Attention
                        icon={ScanFace}
                        title="Face verification"
                        text={`${queue.length} submitted videos awaiting your review`}
                        onClick={() => { go("Verification"); setFilter("unverified"); }}
                      />
                      <Attention
                        icon={MessageSquare}
                        title="Booking inquiries"
                        text={`${inquiries.filter((t) => t.status === "open").length} open booking questions`}
                        onClick={() => { go("Inquiries"); setFilter("open"); }}
                      />
                      <Attention
                        icon={CalendarDays}
                        title="Cancellations & refunds"
                        text={`${data.bookings.filter(needsRefundReview).length} bookings require review or processing`}
                        onClick={() => {
                          go("Bookings");
                          setFilter("refund_review");
                        }}
                      />
                    </section>
                  </div>
                  <div className="kd-columns">
                    <section className="kd-section">
                      <div className="kd-section-head">
                        <h2>Recent artists</h2>
                        <Button variant="ghost" size="sm" onClick={() => go("Artists")}>
                          View all <ArrowUpRight size={14} />
                        </Button>
                      </div>
                      {data.artists.length ? (
                        <ArtistTable
                          artists={data.artists.slice(0, 4)}
                          onOpen={(a) => setArtistId(a.id)}
                        />
                      ) : (
                        <Empty
                          title="The stage is ready"
                          text="Submitted artist profiles will appear here."
                        />
                      )}
                    </section>
                    <section className="kd-section">
                      <div className="kd-section-head">
                        <h2>Recent activity</h2>
                        <Activity size={18} />
                      </div>
                      {activity.length ? (
                        <ul className="kd-activity">
                          {activity.map((a) => (
                            <li key={a.id}>
                              <CircleCheck size={16} />
                              <div>
                                <Button
                                  variant="link"
                                  className="!p-0 !h-auto !text-inherit !text-xs"
                                  onClick={() => go(a.tab)}
                                >
                                  {a.title}
                                </Button>
                                <small>{date(a.at)}</small>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Empty
                          title="No activity yet"
                          text="New enrollments, bookings and issues appear here."
                        />
                      )}
                    </section>
                  </div>
                  <div className="kd-columns">
                    <section className="kd-section">
                      <div className="kd-section-head">
                        <h2>Booking ledger</h2>
                        <IndianRupee size={18} />
                      </div>
                      <div className="kd-action-row">
                        <div>
                          <strong>{data.bookings.length} bookings</strong>
                          <p>
                            {data.bookings.filter((b) => b.status === "paid").length}{" "}
                            payment-confirmed bookings
                          </p>
                        </div>
                        <strong>{money(paidRevenue(data.bookings))}</strong>
                      </div>
                      <small>Total verified booking payments, not Kalzo earnings.</small>
                    </section>
                    <section className="kd-section">
                      <div className="kd-section-head">
                        <h2>Visits to Kalzo</h2>
                        <Eye size={18} />
                      </div>
                      <div className="kd-notice">
                        Live visitor totals are not connected to this desk yet.
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => go("Visits")}>
                        Visitor insights <ArrowUpRight size={14} />
                      </Button>
                    </section>
                  </div>
                </>
              )}
              {!["Overview", "Visits"].includes(tab) && (
                <div className="kd-controls">
                  <label className="kd-search">
                    <Search />
                    <span className="sr-only">Search {tab.toLowerCase()}</span>
                    <input
                      aria-label={`Search ${tab.toLowerCase()}`}
                      placeholder={`Search ${tab.toLowerCase()}…`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  {tab !== "Patrons" && (
                    <VintageFilterSelect
                      variant="field"
                      aria-label="Filter status"
                      value={filter}
                      options={[
                        { value: "all", label: "All statuses" },
                        ...(tab === "Artists" || tab === "Verification"
                          ? ["unverified", "verified", "rejected"]
                          : tab === "Bookings"
                            ? [
                                "paid",
                                "awaiting_payment",
                                "completed",
                                "cancellation_requested",
                                "declined",
                                "refund_review",
                              ]
                            : ["open", "closed"]
                        ).map((v) => ({ value: v, label: human(v) })),
                      ]}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  )}
                </div>
              )}
              {(tab === "Artists" || tab === "Verification") &&
                (selectedArtists.length ? (
                  <ArtistTable artists={selectedArtists} onOpen={(a) => setArtistId(a.id)} />
                ) : (
                  <Empty
                    title={
                      search || filter !== "all"
                        ? "No matching artists"
                        : "No profiles waiting here"
                    }
                    text="Artist submissions and verification videos appear here when received."
                  />
                ))}
              {tab === "Patrons" &&
                (selectedPatrons.length ? (
                  <div className="kd-table-wrap">
                    <table className="kd-table">
                      <thead>
                        <tr>
                          <th>Patron</th>
                          <th>Contact</th>
                          <th>Location</th>
                          <th>Booking reason</th>
                          <th>Bookings</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPatrons.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="kd-person">
                                <span className="kd-avatar">
                                  {(p.full_name || "P").slice(0, 1)}
                                </span>
                                <div>
                                  <strong>{p.full_name || "Unnamed patron"}</strong>
                                  <small>
                                    {[p.patron_type, p.industry].filter(Boolean).join(" · ") ||
                                      "Not provided"}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{p.phone || "Not provided"}</td>
                            <td>{p.city || "Not provided"}</td>
                            <td>{p.reason || "Not provided"}</td>
                            <td>{data.bookings.filter((b) => b.patron_id === p.id).length}</td>
                            <td>{date(p.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="No matching patrons"
                    text="Patron accounts will appear here when they register."
                  />
                ))}
              {tab === "Bookings" &&
                (selectedBookings.length ? (
                  <div className="kd-table-wrap">
                    <table className="kd-table">
                      <thead>
                        <tr>
                          <th>Artist / patron</th>
                          <th>Event</th>
                          <th>Amount</th>
                          <th>Payment / progress</th>
                          <th>Payout / refund</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBookings.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <strong>{b.artist_name}</strong>
                              <small>
                                {data.patrons.find((p) => p.id === b.patron_id)?.full_name ||
                                  "Registered patron"}
                              </small>
                              <small>{b.id.slice(0, 8)}</small>
                            </td>
                            <td>
                              <strong>
                                {b.event_date} · {b.slot}
                              </strong>
                              <small>{b.address}</small>
                              {b.note && <small>{b.note}</small>}
                            </td>
                            <td>{money(b.amount_inr)}</td>
                            <td>
                              <Status value={b.status} />
                              <small>{human(b.workflow_stage)}</small>
                            </td>
                            <td>
                              <Status value={b.payout_status} />
                              <small>Refund: {human(b.refund_status)}</small>
                            </td>
                            <td><Button variant="outline" size="sm" onClick={() => setBookingId(b.id)}>Review <ArrowUpRight size={14} /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="No matching bookings"
                    text="Real bookings and their progress will appear here."
                  />
                ))}
              {(tab === "Support" || tab === "Inquiries") &&
                (selectedThreads.length ? (
                  <div className="kd-table-wrap">
                    <table className="kd-table">
                      <thead>
                        <tr>
                          <th>Issue</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Received</th>
                          <th>Conversation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedThreads.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <strong>{t.title}</strong>
                              <small>{t.category}</small>
                            </td>
                            <td>
                              {data.patrons.find((p) => p.id === t.owner_id)?.full_name ||
                                data.artists.find((a) => a.owner_id === t.owner_id)?.stage_name ||
                                "Registered account"}
                            </td>
                            <td>
                              <Status value={t.status} />
                            </td>
                            <td>{date(t.created_at)}</td>
                            <td>
                              <Button variant="outline" size="sm" onClick={() => setThread(t)}>
                                Open <ArrowUpRight size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="No matching issues"
                    text={
                      tab === "Inquiries"
                        ? "Saved booking inquiries appear here."
                        : "Saved support requests appear here."
                    }
                  />
                ))}
              {tab === "Visits" && (
                <section className="kd-section">
                  <div className="kd-section-head">
                    <h2>Published-site analytics</h2>
                    <Eye size={24} />
                  </div>
                  <div className="kd-notice">
                    Visitor counts are not connected to this admin panel yet. See your site's
                    visits, page views, countries and devices in your analytics dashboard.
                  </div>
                  <Empty
                    title="Live visitor feed not connected"
                    text="No visit totals or growth figures are estimated here."
                  />
                </section>
              )}
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={!!artist}
        onOpenChange={(o) => {
          if (!o) setArtistId(null);
        }}
      >
        <DialogContent className="kd-dialog">
          <DialogTitle>{artist?.stage_name || "Artist review"}</DialogTitle>
          <DialogDescription>Artist profile and identity review</DialogDescription>
          {artist && (
            <>
              {error && (
                <p role="alert" className="kd-error">
                  {error}
                </p>
              )}
              <div className="kd-detail-grid">
                <div>
                  {urls[artist.photo_path] ? (
                    <img src={urls[artist.photo_path]} alt={`${artist.stage_name} profile`} />
                  ) : (
                    <Empty title="Profile photograph" text="No photo available." />
                  )}
                  {urls[artist.art_photo_path] && (
                    <>
                      <h3>Art photograph</h3>
                      <img
                        src={urls[artist.art_photo_path]}
                        alt={`${artist.stage_name} performing`}
                      />
                    </>
                  )}
                </div>
                <div>
                  <div className="kd-tools">
                    <Status value={artist.verification_status} />
                  </div>
                  <dl>
                    {[
                      ["Name as per Aadhaar", artist.legal_name],
                      ["Email", (artist as { email?: string }).email ?? ""],
                      [
                        "Art form",
                        [artist.discipline, artist.subcategory].filter(Boolean).join(" · "),
                      ],
                      [
                        "Base city",
                        [artist.base_city, artist.state_name].filter(Boolean).join(", "),
                      ],
                      [
                        "Current city",
                        [artist.current_city, artist.current_state].filter(Boolean).join(", "),
                      ],
                      ["Preferred cities", (artist.preferred_cities ?? []).join(", ")],
                      ["Hourly rate", money(artist.rate_inr)],
                      [
                        "Travel / stay",
                        `${human(artist.travel_setting)} · Travel ${money(artist.travel_charge_inr)} · Stay ${money(artist.stay_charge_inr)}`,
                      ],
                      [
                        "Bank",
                        [
                          (artist as { bank_account_holder?: string }).bank_account_holder,
                          (artist as { bank_name?: string }).bank_name,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      ],
                      [
                        "Rejection reason",
                        (artist as { rejection_reason?: string }).rejection_reason ?? "",
                      ],
                      ["Joined", date(artist.created_at)],
                    ]
                      .filter(([, v]) => v !== "")
                      .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v || "Not provided"}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3>About the artist</h3>
                  <p className="text-sm">{artist.bio || "Not provided"}</p>
                  {/^https:\/\/(www\.)?instagram\.com\//.test(artist.instagram) && (
                    <a
                      className="flex items-center gap-2 text-sm my-4 underline"
                      href={artist.instagram}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Instagram profile <ExternalLink size={14} />
                    </a>
                  )}
                  <div className="kd-notice">
                    DigiLocker verification is not connected. A face-match decision below is a
                    manual review only.
                  </div>
                </div>
              </div>
              <h3>Live face verification video</h3>
              {urls[artist.face_video_path] ? (
                <video src={urls[artist.face_video_path]} controls playsInline />
              ) : (
                <p className="text-sm">No face video available.</p>
              )}
              <h3>Showreels</h3>
              <div className="kd-videos">
                {Array.isArray(artist.reels) &&
                  artist.reels.map((r, i) =>
                    typeof r === "string" && urls[r] ? (
                      <div key={r}>
                        <p className="text-xs mb-2">
                          Reel {i + 1}
                          {i === artist.primary_reel ? " · Primary" : ""}
                        </p>
                        <video src={urls[r]} controls playsInline />
                      </div>
                    ) : null,
                  )}
              </div>
              <div className="kd-tools">
                <Button
                  disabled={
                    busy ||
                    artist.verification_status === "verified" ||
                    !canPublishArtist({
                      ...artist,
                      verification_status: "verified",
                      reels: Array.isArray(artist.reels) ? artist.reels : [],
                    })
                  }
                  onClick={() => void decision(artist, "verified")}
                >
                  <ShieldCheck size={16} />
                  Verify artist
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || artist.verification_status === "rejected"}
                  onClick={() => void decision(artist, "rejected")}
                >
                  Reject profile
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!thread}
        onOpenChange={(o) => {
          if (!o) setThread(null);
        }}
      >
        <DialogContent className="kd-dialog">
          <DialogTitle>{thread?.title || "Support conversation"}</DialogTitle>
          <DialogDescription>
            {thread ? `${thread.category} · ${date(thread.created_at)}` : "Saved support history"}
          </DialogDescription>
          {threadError && (
            <p role="alert" className="kd-error">
              {threadError}
            </p>
          )}
          {messages === null && !threadError ? (
            <p>Opening conversation…</p>
          ) : messages?.length ? (
            messages.map((m, i) => {
              const text = textMessage(m.message);
              return (
                <article className="kd-message" key={i}>
                  <small>
                    {text.role} · {date(m.created_at)}
                  </small>
                  {text.text || "Non-text message"}
                </article>
              );
            })
          ) : (
            !threadError && (
              <Empty
                title="No messages yet"
                text="This issue has been opened, but no messages have been sent."
              />
            )
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!booking} onOpenChange={o => { if (!o) setBookingId(null); }}>
        <DialogContent className="kd-dialog">
          <DialogTitle>Booking review · {booking?.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>Cancellation and original-payment refund review</DialogDescription>
          {booking && <>
            <h3>{booking.artist_name}</h3>
            <p>{booking.event_date} · {booking.slot}</p>
            <p>{booking.address}</p>
            <dl><div><dt>Paid amount</dt><dd>{money(booking.amount_inr)}</dd></div><div><dt>Performance</dt><dd>{human(booking.workflow_stage)}</dd></div><div><dt>Refund</dt><dd>{human(booking.refund_status)}</dd></div></dl>
            {booking.note && <p>{booking.note}</p>}
            {error && <p role="alert" className="kd-error">{error}</p>}
            {booking.refund_status === "review_required" && <Button disabled={busy} onClick={async () => {
              if (!window.confirm("Approve cancellation and queue the refund? This does not transfer money.")) return;
              setBusy(true); setError("");
              try { await approveCancellation({ data: { id: booking.id } }); await load(); }
              catch (e) { setError(e instanceof Error ? e.message : "Unable to approve cancellation."); }
              finally { setBusy(false); }
            }}><CircleCheck size={16} />Approve cancellation & queue refund</Button>}
            <div className="kd-notice">Refund transfers to the original payment source are not connected yet. Approval records your decision and holds unreleased artist payments; it does not mark money as refunded.</div>
          </>}
        </DialogContent>
      </Dialog>
    </main>
  );
}
function Attention({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: typeof ScanFace;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" className="kd-action-row kd-attention" onClick={onClick} aria-label={`Open ${title}`}>
      <Icon size={20} />
      <span className="kd-attention-copy">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
        <ArrowUpRight size={17} />
    </Button>
  );
}
function ArtistTable({ artists, onOpen }: { artists: Artist[]; onOpen: (a: Artist) => void }) {
  return (
    <div className="kd-table-wrap">
      <table className="kd-table">
        <thead>
          <tr>
            <th>Artist</th>
            <th>City</th>
            <th>Identity</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {artists.map((a) => (
            <tr key={a.id}>
              <td>
                <div className="kd-person">
                  <span className="kd-avatar">{(a.stage_name || "A").slice(0, 1)}</span>
                  <div>
                    <strong>{a.stage_name || "Unnamed artist"}</strong>
                    <small>{a.discipline}</small>
                  </div>
                </div>
              </td>
              <td>{a.base_city || "Not provided"}</td>
              <td>
                <Status value={a.verification_status} />
              </td>
              <td>
                <Button size="sm" variant="outline" onClick={() => onOpen(a)}>
                  Review <ArrowUpRight size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ActivityChart({
  artists,
  threads,
  patrons,
  bookings,
  days,
}: {
  artists: { created_at: string }[];
  threads: { created_at: string }[];
  patrons: { created_at: string }[];
  bookings: { created_at: string }[];
  days: number;
}) {
  const a = dailyCounts(artists, days),
    t = dailyCounts(threads, days),
    p = dailyCounts(patrons, days),
    b = dailyCounts(bookings, days),
    max = Math.max(1, ...[...a, ...t, ...p, ...b].map((x) => x.count));
  const x = (i: number) => 40 + (i * 540) / (days - 1),
    y = (n: number) => 160 - (n * 130) / max;
  const path = (rows: typeof a) =>
    rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.count)}`).join(" ");
  return (
    <svg
      className="kd-chart"
      viewBox="0 0 600 195"
      role="img"
      aria-label={`Artist enrollments, patrons, bookings and support issues over ${days} days`}
    >
      <title>Actual daily artist enrollments, patrons, bookings and support issues</title>
      {[0, max / 2, max].map((n, i) => (
        <g key={i}>
          <line x1="40" y1={y(n)} x2="580" y2={y(n)} />
          <text x="8" y={y(n) + 4}>
            {Number.isInteger(n) ? n : n.toFixed(1)}
          </text>
        </g>
      ))}
      <path className="artist" d={path(a)} />
      <path className="support" d={path(t)} />
      <path className="patrons" d={path(p)} />
      <path className="bookings" d={path(b)} />
      {[{ rows: t, kind: "support" }, { rows: p, kind: "patrons" }, { rows: b, kind: "bookings" }].map(({rows, kind}) => rows.map((r, i) => <circle className={`dot-${kind}`} key={`${kind}-${i}`} cx={x(i)} cy={y(r.count)} r="3"><title>{r.day}: {r.count} {kind}</title></circle>))}
      {a.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r.count)} r="3">
          <title>
            {r.day}: {r.count} artists
          </title>
        </circle>
      ))}
      {[0, Math.floor(days / 2), days - 1].map((i) => {
        const row = a[i];
        return row ? (
          <text
            key={i}
            x={x(i)}
            y="185"
            textAnchor={i === 0 ? "start" : i === days - 1 ? "end" : "middle"}
          >
            {new Date(row.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </text>
        ) : null;
      })}
    </svg>
  );
}
