import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ListFilter, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, unwrapData } from "@/lib/api";

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
const FALLBACK_STATUSES = ["accepted", "job_started", "completed"];
const HIDDEN_STATUSES = new Set(["all", "pending", "rejected"]);

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function formatShortDate(raw: string) {
  const m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function label(status: Filter) {
  if (status === "all") return "all";
  return String(status).replace(/_/g, " ");
}

function normalizeStatuses(raw: unknown): string[] {
  if (!Array.isArray(raw)) return FALLBACK_STATUSES;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const value = String(item || "")
      .trim()
      .toLowerCase();
    if (!value || HIDDEN_STATUSES.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.length ? out : FALLBACK_STATUSES;
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
      <p className="kl-note">
        {requestsOnly
          ? "Open a request to review full details, then accept or reject."
          : "Open a booking to review details and update it."}
      </p>
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
              <DropdownMenuRadioGroup value={filter} onValueChange={changeFilter}>
                <DropdownMenuRadioItem value="all">all</DropdownMenuRadioItem>
                {statusOptions.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>
                    {label(status)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
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

        <ul className="kb-row-list">
          {list.map((b) => (
            <li key={b.id} className="kb-row-card">
              <div className="kb-row-main">
                <div className="kb-row-top">
                  <strong>{b.customer?.fullName || b.customer?.email || "Patron"}</strong>
                  <span className={`kb-detail-status kb-status-${b.status}`}>
                    {b.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="kb-row-meta">
                  {[b.day, formatShortDate(b.eventDate)].filter(Boolean).join(" · ")}
                </p>
                {b.address ? <p className="kb-row-venue">{b.address}</p> : null}
                <p className="kb-row-amount">{inr(b.amountInr)}</p>
              </div>
              <div className="kb-row-action">
                <Link
                  to="/artist/bookings/$bookingId"
                  params={{ bookingId: b.id }}
                  className="kb-row-review"
                >
                  Review
                </Link>
              </div>
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
