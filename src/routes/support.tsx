import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  MessageSquare,
  CircleCheck,
  KeyRound,
  CreditCard,
  RotateCcw,
  Wallet,
  Clapperboard,
  ScanFace,
  Headset,
  ArrowRight,
  Clock,
  Phone,
  Mail,
} from "lucide-react";
import { accountData, newSupportThread } from "@/lib/kalzo.functions";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { Button } from "@/components/ui/button";
import { SUPPORT_CATEGORIES } from "@/kalzo/extras/launchRules";
import { kalzoHead } from "@/lib/routeHead";
import { KALZO_CONTACT } from "@/lib/contacts";
import "@/kalzo/extras/support/support.css";
const icons = [
  MessageSquare,
  CalendarDays,
  CircleCheck,
  KeyRound,
  CreditCard,
  RotateCcw,
  Wallet,
  Clapperboard,
  ScanFace,
  Headset,
];
export const Route = createFileRoute("/support")({
  staticData: { sitemap: false },
  head: () =>
    kalzoHead("Support issues", "Your saved Kalzo booking and artist support conversations.", true),
  component: () => (
    <AccountShell title="Kalzo support">
      <Issues />
    </AccountShell>
  ),
});
function Issues() {
  const read = useServerFn(accountData),
    create = useServerFn(newSupportThread),
    nav = useNavigate();
  const [threads, setThreads] = useState<Awaited<ReturnType<typeof accountData>>["threads"]>([]),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    read()
      .then((d) => setThreads(d.threads))
      .catch((e) => setErr(e.message));
  }, [read]);
  async function start(category: (typeof SUPPORT_CATEGORIES)[number]) {
    setBusy(true);
    setErr("");
    try {
      const t = await create({ data: { category } });
      await nav({ to: "/support/$threadId", params: { threadId: t.id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open support.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ks">
      {err && (
        <p role="alert" className="kl-error">
          {err}
        </p>
      )}
      <header className="ks-banner">
        <div>
          <span className="ks-overline">THE KALZO HELP DESK</span>
          <h2>We're here for your mehfil.</h2>
          <p>Bookings, payments, your profile — let's talk.</p>
        </div>
        <div className="ks-seal" aria-label="Kalzo support">
          K
        </div>
      </header>
      <div className="ks-heading">
        <h2>What brings you here?</h2>
      </div>
      <div className="ks-grid">
        {SUPPORT_CATEGORIES.map((c, i) => {
          const Icon = icons[i] ?? Headset;
          return (
            <Button
              variant="outline"
              className="ks-category"
              key={c}
              disabled={busy}
              onClick={() => void start(c)}
            >
              <Icon />
              <span>{c}</span>
              <ArrowRight />
            </Button>
          );
        })}
      </div>
      <div className="ks-heading">
        <h2>Your conversations</h2>
        <span>{threads.length} saved issues</span>
      </div>
      <div className="ks-history">
        {!threads.length && (
          <p className="ks-start">
            <MessageSquare size={20} />
            No conversations yet.
          </p>
        )}
        {threads.map((t) => (
          <Link key={t.id} to="/support/$threadId" params={{ threadId: t.id }}>
            <Clock size={18} />
            <div>
              <strong>{t.title}</strong>
              <small>
                {t.status} · {new Date(t.created_at).toLocaleDateString("en-IN")}
              </small>
            </div>
            <ArrowRight size={16} />
          </Link>
        ))}
      </div>
      <footer className="ks-direct">
        <a href={KALZO_CONTACT.whatsapp} target="_blank" rel="noreferrer">
          <MessageSquare size={16} />
          WhatsApp Kalzo
        </a>
        <a href={`tel:${KALZO_CONTACT.phone}`}>
          <Phone size={16} />
          {KALZO_CONTACT.displayPhone}
        </a>
        <a href={`mailto:${KALZO_CONTACT.email}`}>
          <Mail size={16} />
          {KALZO_CONTACT.email}
        </a>
      </footer>
    </div>
  );
}
