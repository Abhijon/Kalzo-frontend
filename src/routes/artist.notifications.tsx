import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { artistPanelData, markNotificationsRead } from "@/lib/artistPanel.functions";
import { kalzoHead } from "@/lib/routeHead";
import { Bell, Phone, MailOpen, Star, Wallet, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/artist/notifications")({
  staticData: { sitemap: false },
  head: () => kalzoHead("Notifications", "Booking and review updates for Kalzo artists.", true),
  component: Notifications,
});
type N = Awaited<ReturnType<typeof artistPanelData>>["notifications"];
function Notifications() {
  const read = useServerFn(artistPanelData),
    mark = useServerFn(markNotificationsRead);
  const [items, setItems] = useState<N | null>(null),
    [err, setErr] = useState("");
  const [category, setCategory] = useState("all");
  useEffect(() => {
    read()
      .then((d) => {
        setItems(d.notifications);
        if (d.notifications.some((n) => !n.read)) void mark();
      })
      .catch((e) => setErr(e.message));
  }, [read, mark]);
  if (err) return <p className="kl-error">{err}</p>;
  if (!items) return <p>Loading…</p>;
  return (
    <section className="ka-notification-hall">
      <header className="ka-section-title"><Bell size={26}/><h2>Notifications</h2></header>
      <div className="ka-notification-categories" aria-label="Notification categories">
        {[{key:"all",label:"All",icon:Bell},{key:"meeting",label:"Call invitations",icon:Phone},{key:"booking",label:"Bookings",icon:MailOpen},{key:"rating",label:"Reviews",icon:Star},{key:"payment",label:"Payments",icon:Wallet},{key:"chat",label:"Messages",icon:MessageSquare}].map(c => <Button key={c.key} variant="outline" aria-pressed={category===c.key} onClick={() => setCategory(c.key)}><c.icon size={22}/><span>{c.label}</span><b>{items.filter(n => c.key === "all" || n.kind === c.key).length}</b></Button>)}
      </div>
      {!items.filter(n => category === "all" || n.kind === category).length && <div className="ka-quiet-state"><Bell size={38}/><h3>All quiet for now</h3><p>No {category === "all" ? "notifications" : category === "meeting" ? "call invitations" : category === "rating" ? "reviews" : category + " updates"} yet.</p></div>}
    <ul className="ka-notes ka-notification-list">
      {items.filter(n => category === "all" || n.kind === category).map((n) => (
        <li key={n.id} className={n.read ? "" : "new"}>
          <small>{n.kind} · {new Date(n.created_at).toLocaleString("en-IN")}</small>
          {n.kind === "meeting" ? <Phone/> : n.kind === "payment" ? <Wallet/> : n.kind === "rating" ? <Star/> : n.kind === "chat" ? <MessageSquare/> : <MailOpen/>}
          <strong>{n.title}</strong>
          <p>{n.body}</p>
          {n.booking_id && <Link to="/artist/bookings">Open my bookings →</Link>}
          {(n.kind === "chat" || n.kind === "meeting") && <Link to="/artist/chats">Open chats & calls →</Link>}
        </li>
      ))}
    </ul>
    </section>
  );
}
