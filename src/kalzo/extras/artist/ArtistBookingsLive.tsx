import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronUp,
  Circle,
  Clock3,
  ListFilter,
  MailOpen,
  Play,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, unwrapData } from "@/lib/api";
import "./invitation-card.css";

type Filter = "all" | string;

type Booking = {
  id: string;
  eventDate: string;
  day?: string;
  address: string;
  guests: string | null;
  note: string | null;
  amountInr: number;
  status: string;
  customer?: { fullName?: string | null; email?: string };
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

const PAGE_SIZE = 10;
const PREFERRED_STATUSES = ["pending", "accepted", "rejected", "job_started", "completed"];
const FALLBACK_STATUSES = PREFERRED_STATUSES;

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function formatShortDate(raw: string) {
  const m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function label(status: Filter) {
  if (status === "all") return "All";
  return String(status).replace(/_/g, " ");
}

function statusIcon(status: string): ReactNode {
  if (status === "all") return <Circle className="ka-filter-status-icon is-all" size={16} />;
  if (status === "pending") return <Clock3 className="ka-filter-status-icon" size={16} />;
  if (status === "accepted") return <CheckCircle2 className="ka-filter-status-icon is-accepted" size={16} />;
  if (status === "rejected") return <XCircle className="ka-filter-status-icon is-rejected" size={16} />;
  if (status === "job_started") return <Play className="ka-filter-status-icon" size={16} />;
  if (status === "completed") return <CheckCircle2 className="ka-filter-status-icon" size={16} />;
  return <Circle className="ka-filter-status-icon" size={16} />;
}

function normalizeStatuses(raw: unknown): string[] {
  const seen = new Set<string>();
  const collected: string[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const value = String(
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? (item as { status?: string; value?: string; name?: string }).status ??
              (item as { value?: string }).value ??
              (item as { name?: string }).name ??
              ""
            : "",
      )
        .trim()
        .toLowerCase();
      if (!value || value === "all" || seen.has(value)) continue;
      seen.add(value);
      collected.push(value);
    }
  }

  // Always include pending + preferred order, then any extra API statuses.
  for (const status of PREFERRED_STATUSES) {
    if (!seen.has(status)) {
      seen.add(status);
      collected.push(status);
    }
  }

  const preferred = PREFERRED_STATUSES.filter((status) => seen.has(status));
  const extras = collected.filter((status) => !PREFERRED_STATUSES.includes(status));
  return preferred.length || extras.length ? [...preferred, ...extras] : FALLBACK_STATUSES;
}

export function ArtistBookingsLive({ requestsOnly = false }: { requestsOnly?: boolean }) {
  const [list, setList] = useState<Booking[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<Filter>(requestsOnly ? "pending" : "all");
  const [page, setPage] = useState(1);
  const [statusOptions, setStatusOptions] = useState<string[]>(FALLBACK_STATUSES);
  const [busy, setBusy] = useState(false);
  const [listMinHeight, setListMinHeight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);
  const loadIdRef = useRef(0);

  const load = async (status: Filter, pageNum: number) => {
    const loadId = ++loadIdRef.current;
    const panel = listRef.current;
    if (panel) {
      setListMinHeight(panel.getBoundingClientRect().height);
      scrollYRef.current = window.scrollY;
    }
    setBusy(true);

    const res = await api.bookings.listForArtist({
      page: pageNum,
      limit: PAGE_SIZE,
      ...(status === "all" ? {} : { status }),
    });

    if (loadId !== loadIdRef.current) return;

    if (res.error) {
      setErr(res.error.message);
      setList([]);
      setPagination(null);
      setBusy(false);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollYRef.current);
        setListMinHeight(0);
      });
      return;
    }

    const data = unwrapData(res.data) as {
      bookings?: Booking[];
      pagination?: Pagination;
    };
    setList(Array.isArray(data?.bookings) ? data.bookings : []);
    setPagination(data?.pagination ?? null);
    setErr("");
    setBusy(false);

    // Keep viewport steady after height changes (filter / page swaps).
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollYRef.current);
      setListMinHeight(0);
    });
  };

  useEffect(() => {
    if (requestsOnly) return;
    let cancelled = false;
    (async () => {
      const res = await api.bookings.statuses();
      if (cancelled) return;
      if (res.error) {
        setStatusOptions(FALLBACK_STATUSES);
        return;
      }
      const data = unwrapData(res.data) as { statuses?: unknown };
      setStatusOptions(normalizeStatuses(data?.statuses));
    })();
    return () => {
      cancelled = true;
    };
  }, [requestsOnly]);

  useEffect(() => {
    void load(requestsOnly ? "pending" : filter, page);
  }, [requestsOnly, filter, page]);

  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    setPage(1);
  };

  const resetFilter = () => {
    if (filter === "all") return;
    setFilter("all");
    setPage(1);
  };

  if (!list) return <p>Loading…</p>;

  const totalPages = pagination?.totalPages ?? 0;
  const totalCount = pagination?.totalCount ?? 0;
  const filterActive = !requestsOnly && filter !== "all";

  return (
    <section className="ka-bookings-live">
      <div className="ka-section-title">
        {requestsOnly ? <MailOpen size={26} /> : <CalendarDays size={26} />}
        <h2>{requestsOnly ? "Booking requests" : "Your bookings"}</h2>
      </div>
      <p className="kl-note">Open to read the full invitation.</p>
      {!requestsOnly && (
        <div className="ka-bookings-filters">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`ka-filter-icon${filterActive ? " on" : ""}`}
                aria-label={`Filter bookings${filterActive ? `: ${label(filter)}` : ""}`}
                aria-busy={busy || undefined}
              >
                <ListFilter size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ka-filter-menu" collisionPadding={12}>
              <p className="ka-filter-menu-label">
                <Clock3 size={16} aria-hidden="true" />
                <span>Filter by status</span>
                <ChevronUp className="ka-filter-menu-chevron" size={16} aria-hidden="true" />
              </p>
              <div className="ka-filter-flourish" aria-hidden="true">
                ❦
              </div>
              <DropdownMenuRadioGroup value={filter} onValueChange={changeFilter}>
                <DropdownMenuRadioItem value="all" className="ka-filter-option ka-filter-status">
                  {statusIcon("all")}
                  All
                </DropdownMenuRadioItem>
                {statusOptions.map((status) => (
                  <DropdownMenuRadioItem
                    key={status}
                    value={status}
                    className="ka-filter-option ka-filter-status"
                  >
                    {statusIcon(status)}
                    {label(status)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <div className="ka-filter-flourish" aria-hidden="true">
                ❦
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className="ka-filter-reset"
            onClick={resetFilter}
            disabled={!filterActive || busy}
          >
            Reset filter
          </button>
        </div>
      )}
      {err && <p className="kl-error">{err}</p>}

      <div
        ref={listRef}
        className={`ka-bookings-list-panel${busy ? " is-busy" : ""}`}
        style={listMinHeight > 0 ? { minHeight: listMinHeight } : undefined}
        aria-busy={busy || undefined}
      >
        {list.length === 0 && (
          <p className="kl-note">
            {requestsOnly ? "No pending booking requests yet." : "No bookings in this view yet."}
          </p>
        )}

        <ul className="ki-invite-list">
          {list.map((b) => (
            <li
              key={b.id}
              className={`ki-invite ki-invite-half${requestsOnly ? "" : " ki-invite-listed"}`}
            >
              <div className="ki-invite-roller ki-invite-roller-top" aria-hidden="true" />
              <div className="ki-invite-shell ki-invite-paper">
                <span className="ki-invite-ornament" aria-hidden="true" />
                <div className="ki-invite-body">
                  <div className="ki-invite-copy">
                    <p className="ki-invite-eyebrow">Booking invitation</p>
                    <h3 className="ki-invite-name">
                      {b.customer?.fullName || b.customer?.email || "Patron"}
                    </h3>
                    <span className={`ki-invite-status kb-status-${b.status}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                    <p className="ki-invite-meta">
                      {[b.day, formatShortDate(b.eventDate)].filter(Boolean).join(" · ")}
                    </p>
                    {b.address ? <p className="ki-invite-venue">{b.address}</p> : null}
                    <p className="ki-invite-amount">{inr(b.amountInr)}</p>
                  </div>
                  <Link
                    to="/artist/bookings/$bookingId"
                    params={{ bookingId: b.id }}
                    className="ki-invite-open"
                    aria-label={`Open invitation from ${b.customer?.fullName || "patron"}`}
                  >
                    <i className="ki-invite-cord" aria-hidden="true" />
                    <span className="ki-invite-wax" aria-hidden="true">
                      K
                    </span>
                    <span>Open</span>
                  </Link>
                </div>
                {requestsOnly ? (
                  <>
                    <div className="ki-invite-fade" aria-hidden="true" />
                    <div className="ki-invite-curl-bot" aria-hidden="true" />
                  </>
                ) : null}
              </div>
              <div className="ki-invite-roller ki-invite-roller-bot" aria-hidden="true" />
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="kl-actions" role="navigation" aria-label="Booking pages">
            <Button
              variant="outline"
              disabled={busy || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <p className="kl-note">
              Page {page} of {totalPages} · {totalCount} total
            </p>
            <Button
              variant="outline"
              disabled={busy || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
