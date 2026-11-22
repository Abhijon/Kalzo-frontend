import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AccountShell } from "@/kalzo/extras/AccountShell";
import { artistPanelData } from "@/lib/artistPanel.functions";
import { kalzoHead } from "@/lib/routeHead";
import { MailOpen, MapPin, UserRound, Bell, MessageSquare, CalendarDays } from "lucide-react";
import { ProfileMenu } from "@/kalzo/extras/artist/ProfileMenu";
export const Route = createFileRoute("/artist")({
  staticData: { sitemap: "exclude-subtree" },
  head: () =>
    kalzoHead(
      "Artist panel",
      "Your Kalzo artist profile, bookings, notifications and wallet.",
      true,
    ),
  component: () => (
    <AccountShell title="Artist panel" audience="artist">
      <Tabs />
      <ProfileSections />
      <Outlet />
    </AccountShell>
  ),
});
function Tabs() {
  const read = useServerFn(artistPanelData);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    read()
      .then((d) => setUnread(d.notifications.filter((n) => !n.read).length))
      .catch(() => {});
  }, [read, path]);
  const tabs = [
    { to: "/artist/profile", label: "My profile", icon: UserRound },
    { to: "/artist", label: "Booking requests", icon: MailOpen },
    { to: "/artist/availability", label: "Availability", icon: CalendarDays },
    { to: "/artist/location", label: "Location update", icon: MapPin },
    { to: "/artist/notifications", label: "Notifications", icon: Bell },
    { to: "/artist/chats", label: "Chats & calls", icon: MessageSquare },
  ] as const;
  return (
    <nav className="ka-tabs" aria-label="Artist panel">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={
            path === t.to ||
            (t.to === "/artist/profile" && ["/artist/bookings", "/artist/wallet"].includes(path))
              ? "on"
              : ""
          }
        >
          <t.icon size={18} />
          {t.label}
          {t.to === "/artist/notifications" && unread > 0 && (
            <span className="ka-dot" aria-label={`${unread} unread`}>
              {unread}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
function ProfileSections() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return ["/artist/profile", "/artist/bookings", "/artist/wallet", "/artist/kyc/callback"].includes(
    path,
  ) ? (
    <ProfileMenu />
  ) : null;
}
